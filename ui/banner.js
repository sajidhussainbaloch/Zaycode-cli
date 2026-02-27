/**
 * ui/banner.js — Gradient ASCII Art Logo
 * 
 * Large, professional banner displayed once at startup.
 */

'use strict';

const chalk = require('chalk');
const { colors, styles } = require('./theme');

const LOGO_LINES = [
    '  ███████╗ █████╗ ██╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗',
    '  ╚══███╔╝██╔══██╗╚██╗ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝',
    '    ███╔╝ ███████║ ╚████╔╝ ██║     ██║   ██║██║  ██║█████╗  ',
    '   ███╔╝  ██╔══██║  ╚██╔╝  ██║     ██║   ██║██║  ██║██╔══╝  ',
    '  ███████╗██║  ██║   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗',
    '  ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
];

const GRADIENT = ['#00D4FF', '#1AB8F0', '#339CE0', '#4D80D1', '#6664C1', '#8048B2'];

function showBanner() {
    process.stdout.write('\n');
    LOGO_LINES.forEach((line, i) => {
        const color = GRADIENT[i % GRADIENT.length];
        process.stdout.write(chalk.hex(color)(line) + '\n');
    });

    process.stdout.write('\n');
    process.stdout.write(colors.dim('  ') + chalk.bold.hex('#A855F7')('Autonomous AI Developer CLI') + colors.dim('  ·  ') + chalk.bold.green('v6.8.0 Premium 🚀') + '\n');
    process.stdout.write(colors.dim('  Type anything to start  ·  ') + chalk.cyan('/m') + colors.dim(' for menu  ·  ') + chalk.cyan('/reason') + colors.dim(' for CoT\n'));
    process.stdout.write('  ' + styles.separator() + '\n');
}

module.exports = { showBanner };
