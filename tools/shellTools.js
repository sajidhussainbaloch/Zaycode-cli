/**
 * tools/shellTools.js — Sandboxed Shell Execution
 * 
 * Executes shell commands with timeout and output capture.
 */

'use strict';

const { execSync } = require('child_process');
const state = require('../core/state');

const MAX_OUTPUT = 8000;  // Max chars of output to return
const TIMEOUT = 30000;    // 30s timeout

/**
 * Execute a shell command
 * @param {{ command: string, cwd?: string }} args
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
async function run_shell({ command, cwd }) {
    const workdir = cwd || state.prop('cwd');

    try {
        const stdout = execSync(command, {
            cwd: workdir,
            encoding: 'utf8',
            timeout: TIMEOUT,
            maxBuffer: 1024 * 1024, // 1MB
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });

        const truncated = stdout.length > MAX_OUTPUT
            ? stdout.slice(0, MAX_OUTPUT) + '\n... (output truncated)'
            : stdout;

        return {
            command,
            stdout: truncated,
            stderr: '',
            exitCode: 0,
        };
    } catch (err) {
        // execSync throws on non-zero exit codes
        const stdout = (err.stdout || '').toString().slice(0, MAX_OUTPUT);
        const stderr = (err.stderr || '').toString().slice(0, MAX_OUTPUT);

        return {
            command,
            stdout,
            stderr,
            exitCode: err.status || 1,
            error: err.message,
        };
    }
}

module.exports = { run_shell };
