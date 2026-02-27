/**
 * tools/fileTools.js — File System Operations
 * 
 * Real file system mutations — read, write, edit, create, delete, list.
 * All paths are resolved against the current working directory.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const state = require('../core/state');

function _resolve(p) {
    return path.resolve(state.prop('cwd'), p);
}

/** Read a file's contents */
async function read_file({ path: filePath }) {
    const resolved = _resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
        throw new Error(`Path is a directory, not a file: ${filePath}`);
    }
    const content = fs.readFileSync(resolved, 'utf8');
    return {
        path: filePath,
        size: stat.size,
        content,
    };
}

/** Write content to a file (creates or overwrites) */
async function write_file({ path: filePath, content }) {
    if (typeof content !== 'string') {
        const type = Array.isArray(content) ? 'array' : typeof content;
        throw new Error(`Invalid content type: ${type}. The 'content' parameter MUST be a raw string of text/source code. Do not send arrays or objects.`);
    }

    const resolved = _resolve(filePath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolved, content, 'utf8');
    const stat = fs.statSync(resolved);
    return {
        path: filePath,
        size: stat.size,
        message: `File written successfully: ${filePath} (${stat.size} bytes)`,
    };
}

/** Edit a file with one or more replacement chunks */
async function edit_file({ path: filePath, chunks }) {
    const resolved = _resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Support legacy single-chunk format for backward compatibility
    if (!chunks && arguments[0].search !== undefined) {
        chunks = [{ search: arguments[0].search, replace: arguments[0].replace }];
    }

    if (!Array.isArray(chunks) || chunks.length === 0) {
        throw new Error("No replacement chunks provided for edit_file.");
    }

    let content = fs.readFileSync(resolved, 'utf8');
    let modified = false;

    for (const chunk of chunks) {
        if (!content.includes(chunk.search)) {
            throw new Error(`Search text not found in ${filePath}: "${chunk.search.substring(0, 50)}..."`);
        }
        content = content.replace(chunk.search, chunk.replace);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(resolved, content, 'utf8');
    }

    return {
        path: filePath,
        message: `File edited successfully with ${chunks.length} chunks: ${filePath}`,
    };
}

/** Create a new file (fails if it already exists) */
async function create_file({ path: filePath, content }) {
    if (content !== undefined && typeof content !== 'string') {
        const type = Array.isArray(content) ? 'array' : typeof content;
        throw new Error(`Invalid content type: ${type}. The 'content' parameter MUST be a raw string of text/source code.`);
    }

    const resolved = _resolve(filePath);
    if (fs.existsSync(resolved)) {
        throw new Error(`File already exists: ${filePath}. Use write_file to overwrite.`);
    }
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolved, content || '', 'utf8');
    return {
        path: filePath,
        message: `File created: ${filePath}`,
    };
}

/** Delete a file */
async function delete_file({ path: filePath }) {
    const resolved = _resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${filePath}`);
    }
    fs.unlinkSync(resolved);
    return {
        path: filePath,
        message: `File deleted: ${filePath}`,
    };
}

/** List files in a directory */
async function list_files({ path: dirPath, recursive = false }) {
    const resolved = _resolve(dirPath || '.');
    if (!fs.existsSync(resolved)) {
        throw new Error(`Directory not found: ${dirPath}`);
    }

    const results = [];
    const skip = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage']);

    function walk(dir, depth) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (skip.has(entry.name)) continue;
            const rel = path.relative(resolved, path.join(dir, entry.name));
            const type = entry.isDirectory() ? 'directory' : 'file';

            if (entry.isDirectory()) {
                results.push({ name: rel + '/', type });
                if (recursive && depth < 5) {
                    walk(path.join(dir, entry.name), depth + 1);
                }
            } else {
                const stat = fs.statSync(path.join(dir, entry.name));
                results.push({ name: rel, type, size: stat.size });
            }
        }
    }

    walk(resolved, 0);
    return { path: dirPath || '.', files: results };
}

module.exports = { read_file, write_file, edit_file, create_file, delete_file, list_files };
