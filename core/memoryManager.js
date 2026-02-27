/**
 * core/memoryManager.js — Project-Level Persistent Memory
 * 
 * Manages ZAYCODE.md to store project-specific conventions, 
 * resolved bugs, and architecture notes.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const state = require('./state');
const renderer = require('../ui/renderer');

const MEMORY_FILE = 'ZAYCODE.md';

/**
 * Load project memory if it exists
 */
function loadProjectMemory() {
    const filePath = path.join(state.prop('cwd'), MEMORY_FILE);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
    }
    return '';
}

/**
 * Update or append to project memory
 */
async function updateProjectMemory(observation) {
    const filePath = path.join(state.prop('cwd'), MEMORY_FILE);
    let content = '';

    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
    } else {
        content = `# Project Intelligence (ZAYCODE.md)\n\nThis file stores architectural patterns and project-specific knowledge.\n\n`;
    }

    // Proactive duplicate check (simple)
    if (content.includes(observation.slice(0, 50))) {
        return { success: true, message: 'Observation already exists in memory.' };
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const entry = `\n### [${timestamp}]\n- ${observation}\n`;

    fs.appendFileSync(filePath, entry, 'utf8');

    renderer.success(`Updated project memory: ${MEMORY_FILE}`);

    return {
        success: true,
        message: `Saved observation to ${MEMORY_FILE}`
    };
}

module.exports = {
    loadProjectMemory,
    updateProjectMemory
};
