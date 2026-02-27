/**
 * models/defaults.js — Mode-to-Model Defaults
 * 
 * Maps each operating mode to its default model.
 * All IDs verified against live OpenRouter API.
 */

'use strict';

const MODE_DEFAULTS = {
    auto: 'openai/gpt-4.1-mini',
    code: 'qwen/qwen3-coder',
    reason: 'deepseek/deepseek-chat',
    debug: 'openai/gpt-4.1-mini',
    plan: 'anthropic/claude-sonnet-4',
};

/** Get the default model for a mode */
function getDefaultModel(mode) {
    return MODE_DEFAULTS[mode] || MODE_DEFAULTS.auto;
}

/** Get all mode defaults */
function getAll() {
    return { ...MODE_DEFAULTS };
}

/** Get available mode names */
function getModes() {
    return Object.keys(MODE_DEFAULTS);
}

module.exports = { getDefaultModel, getAll, getModes };
