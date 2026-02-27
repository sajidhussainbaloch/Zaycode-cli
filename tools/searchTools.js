/**
 * tools/searchTools.js — Project Search
 * 
 * Content search (grep-like) and file search (glob-like).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const state = require('../core/state');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage', '.cache']);
const CODE_EXTENSIONS = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
    '.go', '.rs', '.rb', '.php', '.html', '.css', '.scss', '.json',
    '.md', '.yaml', '.yml', '.toml', '.xml', '.sql', '.sh', '.bat',
    '.env', '.gitignore', '.dockerfile',
]);
const MAX_RESULTS = 50;
const MAX_LINE_LEN = 200;

/**
 * Search file contents for a pattern (like grep)
 */
async function search_project({ query, path: searchPath }) {
    const root = searchPath
        ? path.resolve(state.prop('cwd'), searchPath)
        : state.prop('cwd');

    if (!fs.existsSync(root)) {
        throw new Error(`Path not found: ${searchPath || '.'}`);
    }

    const results = [];
    const regex = new RegExp(escapeRegex(query), 'gi');

    function walk(dir) {
        if (results.length >= MAX_RESULTS) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (results.length >= MAX_RESULTS) break;
            if (SKIP_DIRS.has(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
                        if (regex.test(lines[i])) {
                            regex.lastIndex = 0; // reset regex state
                            results.push({
                                file: path.relative(state.prop('cwd'), fullPath),
                                line: i + 1,
                                content: lines[i].slice(0, MAX_LINE_LEN),
                            });
                        }
                    }
                } catch {
                    // Skip unreadable files
                }
            }
        }
    }

    walk(root);
    return {
        query,
        total: results.length,
        truncated: results.length >= MAX_RESULTS,
        results,
    };
}

/**
 * Find files by name pattern (simple glob matching)
 */
async function search_files({ pattern, path: searchPath }) {
    const root = searchPath
        ? path.resolve(state.prop('cwd'), searchPath)
        : state.prop('cwd');

    if (!fs.existsSync(root)) {
        throw new Error(`Path not found: ${searchPath || '.'}`);
    }

    const results = [];
    const globRegex = globToRegex(pattern);

    function walk(dir) {
        if (results.length >= MAX_RESULTS) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (results.length >= MAX_RESULTS) break;
            if (SKIP_DIRS.has(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(state.prop('cwd'), fullPath);

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (globRegex.test(entry.name) || globRegex.test(relPath)) {
                const stat = fs.statSync(fullPath);
                results.push({
                    file: relPath,
                    size: stat.size,
                });
            }
        }
    }

    walk(root);
    return {
        pattern,
        total: results.length,
        results,
    };
}

/** Escape special regex characters */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convert a simple glob pattern to regex */
function globToRegex(glob) {
    const escaped = glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(escaped, 'i');
}

const vectorStorage = require('../core/vectorStorage');

async function semantic_search({ query }) {
    const results = vectorStorage.search(query);
    return {
        success: true,
        results: results.map(r => ({ path: r.path, score: r.score, preview: r.summary })),
        message: results.length ? `Found ${results.length} semantic matches.` : "No semantic matches found."
    };
}

module.exports = {
    search_project,
    search_files,
    semantic_search
};
