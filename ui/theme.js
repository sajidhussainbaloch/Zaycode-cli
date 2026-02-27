/**
 * ui/theme.js — Centralized Color & Style System
 * 
 * All chalk usage routes through these tokens.
 * Dark terminal aesthetic with gradient accents.
 */

'use strict';

const chalk = require('chalk');

// Core palette — professional dark terminal
const colors = {
    // Primary accent (cyan-blue gradient feel)
    primary: chalk.hex('#00D4FF'),
    primaryDim: chalk.hex('#0099CC'),

    // Secondary accent (violet)
    secondary: chalk.hex('#A855F7'),
    secondaryDim: chalk.hex('#7C3AED'),

    // Success / active
    success: chalk.hex('#22C55E'),
    successDim: chalk.hex('#16A34A'),

    // Warning
    warning: chalk.hex('#F59E0B'),
    warningDim: chalk.hex('#D97706'),

    // Error / danger
    error: chalk.hex('#EF4444'),
    errorDim: chalk.hex('#DC2626'),

    // Neutral text
    text: chalk.hex('#E5E7EB'),
    dim: chalk.hex('#6B7280'),
    muted: chalk.hex('#4B5563'),
    faint: chalk.hex('#374151'),

    // Special
    white: chalk.hex('#F9FAFB'),
    black: chalk.hex('#111827'),

    // Model / provider colors
    model: chalk.hex('#F472B6'),
    provider: chalk.hex('#60A5FA'),

    // Tool execution
    tool: chalk.hex('#34D399'),
    toolDim: chalk.hex('#059669'),

    // Mode highlights
    modeActive: chalk.bgHex('#00D4FF').hex('#111827'),
    modeActiveText: chalk.hex('#00D4FF').bold,
    modeInactive: chalk.hex('#4B5563'),
};

// Semantic styles
const styles = {
    // Header / title
    title: (s) => chalk.bold(colors.primary(s)),
    subtitle: (s) => colors.primaryDim(s),

    // Status indicators
    active: (s) => chalk.bold(colors.success(s)),
    inactive: (s) => colors.dim(s),

    // User input
    prompt: (s) => chalk.bold(colors.primary(s)),
    userText: (s) => colors.text(s),

    // AI output
    aiText: (s) => colors.text(s),
    thinking: (s) => chalk.italic(colors.secondary(s)),

    // Info levels
    info: (s) => colors.primary(s),
    warn: (s) => colors.warning(s),
    err: (s) => chalk.bold(colors.error(s)),
    hint: (s) => colors.dim(s),

    // Code
    code: (s) => chalk.bgHex('#1F2937').hex('#E5E7EB')(s),

    // Labels
    label: (s) => chalk.bold(colors.dim(s)),
    value: (s) => colors.text(s),

    // Model / provider
    modelName: (s) => chalk.bold(colors.model(s)),
    provName: (s) => colors.provider(s),

    // Tool
    toolName: (s) => chalk.bold(colors.tool(s)),
    toolResult: (s) => colors.toolDim(s),

    // Separators
    separator: () => colors.faint('─'.repeat(60)),
    thinSep: () => colors.faint('·'.repeat(40)),
};

// Icons / symbols
const icons = {
    prompt: '❯',
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    tool: '⚡',
    thinking: '◆',
    arrow: '→',
    dot: '●',
    circle: '○',
    branch: '',
    folder: '',
    file: '',
};

module.exports = { colors, styles, icons };
