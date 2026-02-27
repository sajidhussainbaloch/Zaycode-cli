/**
 * core/memory.js — Conversation Memory
 * 
 * Stores conversation messages with role, content, and tool_call metadata.
 * Token-aware trimming ensures we stay within context budget.
 */

'use strict';

const MAX_MESSAGES = 50;

// Rough token estimation: ~4 chars per token (common approximation)
const CHARS_PER_TOKEN = 4;

const fs = require('fs');
const path = require('path');
const os = require('os');
const state = require('./state');
const configManager = require('./configManager');

const HISTORY_DIR = path.join(os.homedir(), '.zaycode', 'history');

class Memory {
    constructor() {
        this._messages = [];
        this._systemPrompt = null;
    }

    /** Alias for _messages to support standard naming */
    get history() {
        return this._messages;
    }

    /** Set the system prompt (always first in messages) */
    setSystem(content) {
        this._systemPrompt = { role: 'system', content };
    }

    /** Add a user message */
    addUser(content) {
        this._messages.push({ role: 'user', content });
        this._trim();
        this._saveToDisk();
    }

    /** Add an assistant message */
    addAssistant(content, toolCalls = null) {
        const msg = { role: 'assistant', content: content || '' };
        if (toolCalls && toolCalls.length > 0) {
            msg.tool_calls = toolCalls;
        }
        this._messages.push(msg);
        this._trim();
        this._saveToDisk();
    }

    /** Add a tool result message */
    addToolResult(toolCallId, content) {
        this._messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: typeof content === 'string' ? content : JSON.stringify(content),
        });
        this._trim();
        this._saveToDisk();
    }

    /** Get all messages for API call (system + conversation) */
    getMessages() {
        const msgs = [];
        if (this._systemPrompt) {
            msgs.push({ ...this._systemPrompt });
        }

        // v8.2: Dynamic Context Compression
        const compressor = require('./compressor');
        const history = this._messages.map(m => ({ ...m }));

        return msgs.concat(compressor.compressHistory(history));
    }

    /** Get estimated token count */
    getTokenEstimate() {
        let chars = 0;
        if (this._systemPrompt) {
            chars += this._systemPrompt.content.length;
        }
        for (const m of this._messages) {
            chars += (m.content || '').length;
            if (m.tool_calls) {
                chars += JSON.stringify(m.tool_calls).length;
            }
        }
        return Math.ceil(chars / CHARS_PER_TOKEN);
    }

    /** Get message count */
    getCount() {
        return this._messages.length;
    }

    /** Clear all conversation messages (keeps system prompt) */
    clear() {
        this._messages = [];
        this._saveToDisk();
    }

    /** Trim oldest messages if over limit */
    _trim() {
        while (this._messages.length > MAX_MESSAGES) {
            this._messages.shift();
        }
    }

    /** Prune a percentage of middle-history messages (preserving recency) */
    prune(factor = 0.5) {
        if (this._messages.length < 10) return; // Don't prune very short history

        const keepCount = Math.floor(this._messages.length * (1 - factor));
        const recentToKeep = Math.ceil(keepCount / 2);
        const oldestToKeep = keepCount - recentToKeep;

        const oldest = this._messages.slice(0, oldestToKeep);
        const recent = this._messages.slice(-recentToKeep);

        this._messages = [
            ...oldest,
            { role: 'user', content: `... (system: ${this._messages.length - keepCount} messages pruned for context efficiency) ...` },
            ...recent
        ];

        this._saveToDisk();
    }

    /** Persist conversation to global tracking dir */
    _saveToDisk() {
        const conf = configManager.get();
        if (conf.system && conf.system.saveHistory === false) return;

        try {
            if (!fs.existsSync(HISTORY_DIR)) {
                fs.mkdirSync(HISTORY_DIR, { recursive: true });
            }
            const sessionId = state.get().sessionId;
            if (!sessionId) return;

            const file = path.join(HISTORY_DIR, `${sessionId}.json`);
            fs.writeFileSync(file, JSON.stringify(this._messages, null, 2), 'utf8');
        } catch (err) {
            // Silently fail if we can't write history
        }
    }

    /** Load a specific session from disk */
    loadFromDisk(sessionId) {
        try {
            const file = path.join(HISTORY_DIR, `${sessionId}.json`);
            if (fs.existsSync(file)) {
                this._messages = JSON.parse(fs.readFileSync(file, 'utf8'));
                state.setSessionId(sessionId);
                return true;
            }
        } catch (err) { }
        return false;
    }
}

module.exports = Memory;
