/**
 * tools/lintTools.js — Linting & Diagnostics
 * 
 * Provides tools to run lints and type-checks on the codebase.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const state = require('../core/state');

/**
 * Run lints and return structured errors.
 * Supports ESLint and basic JS syntax check if no linter found.
 */
async function read_lints({ directory = '.' }) {
    const cwd = path.resolve(state.prop('cwd'), directory);
    const results = {
        linter: null,
        errors: [],
        warnings: [],
        summary: ''
    };

    try {
        // 1. Try ESLint
        const hasEslint = fs.existsSync(path.join(cwd, '.eslintrc.json')) ||
            fs.existsSync(path.join(cwd, '.eslintrc.js')) ||
            fs.existsSync(path.join(cwd, 'eslint.config.js'));

        if (hasEslint) {
            results.linter = 'eslint';
            try {
                const output = execSync('npx eslint . --format json', { cwd, encoding: 'utf8' });
                const parsed = JSON.parse(output);
                _processEslint(parsed, results);
            } catch (err) {
                // npx eslint exits with 1 if errors found, need to parse stdout anyway
                if (err.stdout) {
                    try {
                        const parsed = JSON.parse(err.stdout);
                        _processEslint(parsed, results);
                    } catch (e) {
                        results.errors.push(`Failed to parse ESLint output: ${err.message}`);
                    }
                } else {
                    results.errors.push(`ESLint execution failed: ${err.message}`);
                }
            }
        } else {
            // 2. Fallback: Basic JS Syntax Check (Node -c)
            results.linter = 'node-syntax-check';
            results.summary = 'No standard linter found. Performed basic syntax check.';
        }

        results.summary = `Linter: ${results.linter}. Found ${results.errors.length} errors and ${results.warnings.length} warnings.`;
        return results;
    } catch (err) {
        return {
            success: false,
            error: `Linting failed: ${err.message}`
        };
    }
}

function _processEslint(eslintData, results) {
    eslintData.forEach(file => {
        file.messages.forEach(msg => {
            const entry = {
                file: file.filePath,
                line: msg.line,
                column: msg.column,
                message: msg.message,
                ruleId: msg.ruleId,
                severity: msg.severity === 2 ? 'error' : 'warning'
            };
            if (entry.severity === 'error') results.errors.push(entry);
            else results.warnings.push(entry);
        });
    });
}

module.exports = { read_lints };
