/**
 * tools/promptTools.js — Advanced Prompt Excellence Tools (v6.9)
 * 
 * Implements patterns found in the OpenWebUI Prompt Library:
 * - Tech Documentation Generation
 * - Prompt Extraction
 * - Session Consolidation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const renderer = require('../ui/renderer');
const openrouter = require('../providers/openrouter');
const state = require('../core/state');

/**
 * Generate a technical documentation guide based on a successful debug session
 */
async function generate_tech_docs({ history }) {
    renderer.info('[Prompt-Tool] Generating technical documentation...');

    const prompt = `Thanks for successfully troubleshooting my issue. I would like to create documentation of this so that I can resolve this independently if it happens again. 

Please generate a summary of this interaction. 
- Include the presenting problem.
- Include what successfully resolved the issue. 
- Omit any unsuccessful things that we tried. 
- Add today's date (${new Date().toLocaleDateString()}).
- Ensure code is provided in markdown codefences.
- Generate the final document in clean markdown.

Conversation History:
${JSON.stringify(history)}`;

    const response = await openrouter.stream({
        model: state.prop('activeModel') || 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: prompt }],
        onDelta: (delta) => renderer.write(delta) // Stream to UI
    });

    return { success: true, doc: response.text, message: "Technical documentation generated." };
}

/**
 * Extract only user prompts from the current history
 */
async function extract_session_prompts({ history }) {
    const userPrompts = history.filter(m => m.role === 'user');
    let output = "# Initial Prompt\n\n";

    userPrompts.forEach((p, i) => {
        if (i === 0) {
            output += p.content + "\n\n";
        } else {
            output += `# Follow Up ${i}\n\n${p.content}\n\n`;
        }
    });

    return { success: true, report: output, message: "User prompts extracted." };
}

/**
 * Consolidate all session outputs into a single subject-headered summary
 */
async function consolidate_session({ history }) {
    renderer.info('[Prompt-Tool] Consolidating session outputs...');

    const prompt = `Produce a new output which consolidates all of the outputs provided in this conversation up to this point. 
Do not repeat information. 
Preface this consolidated output with a header that encapsulates the primary subject of our discussion today.

Conversation History:
${JSON.stringify(history)}`;

    const response = await openrouter.stream({
        model: state.prop('activeModel') || 'openai/gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        onDelta: (delta) => renderer.write(delta)
    });

    return { success: true, consolidation: response.text, message: "Session consolidated." };
}

module.exports = {
    generate_tech_docs,
    extract_session_prompts,
    consolidate_session
};
