/**
 * ui/statusBar.js — Dynamic Bottom Status Bar
 * 
 * Shows: cwd, git branch, sandbox, provider, model, mode, context %, session ID
 * Updated on state changes.
 */

'use strict';

const path = require('path');
const { colors, styles, icons } = require('./theme');
const state = require('../core/state');

/**
 * Render the status bar string (does NOT move cursor — just returns the string)
 */
function render() {
    const s = state.get();

    const parts = [];

    // CWD (shortened)
    const cwdShort = shortenPath(s.cwd);
    parts.push(colors.dim(`${icons.folder} ${cwdShort}`));

    // Git branch
    if (s.gitBranch) {
        parts.push(colors.secondary(`${icons.branch} ${s.gitBranch}`));
    }

    // Mode
    parts.push(colors.primary(s.mode.toUpperCase()));

    // Model
    const modelShort = s.activeModel
        ? s.activeModel.split('/').pop()
        : '(auto)';
    parts.push(colors.model(modelShort));

    // Manual override indicator
    if (s.manualOverride) {
        parts.push(colors.warning('LOCKED'));
    }

    // Context usage
    if (s.contextUsed > 0) {
        const pct = Math.min(100, Math.round((s.contextUsed / s.contextMax) * 100));
        const color = pct > 80 ? colors.error : pct > 50 ? colors.warning : colors.dim;
        parts.push(color(`ctx:${pct}%`));
    }

    // Sandbox
    if (s.sandbox) {
        parts.push(colors.warning('SANDBOX'));
    }

    // Deployment Nudge (Replit style)
    if (s.isReadyForDeployment) {
        parts.push(colors.success(`${icons.success} READY`));
    }

    // Session ID
    parts.push(colors.dim(s.sessionId));

    return parts.join(colors.dim('  │  '));
}

/** Shorten a path for display */
function shortenPath(p) {
    const parts = p.split(path.sep);
    if (parts.length <= 3) return p;
    return '...' + path.sep + parts.slice(-2).join(path.sep);
}

module.exports = { render };
