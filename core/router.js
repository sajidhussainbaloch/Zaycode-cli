/**
 * core/router.js — Intent-Based Model Router (v6.8 PRO)
 * 
 * Classifies user prompts into modes and selects appropriate models.
 * Professional implementation uses phrase-based matching and intent weighting.
 */

'use strict';

const state = require('./state');
const defaults = require('../models/defaults');

// Intent classification with phrase support and weights
const INTENTS = [
    {
        mode: 'debug',
        keywords: ['debug', 'error', 'bug', 'fix', 'crash', 'exception', 'stack trace', 'broken', 'runtime error', 'segfault', 'undefined'],
        phrases: ['not working', 'fix this bug', 'why is this broken', 'line number'],
        weight: 1.5,
    },
    {
        mode: 'optimize',
        keywords: ['optimize', 'performance', 'slow', 'fast', 'complexity', 'bottleneck', 'big o', 'latency', 'efficient'],
        phrases: ['make it faster', 'run better', 'speed up'],
        weight: 1.4,
    },
    {
        mode: 'data',
        keywords: ['data', 'analysis', 'stats', 'csv', 'json', 'explore', 'clean', 'visualize', 'graph', 'plot', 'statistic'],
        phrases: ['analyze this data', 'summarize the statistics'],
        weight: 1.3,
    },
    {
        mode: 'plan',
        keywords: ['plan', 'architect', 'roadmap', 'outline', 'strategy', 'structure', 'organize', 'architecture'],
        phrases: ['how should i', 'best approach', 'design a system', 'module structure', 'breakdown the steps'],
        weight: 1.3,
    },
    {
        mode: 'reason',
        keywords: ['explain', 'why', 'compare', 'analyze', 'understand', 'logic', 'tradeoff', 'consequence'],
        phrases: ['difference between', 'pros and cons', 'what happens if', 'how does this work'],
        weight: 1.2,
    },
    {
        mode: 'code',
        keywords: ['write', 'create', 'build', 'implement', 'code', 'function', 'class', 'refactor', 'component', 'api'],
        phrases: ['add a feature', 'new module', 'generate a test', 'write a function'],
        weight: 1.0,
    }
];

/**
 * Classify a user prompt into a mode.
 */
function classifyIntent(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Very short prompts usually lean toward reasoning/explaining
    if (lowerPrompt.split(/\s+/).length < 6) {
        const isCodeAsking = INTENTS.find(i => i.mode === 'code').keywords.some(k => lowerPrompt.includes(k));
        if (!isCodeAsking) return 'reason';
    }

    let scores = { debug: 0, plan: 0, reason: 0, code: 0, data: 0, optimize: 0 };
    let hasMatch = false;

    for (const intent of INTENTS) {
        // Check keywords (single words)
        for (const keyword of intent.keywords) {
            const regex = new RegExp(`\\b${keyword.replace(/ /g, '\\s+')}\\b`, 'i');
            if (regex.test(prompt)) {
                scores[intent.mode] += intent.weight;
                hasMatch = true;
            }
        }
        // Check phrases (multi-word)
        if (intent.phrases) {
            for (const phrase of intent.phrases) {
                if (lowerPrompt.includes(phrase)) {
                    scores[intent.mode] += intent.weight * 1.5; // Phrases carry more weight
                    hasMatch = true;
                }
            }
        }
    }

    if (!hasMatch) return 'reason'; // Default to reasoning

    // Find the highest score
    let bestMode = 'code';
    let maxScore = -1;
    for (const [mode, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestMode = mode;
        }
    }

    return bestMode;
}

/**
 * Route a prompt to the appropriate model.
 */
function route(prompt) {
    const s = state.get();

    // If manual override is active, use the locked model
    if (s.manualOverride && s.activeModel) {
        return {
            model: s.activeModel,
            mode: s.mode,
            routed: false,
        };
    }

    // If a specific non-auto mode is set
    if (s.mode !== 'auto') {
        const model = defaults.getDefaultModel(s.mode);
        return {
            model,
            mode: s.mode,
            routed: false,
        };
    }

    // Auto mode: classify intent and pick model
    const detectedMode = classifyIntent(prompt);
    const model = defaults.getDefaultModel(detectedMode);

    return {
        model,
        mode: detectedMode,
        routed: true,
    };
}

module.exports = { route, classifyIntent };

