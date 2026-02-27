/**
 * test/v6.5_verification.test.js — Verification for Agentic Platform features
 */

'use strict';

const assert = require('assert');
const contextManager = require('../core/contextManager');
const state = require('../core/state');
const executor = require('../core/executor');

describe('ZayCode v6.5 Verification', () => {

    it('should include Citations and Architect Protocol in System Prompt', () => {
        state.setMode('plan');
        const prompt = contextManager.buildSystemPrompt();

        assert.ok(prompt.includes('v6.5.0'), 'Should mention v6.5.0');
        assert.ok(prompt.includes('STRICT RULE'), 'Should show Strict Architect rules');
        assert.ok(prompt.includes('CITATION PROTOCOL'), 'Should show Citation Protocol');
        assert.ok(prompt.includes('spawn_research_agent'), 'Should mention research agent tool');
    });

    it('should have spawn_research_agent registered in executor', () => {
        const tools = executor.getToolDefinitions();
        const researchTool = tools.find(t => t.function.name === 'spawn_research_agent');
        assert.ok(researchTool, 'spawn_research_agent should be defined');
        assert.strictEqual(researchTool.function.parameters.required[0], 'task');
    });

    it('should maintain currentMilestone in state', () => {
        state.set({ currentMilestone: 'Phase 1: Research' });
        assert.strictEqual(state.prop('currentMilestone'), 'Phase 1: Research');
    });
});
