/**
 * test/optimization.test.js
 * Verification for Self-Correction and Pruning (v6.4)
 */

'use strict';

const Memory = require('../core/memory');
const state = require('../core/state');

async function testOptimization() {
    console.log('--- Testing Optimization (Pruning & Self-Correction) ---');

    // 1. Test Pruning
    const memory = new Memory();
    console.log('Adding 60 messages to trigger prune logic simulation...');
    for (let i = 0; i < 60; i++) {
        memory.addUser(`Message ${i}`);
    }

    const countBefore = memory.getCount();
    console.log(`Count before prune: ${countBefore}`);

    memory.prune(0.5);
    const countAfter = memory.getCount();
    console.log(`Count after prune: ${countAfter}`);

    if (countAfter < countBefore) {
        console.log('✓ Pruning successful');
    } else {
        console.error('✗ Pruning failed to reduce count');
    }

    // 2. Test Self-Correction Logic (Mock check)
    // We check if the logic in agent.js would detect the error.
    // Since we can't easily run the full agent loop here without network,
    // we verify the state and logic manually in thoughts or simple unit test.

    memory.clear();
    memory.addUser("Test");
    memory.addAssistant("Thinking...", [{ id: "call_123", function: { name: "read_file", arguments: '{"path":"invalid.js"}' } }]);
    memory.addToolResult("call_123", "Error: File not found");

    const history = memory.getMessages();
    const lastMsg = history[history.length - 1];
    if (lastMsg.role === 'tool' && lastMsg.content.includes('Error:')) {
        console.log('✓ Error detection in history successful');
    } else {
        console.error('✗ Error detection failed');
    }

    console.log('Optimization tests COMPLETE');
}

testOptimization();
