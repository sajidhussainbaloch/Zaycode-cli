/**
 * tools/testTools.js — Automated Test Orchestrator (v8.1)
 * 
 * Auto-detects and runs the project's test suite (Jest, Vitest, npm test, etc.)
 * Used by the Self-Healing Build Loop.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const state = require('../core/state');
const renderer = require('../ui/renderer');

/**
 * Auto-detect and run tests.
 */
async function run_project_tests() {
    const cwd = state.prop('cwd');
    const pkgPath = path.join(cwd, 'package.json');
    let testCommand = 'npm test'; // Default

    renderer.hint('[Test-Tools] Scanning for test runner...');

    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

            // Priority detection
            if (pkg.dependencies?.vitest || pkg.devDependencies?.vitest) testCommand = 'npx vitest run';
            else if (pkg.dependencies?.jest || pkg.devDependencies?.jest) testCommand = 'npx jest';
            else if (pkg.scripts?.test) testCommand = 'npm test';

        } catch (e) {
            renderer.error(`Failed to parse package.json: ${e.message}`);
        }
    }

    renderer.info(`[Test-Tools] Executing: ${testCommand}`);

    try {
        const output = execSync(testCommand, {
            cwd,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 30000 // 30s timeout
        });
        return { success: true, output, message: "Tests passed successfully." };
    } catch (e) {
        return {
            success: false,
            output: e.stdout + e.stderr,
            message: "Tests failed. Analyze the output for errors."
        };
    }
}

module.exports = {
    run_project_tests
};
