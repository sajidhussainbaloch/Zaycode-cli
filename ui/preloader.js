/**
 * ui/preloader.js — Startup Animation
 * 
 * Provides a premium startup sequence for ZayCode.
 */

'use strict';

const chalk = require('chalk');
const { colors } = require('./theme');

async function showPreloader() {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    const startTime = Date.now();
    const duration = 1200; // ms

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const percent = Math.floor(progress * 100);

            process.stdout.write(`\r  ${colors.primary(frames[i % frames.length])}  ${chalk.bold('ZayCode v6.8')} ${chalk.dim('Initializing...')} ${colors.text(percent + '%')}`);

            i++;
            if (elapsed >= duration) {
                clearInterval(interval);
                process.stdout.write(`\r  ${chalk.green('✓')}  ${chalk.bold('ZayCode v6.8')} ${chalk.dim('Ready.')}          \n\n`);
                resolve();
            }
        }, 80);
    });
}

module.exports = { showPreloader };
