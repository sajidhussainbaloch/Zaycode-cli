/**
 * tools/diffTools.js — Precision Diff Engine
 * 
 * Implements SEARCH/REPLACE blocks for surgical file edits.
 * Inspired by Cline and Claude-Code.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const state = require('../core/state');

/**
 * Apply a series of SEARCH/REPLACE blocks to a file.
 * 
 * Format for diff:
 * <<<<<<< SEARCH
 * [exact content to find]
 * =======
 * [new content to replace with]
 * >>>>>>> REPLACE
 */
async function apply_diff({ path: filePath, diff }) {
    const resolved = path.resolve(state.prop('cwd'), filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${filePath}`);
    }

    let content = fs.readFileSync(resolved, 'utf8');
    const blocks = _parseDiffBlocks(diff);

    if (blocks.length === 0) {
        throw new Error("No valid SEARCH/REPLACE blocks found in diff.");
    }

    for (const block of blocks) {
        // Character-for-character match including whitespace
        if (!content.includes(block.search)) {
            // Provide a helpful error with potential mismatch location
            throw new Error(`SEARCH block mismatch in ${filePath}. Ensure characters and whitespace match exactly.`);
        }
        content = content.replace(block.search, block.replace);
    }

    fs.writeFileSync(resolved, content, 'utf8');

    return {
        path: filePath,
        message: `Successfully applied ${blocks.length} diff block(s) to ${filePath}.`,
    };
}

/**
 * Internal parser for Cline-style diff blocks
 */
function _parseDiffBlocks(diffText) {
    const blocks = [];
    const blockRegex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
    let match;

    while ((match = blockRegex.exec(diffText)) !== null) {
        blocks.push({
            search: match[1],
            replace: match[2]
        });
    }

    return blocks;
}

module.exports = { apply_diff };
