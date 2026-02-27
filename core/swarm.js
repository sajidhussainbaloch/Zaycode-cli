/**
 * core/swarm.js — Multi-Agent Swarm Orchestration
 * 
 * Beats standard single-agent CLIs by splitting complex tasks
 * into specialized roles (Architect, Engineer, QA).
 */

'use strict';

const agent = require('./agent');
const state = require('./state');
const renderer = require('../ui/renderer');
const { colors, icons, styles } = require('../ui/theme');

/**
 * Execute a multi-agent Swarm sequence
 * @param {string} prompt The user's complex objective
 * @param {object} baseMemory Shared conversation memory instance
 * @param {boolean} useFreeModels If true, forces the use of free-tier models only to save credits
 */
async function runSwarmTask(prompt, baseMemory, useFreeModels = false) {
    console.log('');
    console.log(styles.title(`  ${icons.sparkle} INITIALIZING ZAYCODE SWARM `));
    console.log(`  ${colors.dim('Dividing task across specialized AI agents: Architect → Engineer → QA')}`);
    console.log('');

    // Preserve original state to restore later
    const originalMode = state.prop('mode');
    const originalModel = state.prop('activeModel');
    const originalOverride = state.prop('manualOverride');

    try {
        // ---------------------------------------------------------
        // PHASE 1: THE ARCHITECT (Planning & Reconnaissance)
        // ---------------------------------------------------------
        console.log(`  ${colors.warning('◆ Phase 1: The Lead Architect')}`);
        console.log(`  ${colors.dim('Investigating workspace and drafting blueprint...')}\n`);

        // Switch to heavy reasoning/planning model
        if (useFreeModels) {
            state.setModel('meta-llama/llama-3.3-70b-instruct:free');
        } else {
            state.setMode('plan');
        }
        const architectPrompt = `[SWARM PROTOCOL: ARCHITECT PHASE]
The user has requested the following complex objective:
"""
${prompt}
"""

You are the Lead Project Architect.
YOUR Directives:
1. Use your tools (search, file read) to investigate the current codebase context.
2. DO NOT write or edit code yet.
3. Output a strict, step-by-step Technical Blueprint & Implementation Plan for the Engineer. Include file architectures, edge cases to handle, and dependencies.`;

        await agent.run(architectPrompt, baseMemory);
        console.log('');

        // ---------------------------------------------------------
        // PHASE 2: THE ENGINEER (Implementation)
        // ---------------------------------------------------------
        console.log(`  ${colors.success('◆ Phase 2: The Senior Engineer')}`);
        console.log(`  ${colors.dim('Executing the blueprint and writing code... ')}\n`);

        // Switch to optimal coding model
        if (useFreeModels) {
            state.setModel('qwen/qwen3-coder:free');
        } else {
            state.setMode('code');
        }
        const engineerPrompt = `[SWARM PROTOCOL: ENGINEER PHASE]
You are the Senior Software Engineer.
Read the Technical Blueprint provided above by the Architect.

YOUR Directives:
1. Use your file/shell tools to write, modify, and delete files exactly as requested in the Blueprint.
2. Implement the logic cleanly and robustly.
3. If you encounter a block, use tools to explore the environment and adapt.
4. When finished, summarize the technical changes you made for the QA team.`;

        await agent.run(engineerPrompt, baseMemory);
        console.log('');

        // ---------------------------------------------------------
        // PHASE 3: THE QA REVIEWER (Testing & Verification)
        // ---------------------------------------------------------
        console.log(`  ${colors.info('◆ Phase 3: The QA Reviewer')}`);
        console.log(`  ${colors.dim('Auditing code, checking edge cases, and finalizing... ')}\n`);

        // Switch to diagnostic/debugging model
        if (useFreeModels) {
            state.setModel('mistralai/mistral-small-3.1-24b-instruct:free');
        } else {
            state.setMode('debug');
        }
        const qaPrompt = `[SWARM PROTOCOL: QA PHASE]
You are the QA Automation & Security Reviewer.
Read the Engineer's implementation steps above.

YOUR Directives:
1. Review the newly implemented code for bugs, missing imports, security flaws, or edge cases.
2. If necessary, use tools to run tests, syntax checks, or edit files to fix lingering issues.
3. When you are 100% satisfied, provide a final, human-readable summary of the completed Swarm task directly to the user. Explain what we built and if they need to do anything else.`;

        const qaResult = await agent.run(qaPrompt, baseMemory);

        // Export session summary to .zaycode.md
        try {
            const fs = require('fs');
            const path = require('path');
            const exportPath = path.join(state.get().cwd, '.zaycode.md');

            const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
            const summaryHeader = `\n\n---\n## 🐝 Swarm Session Export (${timestamp})\n**Task:** ${prompt}\n\n### QA Summary\n`;

            const logContent = summaryHeader + (qaResult.text || 'Task completed via tools without summary.') + '\n';
            fs.appendFileSync(exportPath, logContent, 'utf8');

            console.log(`  ${colors.dim(`Session recorded to .zaycode.md`)}`);
        } catch (e) {
            // Silently ignore permission/write errors
        }

        console.log('');
        console.log(`  ${colors.primary(icons.check)} ${require('chalk').bold('Swarm Execution Complete.')}`);
        console.log('');

    } finally {
        // Restore user's previous state preference
        if (originalOverride && originalModel) {
            // Must bypass router lock
            state._state.manualOverride = false;
            state.setModel(originalModel);
        } else {
            state.setMode(originalMode);
        }
    }
}

module.exports = { runSwarmTask };
