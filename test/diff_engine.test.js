/**
 * test/diff_engine.test.js
 * 
 * Verifies surgical SEARCH/REPLACE logic.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const diffTools = require('../tools/diffTools');
const state = require('../core/state');

async function testDiffEngine() {
    console.log('--- Testing Precision Diff Engine ---');

    const testFile = path.join(process.cwd(), 'temp_test_file.js');
    const initialContent = `
function hello() {
    console.log("Hello World");
    return true;
}

function goodbye() {
    console.log("See ya");
}
`;
    fs.writeFileSync(testFile, initialContent, 'utf8');
    state.setCwd(process.cwd());

    try {
        const diff = `
<<<<<<< SEARCH
function goodbye() {
    console.log("See ya");
}
=======
function goodbye() {
    console.log("Farewell, world!");
    return false;
}
>>>>>>> REPLACE
`;
        await diffTools.apply_diff({ path: 'temp_test_file.js', diff });

        const finalContent = fs.readFileSync(testFile, 'utf8');
        if (finalContent.includes('Farewell, world!') && !finalContent.includes('See ya')) {
            console.log('✅ Diff applied successfully.');
        } else {
            console.error('❌ Diff content mismatch.');
        }

        // Test failure (mismatch)
        try {
            await diffTools.apply_diff({ path: 'temp_test_file.js', diff: '<<<<<<< SEARCH\nWRONG\n=======\nNEW\n>>>>>>> REPLACE' });
            console.error('❌ Failed: Should have thrown mismatch error.');
        } catch (e) {
            console.log('✅ Correctly caught mismatch error.');
        }

    } finally {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
}

testDiffEngine();
