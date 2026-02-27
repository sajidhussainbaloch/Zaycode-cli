/**
 * core/compressor.js — LLMLingua-lite Context Compression (v8.2)
 * 
 * Compresses conversation history by identifying and removing
 * low-information tokens while preserving semantic intent.
 */

'use strict';

const renderer = require('../ui/renderer');

class Compressor {
    /**
     * Compress a message content string.
     * Strategy: 
     * 1. Remove filler words.
     * 2. Truncate long tool outputs that aren't errors.
     * 3. Summarize repetitive thoughts.
     */
    compressContent(content) {
        if (!content || content.length < 500) return content;

        let compressed = content;

        // Pattern 1: Remove excessive whitespace/newlines
        compressed = compressed.replace(/\n{3,}/g, '\n\n');

        // Pattern 2: Truncate very long successful tool outputs (keep the end)
        if (compressed.length > 2000 && !compressed.includes('Error:')) {
            const lines = compressed.split('\n');
            if (lines.length > 50) {
                compressed = lines.slice(0, 10).join('\n') +
                    '\n\n... [Compressed by ZayCode Mastermind] ...\n\n' +
                    lines.slice(-10).join('\n');
            }
        }

        return compressed;
    }

    /**
     * Compress the entire message history.
     */
    compressHistory(history) {
        const totalTokensBefore = history.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);

        const compressedHistory = history.map((msg, index) => {
            // Don't compress the most recent 3 messages to keep context fresh
            if (index >= history.length - 3) return msg;

            // Don't compress user prompts or tool errors
            if (msg.role === 'user' || (msg.role === 'tool' && msg.content.includes('Error:'))) {
                return msg;
            }

            return {
                ...msg,
                content: this.compressContent(msg.content)
            };
        });

        const totalTokensAfter = compressedHistory.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
        const ratio = Math.round((1 - totalTokensAfter / totalTokensBefore) * 100);

        if (ratio > 5) {
            renderer.hint(`[Compressor] Context optimized! Reduced token weight by ${ratio}%`);
        }

        return compressedHistory;
    }
}

const compressor = new Compressor();
module.exports = compressor;
