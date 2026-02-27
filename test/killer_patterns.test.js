/**
 * test/killer_patterns.test.js — Verification for v6.1 features
 */

'use strict';

const fs = require('fs');
const path = require('path');
const fileTools = require('../tools/fileTools');
const taskTools = require('../tools/taskTools');
const state = require('../core/state');

async function test_multi_chunk_edit() {
    console.log('Testing Multi-Chunk Edit...');
    const testFile = path.join(process.cwd(), 'test_edit.txt');
    fs.writeFileSync(testFile, 'Line 1\nLine 2\nLine 3\nLine 4', 'utf8');

    try {
        await fileTools.edit_file({
            path: 'test_edit.txt',
            chunks: [
                { search: 'Line 2', replace: 'Line TWO' },
                { search: 'Line 4', replace: 'Line FOUR' }
            ]
        });

        const content = fs.readFileSync(testFile, 'utf8');
        if (content.includes('Line TWO') && content.includes('Line FOUR')) {
            console.log('✅ Multi-Chunk Edit Passed');
        } else {
            console.error('❌ Multi-Chunk Edit Failed: Content mismatch');
            console.log(content);
        }
    } catch (err) {
        console.error('❌ Multi-Chunk Edit Error:', err.message);
    } finally {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
}

async function test_todo_write() {
    console.log('Testing Todo Write...');
    const taskFile = path.join(process.cwd(), '.zaycode_task.md');
    if (fs.existsSync(taskFile)) fs.unlinkSync(taskFile);

    try {
        await taskTools.todo_write({ action: 'add', task: 'Implement Feature X' });
        await taskTools.todo_write({ action: 'update', task: 'Implement Feature X', status: 'progress' });

        const content = fs.readFileSync(taskFile, 'utf8');
        if (content.includes('[/] Implement Feature X')) {
            console.log('✅ Todo Write Passed');
        } else {
            console.error('❌ Todo Write Failed');
            console.log(content);
        }
    } catch (err) {
        console.error('❌ Todo Write Error:', err.message);
    } finally {
        if (fs.existsSync(taskFile)) fs.unlinkSync(taskFile);
    }
}

async function run_tests() {
    state.setCwd(process.cwd());
    await test_multi_chunk_edit();
    await test_todo_write();
}

run_tests();
