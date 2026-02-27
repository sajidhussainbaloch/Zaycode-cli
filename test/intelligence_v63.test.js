/**
 * test/intelligence_v63.test.js
 * Verification for Intelligence Features (v6.3)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const state = require('../core/state');
const memoryManager = require('../core/memoryManager');
const executor = require('../core/executor');

async function testIntelligence() {
    console.log('--- Testing Intelligence v6.3 ---');

    const testDir = path.join(__dirname, 'mock_intelligence_project');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    state.setCwd(testDir);

    // 1. Test Remember Fact
    console.log('Testing remember_fact...');
    const fact = "We use the 'ZayCode' prefix for all internal tools.";
    const result = await executor.execute({
        name: 'remember_fact',
        arguments: { fact }
    });

    if (result.success) {
        console.log('✓ remember_fact executed successfully');
    } else {
        console.error('✗ remember_fact failed:', result.error);
    }

    // 2. Verify ZAYCODE.md contents
    const memoryPath = path.join(testDir, 'ZAYCODE.md');
    if (fs.existsSync(memoryPath)) {
        const content = fs.readFileSync(memoryPath, 'utf8');
        if (content.includes(fact)) {
            console.log('✓ ZAYCODE.md contains the remembered fact');
        } else {
            console.error('✗ ZAYCODE.md missing the fact');
        }
    } else {
        console.error('✗ ZAYCODE.md was not created');
    }

    // 3. Test Memory Loading
    console.log('Testing memory loading...');
    const loaded = memoryManager.loadProjectMemory();
    if (loaded.includes(fact)) {
        console.log('✓ memoryManager loaded the fact correctly');
    } else {
        console.error('✗ memoryManager failed to load the fact');
    }

    // Clean up
    console.log('\nCleaning up test project...');
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('Intelligence v6.3 tests COMPLETE');
}

testIntelligence().catch(console.error);
