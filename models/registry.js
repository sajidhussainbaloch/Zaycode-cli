/**
 * models/registry.js — Complete Model Registry
 * 
 * All model IDs verified against the live OpenRouter API.
 * Last updated: 2026-02-22
 */

'use strict';

const MODELS = [
    // ─────────── OpenAI ───────────
    { id: 'openai/gpt-4o', provider: 'openai', name: 'GPT-4o', context: 128000, tools: true },
    { id: 'openai/gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', context: 128000, tools: true },
    { id: 'openai/gpt-4.1', provider: 'openai', name: 'GPT-4.1', context: 1047576, tools: true },
    { id: 'openai/gpt-4.1-mini', provider: 'openai', name: 'GPT-4.1 Mini', context: 1047576, tools: true },
    { id: 'openai/gpt-4.1-nano', provider: 'openai', name: 'GPT-4.1 Nano', context: 1047576, tools: true },
    { id: 'openai/gpt-5', provider: 'openai', name: 'GPT-5', context: 400000, tools: true },
    { id: 'openai/gpt-5-mini', provider: 'openai', name: 'GPT-5 Mini', context: 400000, tools: true },
    { id: 'openai/o4-mini', provider: 'openai', name: 'o4 Mini', context: 200000, tools: true },
    { id: 'openai/o3', provider: 'openai', name: 'o3', context: 200000, tools: true },
    { id: 'openai/o3-mini', provider: 'openai', name: 'o3 Mini', context: 200000, tools: true },

    // ─────────── Anthropic ───────────
    { id: 'anthropic/claude-sonnet-4.6', provider: 'anthropic', name: 'Claude Sonnet 4.6', context: 1000000, tools: true },
    { id: 'anthropic/claude-sonnet-4.5', provider: 'anthropic', name: 'Claude Sonnet 4.5', context: 1000000, tools: true },
    { id: 'anthropic/claude-sonnet-4', provider: 'anthropic', name: 'Claude Sonnet 4', context: 1000000, tools: true },
    { id: 'anthropic/claude-opus-4.6', provider: 'anthropic', name: 'Claude Opus 4.6', context: 1000000, tools: true },
    { id: 'anthropic/claude-opus-4.5', provider: 'anthropic', name: 'Claude Opus 4.5', context: 200000, tools: true },
    { id: 'anthropic/claude-haiku-4.5', provider: 'anthropic', name: 'Claude Haiku 4.5', context: 200000, tools: true },
    { id: 'anthropic/claude-3.7-sonnet', provider: 'anthropic', name: 'Claude 3.7 Sonnet', context: 200000, tools: true },
    { id: 'anthropic/claude-3.5-sonnet', provider: 'anthropic', name: 'Claude 3.5 Sonnet', context: 200000, tools: true },
    { id: 'anthropic/claude-3.5-haiku', provider: 'anthropic', name: 'Claude 3.5 Haiku', context: 200000, tools: true },

    // ─────────── Google ───────────
    { id: 'google/gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', context: 1048576, tools: true, free: true },
    { id: 'google/gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash', context: 1048576, tools: true, free: true },
    { id: 'google/gemini-2.5-flash-lite', provider: 'google', name: 'Gemini 2.5 Flash Lite', context: 1048576, tools: true, free: true },
    { id: 'google/gemini-2.0-flash-001', provider: 'google', name: 'Gemini 2.0 Flash', context: 1048576, tools: true, free: true },
    { id: 'google/gemini-3-flash-preview', provider: 'google', name: 'Gemini 3 Flash Preview', context: 1048576, tools: true },
    { id: 'google/gemini-3-pro-preview', provider: 'google', name: 'Gemini 3 Pro Preview', context: 1048576, tools: true },

    // ─────────── DeepSeek ───────────
    { id: 'deepseek/deepseek-chat', provider: 'deepseek', name: 'DeepSeek V3', context: 163840, tools: true },
    { id: 'deepseek/deepseek-chat-v3-0324', provider: 'deepseek', name: 'DeepSeek V3 (March)', context: 163840, tools: true },
    { id: 'deepseek/deepseek-v3.1-terminus', provider: 'deepseek', name: 'DeepSeek V3.1 Terminus', context: 163840, tools: true },
    { id: 'deepseek/deepseek-v3.2', provider: 'deepseek', name: 'DeepSeek V3.2', context: 163840, tools: true },
    { id: 'deepseek/deepseek-r1', provider: 'deepseek', name: 'DeepSeek R1', context: 64000, tools: false },
    { id: 'deepseek/deepseek-r1-0528', provider: 'deepseek', name: 'DeepSeek R1 (May)', context: 163840, tools: false },
    { id: 'deepseek/deepseek-r1-0528:free', provider: 'deepseek', name: 'DeepSeek R1 (Free)', context: 163840, tools: false, free: true },

    // ─────────── Meta (Llama) ───────────
    { id: 'meta-llama/llama-4-maverick', provider: 'meta', name: 'Llama 4 Maverick', context: 1048576, tools: true },
    { id: 'meta-llama/llama-4-scout', provider: 'meta', name: 'Llama 4 Scout', context: 327680, tools: true },
    { id: 'meta-llama/llama-3.3-70b-instruct', provider: 'meta', name: 'Llama 3.3 70B', context: 131072, tools: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'meta', name: 'Llama 3.3 70B (Free)', context: 128000, tools: true, free: true },
    { id: 'meta-llama/llama-3.1-405b-instruct', provider: 'meta', name: 'Llama 3.1 405B', context: 131000, tools: true },
    { id: 'meta-llama/llama-3.1-70b-instruct', provider: 'meta', name: 'Llama 3.1 70B', context: 131072, tools: true },

    // ─────────── Mistral ───────────
    { id: 'mistralai/mistral-large-2512', provider: 'mistral', name: 'Mistral Large (Latest)', context: 262144, tools: true },
    { id: 'mistralai/mistral-medium-3.1', provider: 'mistral', name: 'Mistral Medium 3.1', context: 131072, tools: true },
    { id: 'mistralai/mistral-small-3.1-24b-instruct', provider: 'mistral', name: 'Mistral Small 3.1', context: 128000, tools: true },
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free', provider: 'mistral', name: 'Mistral Small 3.1 (Free)', context: 128000, tools: true, free: true },
    { id: 'mistralai/codestral-2508', provider: 'mistral', name: 'Codestral', context: 256000, tools: true },
    { id: 'mistralai/devstral-medium', provider: 'mistral', name: 'Devstral Medium', context: 131072, tools: true },
    { id: 'mistralai/devstral-small', provider: 'mistral', name: 'Devstral Small', context: 131072, tools: true },

    // ─────────── Qwen ───────────
    { id: 'qwen/qwen3-coder', provider: 'qwen', name: 'Qwen3 Coder', context: 262144, tools: true },
    { id: 'qwen/qwen3-coder-plus', provider: 'qwen', name: 'Qwen3 Coder Plus', context: 1000000, tools: true },
    { id: 'qwen/qwen3-coder:free', provider: 'qwen', name: 'Qwen3 Coder (Free)', context: 262000, tools: true, free: true },
    { id: 'qwen/qwen3-max', provider: 'qwen', name: 'Qwen3 Max', context: 262144, tools: true },
    { id: 'qwen/qwen3-235b-a22b', provider: 'qwen', name: 'Qwen3 235B', context: 131072, tools: true },
    { id: 'qwen/qwen3-32b', provider: 'qwen', name: 'Qwen3 32B', context: 40960, tools: true },
    { id: 'qwen/qwen-plus', provider: 'qwen', name: 'Qwen Plus', context: 1000000, tools: true },
    { id: 'qwen/qwq-32b', provider: 'qwen', name: 'QwQ 32B (Reasoning)', context: 32768, tools: false },

    // ─────────── xAI (Grok) ───────────
    { id: 'x-ai/grok-4', provider: 'xai', name: 'Grok 4', context: 256000, tools: true },
    { id: 'x-ai/grok-4-fast', provider: 'xai', name: 'Grok 4 Fast', context: 2000000, tools: true },
    { id: 'x-ai/grok-3', provider: 'xai', name: 'Grok 3', context: 131072, tools: true },
    { id: 'x-ai/grok-3-mini', provider: 'xai', name: 'Grok 3 Mini', context: 131072, tools: true },
    { id: 'x-ai/grok-code-fast-1', provider: 'xai', name: 'Grok Code Fast', context: 256000, tools: true },
];

