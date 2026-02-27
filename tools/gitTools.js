/**
 * tools/gitTools.js — Git Operations
 * 
 * Wraps git commands with structured output.
 * All operations run in the current working directory.
 */

'use strict';

const { execSync } = require('child_process');
const state = require('../core/state');

function _git(cmd) {
    try {
        return execSync(`git ${cmd}`, {
            cwd: state.prop('cwd'),
            encoding: 'utf8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        }).trim();
    } catch (err) {
        throw new Error(`git ${cmd} failed: ${(err.stderr || err.message).toString().trim()}`);
    }
}

/** Get current git status */
async function git_status() {
    const status = _git('status --porcelain');
    const branch = _git('rev-parse --abbrev-ref HEAD');

    const files = status
        .split('\n')
        .filter(Boolean)
        .map(line => ({
            status: line.slice(0, 2).trim(),
            file: line.slice(3),
        }));

    return {
        branch,
        clean: files.length === 0,
        files,
        summary: files.length === 0
            ? 'Working tree is clean'
            : `${files.length} file(s) changed`,
    };
}

/** Get git diff */
async function git_diff({ staged = false } = {}) {
    const cmd = staged ? 'diff --staged' : 'diff';
    const diff = _git(cmd);
    const maxLen = 6000;
    return {
        diff: diff.length > maxLen
            ? diff.slice(0, maxLen) + '\n... (diff truncated)'
            : diff || '(no changes)',
    };
}

/** Get current branch and list all branches */
async function git_branch() {
    const current = _git('rev-parse --abbrev-ref HEAD');
    const all = _git('branch --list')
        .split('\n')
        .map(b => b.replace(/^\*?\s*/, '').trim())
        .filter(Boolean);

    return {
        current,
        branches: all,
    };
}

/** Stage all and commit */
async function git_commit({ message }) {
    if (!message || !message.trim()) {
        throw new Error('Commit message is required');
    }
    _git('add -A');
    // Escape quotes in message for shell safety
    const safeMsg = message.replace(/"/g, '\\"');
    const result = _git(`commit -m "${safeMsg}"`);
    return {
        message: message,
        result,
    };
}

module.exports = { git_status, git_diff, git_branch, git_commit };
