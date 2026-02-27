/**
 * ui/menu.js — Interactive Command & Model Menu
 * 
 * Provides a visual interface for users to discover ZayCode capabilities.
 */

'use strict';

const chalk = require('chalk');
const { colors, styles, icons } = require('./theme');
const modelRegistry = require('../models/registry');

/**
 * Display the command and model menu
 */
async function displayMenu() {
    console.log('\n' + styles.separator());
    console.log(`  ${styles.title('ZAYCODE v6.8 COMMAND CENTER')} ${chalk.dim('— Press /m for help')}`);
    console.log(styles.separator());

    // Section 1: Core Commands
    console.log(`\n  ${styles.subtitle('CORE COMMANDS')}`);
    const commands = [
        { cmd: '/reason', desc: 'Toggle Deep Thinking mode (extended CoT)' },
        { cmd: '/swarm', desc: 'Spawn a multi-agent swarm for complex tasks' },
        { cmd: '/eval', desc: 'Evaluate prompt variants using LLM-as-a-judge' },
        { cmd: '/prompt', desc: 'Manage versioned prompt registry (save/list/check)' },
        { cmd: '/config', desc: 'View and edit global configuration' },
        { cmd: '/resume', desc: 'Reload a past session from history' },
    ];

    commands.forEach(c => {
        console.log(`  ${chalk.cyan(c.cmd.padEnd(10))} ${colors.text(c.desc)}`);
    });

    // Section 2: Recommended Models (Quick Switch)
    console.log(`\n  ${styles.subtitle('RECOMMENDED MODELS')}`);
    const featured = [
        { name: 'Claude Sonnet 4.6', id: 'anthropic/claude-sonnet-4.6', provider: 'Anthropic' },
        { name: 'GPT-5 Mini', id: 'openai/gpt-5-mini', provider: 'OpenAI' },
        { name: 'DeepSeek V3', id: 'deepseek/deepseek-chat', provider: 'DeepSeek' },
        { name: 'Gemini 2.5 Pro', id: 'google/gemini-2.5-pro', provider: 'Google (Free)' },
    ];

    featured.forEach(m => {
        console.log(`  ${icons.dot} ${styles.modelName(m.name.padEnd(20))} ${chalk.dim(m.id)}`);
    });

    // Section 3: Modes
    console.log(`\n  ${styles.subtitle('INTELLIGENCE MODES')}`);
    const modes = [
        { mode: 'PLAN (Architect)', desc: 'Architectural analysis, no file edits permitted.' },
        { mode: 'BUILD (Code)', desc: 'Full implementation and surgical diff application.' },
        { mode: 'REASON (Think)', desc: 'Deep logical decomposition and debugging.' },
        { mode: 'DEBUG (Fix)', desc: 'Automated error tracing and stack-trace analysis.' },
        { mode: 'AUTO (Smart)', desc: 'Automatic intent-based model and mode routing.' },
    ];

    modes.forEach(m => {
        console.log(`  ${chalk.bold.magenta(m.mode.padEnd(18))} ${chalk.dim(m.desc)}`);
    });

    console.log('\n' + styles.separator() + '\n');
}

module.exports = { displayMenu };
