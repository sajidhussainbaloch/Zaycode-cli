/**
 * core/subAgent.js — Specialized Stateless Research Agent
 * 
 * Spawns a dedicated agent instance for deep research tasks.
 * Pattern derived from Claude Code's 'Agent' tool.
 */

'use strict';

const openrouter = require('../providers/openrouter');
const executor = require('./executor');
const state = require('./state');

const PERSONAS = {
    RESEARCHER: "You are a Stateless Research Sub-Agent. Goal: Deep analysis or search for the main agent.",
    SECURITY: "You are a Senior Security Auditor. Goal: Find vulnerabilities, path traversal, or secret leaks in code.",
    PERFORMANCE: "You are a Performance Engineer. Goal: Identify Big O bottlenecks and latency issues.",
    ARCHITECT: "You are a Principal Software Architect. Goal: Ensure structural integrity and design pattern consistency."
};

class SubAgent {
    constructor(id) {
        this.id = id || `research-${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Run a specific task with a persona.
     */
    async run(task, context = [], persona = 'RESEARCHER') {
        const systemPrompt = PERSONAS[persona] || PERSONAS.RESEARCHER;
        const messages = [
            { role: 'system', content: `${systemPrompt}\nProvide a concise, factual report.\nTask: ${task}` },
            ...context,
            { role: 'user', content: `Execute task: ${task}` }
        ];

        const tools = executor.getToolDefinitions();
        const model = 'meta-llama/llama-3.3-70b-instruct:free';
        const publisher = require('./publisher');

        publisher.publish('sub_agent', { id: this.id, persona, task });

        const response = await openrouter.stream({
            model,
            messages,
            tools,
            onDelta: () => { }
        });

        let subIterations = 0;
        let finalResponse = response;

        while (finalResponse.toolCalls && finalResponse.toolCalls.length > 0 && subIterations < 5) {
            subIterations++;
            const toolResults = [];
            for (const tc of finalResponse.toolCalls) {
                const res = await executor.execute({
                    name: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments)
                });
                toolResults.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: res.success ? JSON.stringify(res.result) : `Error: ${res.error}`
                });
            }
            messages.push({ role: 'assistant', content: finalResponse.text || '', tool_calls: finalResponse.toolCalls });
            messages.push(...toolResults);

            finalResponse = await openrouter.stream({ model, messages, tools, onDelta: () => { } });
        }

        return finalResponse.text || "No report generated.";
    }

    /**
     * Orchestrate a Council deliberation (v8.5)
     */
    async spawnCouncil(proposal, personas = ['SECURITY', 'PERFORMANCE', 'ARCHITECT']) {
        renderer.info(`[Council] Convening the Mastermind Council for a high-stakes review...`);
        const publisher = require('./publisher');
        publisher.publish('council_start', { proposal, personas });

        const reviews = await Promise.all(personas.map(async p => {
            const agent = new SubAgent(`${p.toLowerCase()}-${this.id}`);
            const review = await agent.run(`Review this proposal: ${proposal}`, [], p);
            return `### ${p} Review\n${review}`;
        }));

        const aggregationAgent = new SubAgent(`aggregator-${this.id}`);
        const finalizedReport = await aggregationAgent.run(
            `Synthesize these council reviews into a single Go/No-Go decision with a clear executive summary:\n\n${reviews.join('\n\n')}`,
            [], 'ARCHITECT'
        );

        publisher.publish('council_end', { report: finalizedReport });
        return finalizedReport;
    }
}

module.exports = SubAgent;
