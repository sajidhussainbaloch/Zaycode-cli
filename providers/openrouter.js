/**
 * providers/openrouter.js — OpenRouter Streaming Provider
 * 
 * Implements proper SSE streaming with line-based buffer
 * to handle partial chunks correctly. Supports tool calls.
 */

'use strict';

const https = require('https');
const { URL } = require('url');
const logger = require('../core/logger');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT = 120000;

/**
 * Stream a completion from OpenRouter.
 * 
 * @param {{ model: string, messages: Array, tools?: Array, onDelta?: Function }} opts
 * @returns {Promise<{ text: string, toolCalls: Array|null }>}
 */
async function stream({ model, messages, tools, onDelta }) {
    const config = require('../config');
    const apiKey = config.apiKey;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not set. Run ZayCode to launch the setup wizard.');
    }

    const payload = {
        model,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        stream: true,
    };

    // Only include tools if provided and non-empty
    if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
    }

    const body = JSON.stringify(payload);
    const url = new URL(OPENROUTER_URL);

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'HTTP-Referer': 'https://zaycode.dev',
                    'X-Title': 'ZayCode CLI',
                },
                timeout: DEFAULT_TIMEOUT,
            },
            (res) => {
                // Check for non-200 status
                if (res.statusCode !== 200) {
                    let errorBody = '';
                    res.on('data', (chunk) => { errorBody += chunk.toString(); });
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(errorBody);
                            const errorMessage = parsed.error?.message || errorBody;
                            logger.apiTrace(OPENROUTER_URL, payload, errorMessage); // Added logger.apiTrace for error
                            reject(new Error(`API error (${res.statusCode}): ${errorMessage}`));
                        } catch {
                            const errorMessage = errorBody.slice(0, 500);
                            logger.apiTrace(OPENROUTER_URL, payload, errorMessage); // Added logger.apiTrace for error
                            reject(new Error(`API error (${res.statusCode}): ${errorMessage}`));
                        }
                    });
                    return;
                }

                let assistantText = '';
                let toolCalls = null;
                let buffer = ''; // Line buffer for proper SSE parsing

                res.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');

                    // Process complete lines only (SSE protocol: events separated by \n\n)
                    while (true) {
                        const boundary = buffer.indexOf('\n');
                        if (boundary === -1) break;

                        const line = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 1);

                        if (!line) continue; // Empty line (event separator)

                        // Strip 'data: ' prefix
                        if (!line.startsWith('data:')) continue;
                        const data = line.slice(5).trim();

                        if (data === '[DONE]') {
                            logger.apiTrace(OPENROUTER_URL, payload, { text: assistantText, toolCalls }); // Added logger.apiTrace for success
                            resolve({ text: assistantText, toolCalls });
                            return;
                        }

                        try {
                            const obj = JSON.parse(data);
                            const choice = obj.choices && obj.choices[0];
                            if (!choice) continue;

                            // Handle content delta
                            if (choice.delta) {
                                // Text content
                                if (choice.delta.content) {
                                    assistantText += choice.delta.content;
                                    if (onDelta) onDelta(choice.delta.content);
                                }

                                // Tool calls accumulation
                                if (choice.delta.tool_calls) {
                                    if (!toolCalls) toolCalls = [];

                                    for (const tc of choice.delta.tool_calls) {
                                        const idx = tc.index || 0;

                                        // Initialize slot if needed
                                        while (toolCalls.length <= idx) {
                                            toolCalls.push({
                                                id: '',
                                                type: 'function',
                                                function: { name: '', arguments: '' },
                                            });
                                        }

                                        // Accumulate parts
                                        if (tc.id) toolCalls[idx].id = tc.id;
                                        if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
                                        if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
                                    }
                                }
                            }

                            // Handle finish reason
                            if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
                                // Don't resolve here — wait for [DONE]
                            }
                        } catch {
                            // Partial JSON or non-JSON line — skip
                        }
                    }
                });

                res.on('end', () => {
                    // Stream ended without [DONE] marker
                    resolve({ text: assistantText, toolCalls });
                });

                res.on('error', (err) => {
                    reject(err);
                });
            }
        );

        req.on('error', (err) => {
            reject(new Error(`Network error: ${err.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.write(body);
        req.end();
    });
}

module.exports = { stream };
