/**
 * test/deep_thinking.test.js
 * Verification for Deep Thinking Mode (v6.4)
 */

'use strict';

const state = require('../core/state');
const contextManager = require('../core/contextManager');

function testDeepThinking() {
    console.log('--- Testing Deep Thinking Mode ---');

    // 1. Initial state (Standard)
    const prompt1 = contextManager.buildSystemPrompt();
    if (prompt1.includes('Reasoning Level: Standard') && !prompt1.includes('DEEP THINKING ACTIVATED')) {
        console.log('✓ Initial prompt is Standard');
    } else {
        console.error('✗ Initial prompt incorrect');
    }

    // 2. Toggle ON
    state.setDeepThinking(true);
    const prompt2 = contextManager.buildSystemPrompt();
    if (prompt2.includes('Reasoning Level: Advanced (Deep Thinking ON)') && prompt2.includes('DEEP THINKING ACTIVATED')) {
        console.log('✓ Prompt updated to Advanced');
        if (prompt2.includes('Exhaustive Exploration') && prompt2.includes('Edge-Case Stress Test')) {
            console.log('✓ Advanced rules found in prompt');
        } else {
            console.error('✗ Advanced rules missing');
        }
    } else {
        console.error('✗ Prompt failed to update to Advanced');
    }

    // 3. Toggle OFF
    state.setDeepThinking(false);
    const prompt3 = contextManager.buildSystemPrompt();
    if (prompt3.includes('Reasoning Level: Standard') && !prompt3.includes('DEEP THINKING ACTIVATED')) {
        console.log('✓ Prompt reverted to Standard');
    } else {
        console.error('✗ Prompt failed to revert');
    }

    console.log('Deep Thinking Mode tests COMPLETE');
}

try {
    testDeepThinking();
} catch (err) {
    console.error(err);
}
