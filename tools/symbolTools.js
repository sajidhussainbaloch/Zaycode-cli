/**
 * tools/symbolTools.js — Code Intelligence Utilities
 * 
 * Provides fast code structure discovery without reading full files.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const state = require('../core/state');

/**
 * Extract an outline of a file (classes, functions, etc.)
 */
async function get_file_outline({ path: filePath }) {
    const resolved = path.resolve(state.prop('cwd'), filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(resolved, 'utf8');
    const lines = content.split('\n');
    const outline = [];

    // Simple regex-based symbol detection (JS/TS/Python/Go focused)
    const patterns = [
        // JavaScript / TypeScript / Go
        { type: 'class', regex: /^(?:export\s+)?class\s+(\w+)/ },
        { type: 'function', regex: /^(?:async\s+)?function\s+(\w+)/ },
        { type: 'method', regex: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/ },
        { type: 'const-function', regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w]+)\s*=>/ },

        // Python
        { type: 'py-class', regex: /^class\s+(\w+)/ },
        { type: 'py-def', regex: /^def\s+(\w+)/ },

        // Rust / Go
        { type: 'fn', regex: /^fn\s+(\w+)/ },
        { type: 'func', regex: /^func\s+(\w+)/ }
    ];

    lines.forEach((line, idx) => {
        for (const p of patterns) {
            const match = line.match(p.regex);
            if (match) {
                outline.push({
                    type: p.type,
                    name: match[1],
                    line: idx + 1,
                    text: line.trim()
                });
                break;
            }
        }
    });

    return {
        path: filePath,
        symbols: outline,
        totalLines: lines.length,
        summary: `Found ${outline.length} symbols in ${filePath}`
    };
}

module.exports = { get_file_outline };
