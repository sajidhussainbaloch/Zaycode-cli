/**
 * core/agent.js — Autonomous Agent Loop
 * 
 * Implements the real tool-calling agent loop:
 *   1. Send messages + tool definitions to model
 *   2. If model returns tool_calls → execute them → append results → loop
 *   3. If model returns text → break and return
 * 
 * This is the heart of ZayCode's autonomy.
 */

'use strict';

const state = require('./state');
const router = require('./router');
const executor = require('./executor');
const Memory = require('./memory');
const openrouter = require('../providers/openrouter');
const renderer = require('../ui/renderer');
const theme = require('../ui/theme');

const MAX_ITERATIONS = 20;

/**
 * Run the autonomous agent loop for a user prompt.
 * 
 * @param {string} prompt - User's raw input
 * @param {Memory} memory - Conversation memory instance
 * @returns {Promise<{ text: string, model: string, mode: string, iterations: number, timeMs: number }>}
 */
async function run(prompt, memory) {
    const startTime = Date.now();

    // Route to appropriate model
    const { model, mode, routed } = router.route(prompt);

    if (!model) {
        throw new Error('No model available for this mode. Use /use <model> to set one.');
    }

    // Add user message to memory
    memory.addUser(prompt);

    // Update state
    state.setThinking(true);
    state.resetIterations();

    const publisher = require('./publisher');
    publisher.publish('info', `🚀 Starting autonomous session: "${prompt.substring(0, 100)}..."`);
    publisher.publish('status', 'THINKING');

    // Get tool definitions
    const tools = executor.getToolDefinitions();

    let iterations = 0;
    let finalText = '';

    try {
        while (iterations < MAX_ITERATIONS) {
            iterations++;
            state.incrementIterations();

            // 1. Dynamic Context Pruning (v6.4)
            const tokenUsed = memory.getTokenEstimate();
            const tokenMax = state.prop('contextMax');
            if (tokenUsed > tokenMax * 0.8) {
                renderer.hint(`[Optimization] Context usage at ${Math.round(tokenUsed / 1000)}K. Pruning older history...`);
                memory.prune(0.5); // Prune 50% of the middle history
            }

            // 2. Get messages for API
            let messages = memory.getMessages();

            // 3. Self-Correction Injection (v6.8 PRO)
            if (iterations > 1 && memory.history && memory.history.length > 0) {
                const lastMsg = memory.history[memory.history.length - 1];
                if (lastMsg.role === 'tool' && lastMsg.content.includes('Error:')) {
                    const error = lastMsg.content;
                    let nudgeType = 'GENERAL';

                    if (error.includes('not found') || error.includes('no such file')) nudgeType = 'CONTEXT';
                    if (error.includes('Permission denied') || error.includes('EACCES')) nudgeType = 'SAFETY';
                    if (error.includes('SyntaxError') || error.includes('mismatch')) nudgeType = 'PRECISION';

                    const nudges = {
                        CONTEXT: 'The file path or resource was not found. TRACE its location using search tools before retrying.',
                        SAFETY: 'A permission error occurred. Request user clarification or check file attributes.',
                        PRECISION: 'The surgical edit failed due to a content mismatch. RE-READ the file content and check whitespace exactly.',
                        GENERAL: 'The tool call failed. Analyze the error logs and propose an improved strategy.'
                    };

                    const correctionNudge = {
                        role: 'user',
                        content: `[PRO SELF-CORRECTION: ${nudgeType}] ${nudges[nudgeType]}\nError details: "${error}"\nMANDATORY: Explain the failure in your <thinking> and do not repeat the exact same parameters.`
                    };
                    messages = [...messages, correctionNudge];
                }
            }


            // Update context usage
            state.setContextUsage(memory.getTokenEstimate());

            // Stream response from provider
            let response;
            try {
                response = await openrouter.stream({
                    model,
                    messages,
                    tools,
                    onDelta: (delta) => {
                        renderer.streamToken(delta);
                    },
                });
            } catch (err) {
                // Catch API Credit / Rate Limit errors and fallback to free tier
                if (err.message.includes('402') || err.message.includes('429') || err.message.includes('Insufficient')) {
                    renderer.warning(`\n[API Error] Insufficient credits or rate limited on ${model}.`);

                    // Determine fallback free model based on mode
                    let fallbackModel = 'mistralai/mistral-small-3.1-24b-instruct:free'; // default
                    if (mode === 'code') fallbackModel = 'qwen/qwen3-coder:free';
                    if (mode === 'plan' || mode === 'reason') fallbackModel = 'meta-llama/llama-3.3-70b-instruct:free';

                    renderer.hint(`[Fallback] Auto-switching to free model: ${fallbackModel}...\n`);
                    model = fallbackModel; // Override for this loop

                    // Retry the stream with the new model
                    response = await openrouter.stream({
                        model,
                        messages,
                        tools,
                        onDelta: (delta) => {
                            renderer.streamToken(delta);
                        },
                    });
                } else {
                    throw err; // Re-throw other errors (e.g. 401 Unauthorized, Network)
                }
            }

            // Check if response contains tool calls
            if (response.toolCalls && response.toolCalls.length > 0) {
                // Add assistant message with tool calls to memory
                memory.addAssistant(response.text || '', response.toolCalls);

                // Execute each tool call
                let stateModified = false;
                for (const tc of response.toolCalls) {
                    const toolName = tc.function.name;
                    const toolArgs = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;

                    if (['write_file', 'edit_file', 'apply_diff', 'run_shell'].includes(toolName)) {
                        stateModified = true;
                    }

                    renderer.toolCallStart(toolName, toolArgs);

                    // Robustness Loop (v6.6) - Retry critical tools with feedback
                    const CRITICAL_TOOLS = ['write_file', 'edit_file', 'apply_diff', 'run_shell'];
                    let result;
                    let attempts = 0;
                    const maxAttempts = CRITICAL_TOOLS.includes(toolName) ? 3 : 1;

                    while (attempts < maxAttempts) {
                        attempts++;
                        result = await executor.execute({ name: toolName, arguments: toolArgs });

                        if (result.success || attempts >= maxAttempts) break;

                        renderer.warning(`[Robustness] ${toolName} failed (Attempt ${attempts}/${maxAttempts}). Retrying with validation...`);
                    }

                    renderer.toolCallResult(toolName, result);

                    // Add tool result to memory
                    memory.addToolResult(
                        tc.id,
                        result.success ? JSON.stringify(result.result) : `Error: ${result.error}`
                    );
                }

                // 4. v8.1 Self-Healing "BUILD" Loop
                const currentMode = state.prop('mode') || mode;
                if (stateModified && currentMode === 'build') {
                    const testTools = require('../tools/testTools');
                    const testResult = await testTools.run_project_tests();

                    if (!testResult.success) {
                        renderer.warning('\n[Self-Healing] Tests failed after modification. Triggering autonomous correction...');
                        const healingNudge = {
                            role: 'user',
                            content: `[SELF-HEALING FAILURE] The tests failed after your last changes.\nError Output:\n${testResult.output}\n\nPlease ANALYZE the failure and FIX the code immediately.`
                        };
                        memory.history.push(healingNudge); // Inject nudge into history
                    } else {
                        renderer.success('\n[Self-Healing] Tests passed! Changes are stable.');
                    }
                }

                // Continue the loop — model will process tool results
                renderer.streamEnd();
                continue;
            }

            // No tool calls — this is the final response
            finalText = response.text || '';
            memory.addAssistant(finalText);
            renderer.streamEnd();
            break;
        }

        if (iterations >= MAX_ITERATIONS) {
            renderer.warning(`Agent reached maximum iterations (${MAX_ITERATIONS}). Stopping.`);
        }

    } finally {
        state.setThinking(false);
        const publisher = require('./publisher');
        publisher.publish('status', 'IDLE');
    }

    const timeMs = Date.now() - startTime;

    return {
        text: finalText,
        model,
        mode,
        iterations,
        timeMs,
    };
}

module.exports = { run };