/** Get all models */
function getAll() {
    return MODELS.map(m => ({ ...m }));
}

/** Find a model by exact ID */
function findById(id) {
    return MODELS.find(m => m.id === id) || null;
}

/** Find a model by partial name match (case-insensitive) */
function search(query) {
    const q = query.toLowerCase();
    return MODELS.filter(m =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
    );
}

/** Resolve a user-provided model string to a full model ID */
function resolve(input) {
    if (!input) return null;
    const lower = input.toLowerCase().trim();

    // Exact match
    const exact = MODELS.find(m => m.id.toLowerCase() === lower);
    if (exact) return exact.id;

    // Partial match on ID
    const partial = MODELS.find(m => m.id.toLowerCase().includes(lower));
    if (partial) return partial.id;

    // Partial match on name
    const byName = MODELS.find(m => m.name.toLowerCase().includes(lower));
    if (byName) return byName.id;

    // Pass through as-is (could be an unlisted model)
    return input;
}

/** Get all models for a provider */
function getByProvider(provider) {
    return MODELS.filter(m => m.provider === provider.toLowerCase());
}

/** Get all unique provider names */
function getProviders() {
    return [...new Set(MODELS.map(m => m.provider))];
}

module.exports = { getAll, findById, search, resolve, getByProvider, getProviders };
