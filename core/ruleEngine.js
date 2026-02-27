/**
 * core/ruleEngine.js — Agentic Guardrail & Workspace Policy Engine (v7.0)
 * 
 * Loads and applies workspace-specific coding rules (.zaycoderules).
 * Supports patterns like "Strict TS", "Functional Only", "Early Returns", etc.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const renderer = require('../ui/renderer');

class RuleEngine {
    constructor() {
        this.rules = [];
        this.rulesFile = '.zaycoderules';
    }

    /**
     * Load rules from the current workspace root.
     */
    loadRules(cwd = process.cwd()) {
        const filePath = path.join(cwd, this.rulesFile);

        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                this.rules = this._parseRules(content);
                renderer.hint(`[Rule-Engine] Loaded ${this.rules.length} workspace guardrails.`);
            } catch (e) {
                renderer.error(`Failed to load rules: ${e.message}`);
            }
        }
    }

    /**
     * Get rules as a formatted string for prompt injection.
     */
    getRulePrompt() {
        if (this.rules.length === 0) return "";

        return `
[WORKSPACE GUARDRAILS]
You MUST follow these specific coding rules for this workspace:
${this.rules.map(r => `- ${r}`).join('\n')}
`;
    }

    /**
     * Simple markdown bullet point parser.
     */
    _parseRules(content) {
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('- ') || line.startsWith('* '))
            .map(line => line.substring(2).trim());
    }
}

const ruleEngine = new RuleEngine();
module.exports = ruleEngine;
