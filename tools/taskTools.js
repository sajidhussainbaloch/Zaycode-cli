/**
 * tools/taskTools.js — Task & Workflow Management
 * 
 * Specifically manages .zaycode_task.md for persistent goal tracking.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const state = require('../core/state');

/**
 * Update or create .zaycode_task.md with structured tasks.
 */
async function todo_write({ action, task, status = 'todo' }) {
    const taskFile = path.join(state.prop('cwd'), '.zaycode_task.md');
    let content = '';

    if (fs.existsSync(taskFile)) {
        content = fs.readFileSync(taskFile, 'utf8');
    } else {
        content = '# Project Tasks\n\n';
    }

    if (action === 'add') {
        content += `- [ ] ${task}\n`;
    } else if (action === 'update') {
        const checkbox = status === 'done' ? '[x]' : (status === 'progress' ? '[/]' : '[ ]');
        // Simple regex replace for the task
        const escapedTask = task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`- \\[ [x/ ] \\] ${escapedTask}`, 'i');
        if (regex.test(content)) {
            content = content.replace(regex, `- ${checkbox} ${task}`);
        } else {
            // If not found, add it
            content += `- ${checkbox} ${task}\n`;
        }
    } else if (action === 'delete') {
        const escapedTask = task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`- \\[ [x/ ] \\] ${escapedTask}\\n?`, 'gi');
        content = content.replace(regex, '');
    }

    fs.writeFileSync(taskFile, content, 'utf8');
    return {
        message: `Task file updated: ${action} "${task}"`,
        path: '.zaycode_task.md'
    };
}

module.exports = { todo_write };
