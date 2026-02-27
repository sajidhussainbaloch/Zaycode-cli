/**
 * core/reasoningEngine.js — PRO Reasoning & Consensus (v6.8 PRO)
 * 
 * Orchestrates multiple independent reasoning paths for complex problems
 * using a "Judge-Model" pattern to distill consensus and verify logic.
 */

'use strict';

const openrouter = require('../providers/openrouter');
const state = require('./state');
const renderer = require('../ui/renderer');

class ReasoningEngine {
    constructor() {
        this.numPaths = 3;
    }

    /**
     * Run multiple reasoning paths and aggregate the best result.
     */
    async aggregateReasoning(problem, context = []) {
        renderer.info(`[Reasoning-Engine] Spawning ${this.numPaths} independent reasoning paths...`);

        const pathPromises = [];
        for (let i = 0; i < this.numPaths; i++) {
            pathPromises.push(this._runSinglePath(problem, context, i + 1));
        }

        const paths = await Promise.all(pathPromises);

        renderer.info(`[Reasoning-Engine] Distilling logical consensus...`);
        return await this._distillConsensus(problem, paths);
    }

    async _runSinglePath(problem, context, id) {
        const messages = [
            {
                role: 'system',
                content: `You are an independent reasoning unit (#${id}). 
Solve the problem step-by-step. Be exhaustive and challenge your own assumptions.
DO NOT coordinate with other units.`
            },
            ...context,
            { role: 'user', content: problem }
        ];

        // Use the current active model or a strong fallback
        const model = state.prop('activeModel') || 'anthropic/claude-sonnet-4';

        const response = await openrouter.stream({
            model,
            messages,
            onDelta: () => { } // Silent for background paths
        });

        return response.text || "";
    }

    async _distillConsensus(problem, paths) {
        const aggregatorPrompt = `[LOGICAL CONSENSUS PROTOCOL]
Analyze the following ${paths.length} reasoning paths for the problem: "${problem}"

${paths.map((p, i) => `--- PATH ${i + 1} ---\n${p}`).join('\n\n')}

### Directives for Consensus:
1. **Identify Commonalities**: What conclusions do all paths share?
2. **Conflict Resolution**: If paths disagree, identify the logical pivot point.
3. **Fact-Check**: Verify if any path relies on incorrect assumptions.
4. **Final Synthesis**: Construct the most logically sound and comprehensive answer based on the majority consensus or the most superior reasoning path.

Output the final consensus answer now:`;

        const messages = [{ role: 'user', content: aggregatorPrompt }];

        const response = await openrouter.stream({
            model: state.prop('activeModel') || 'openai/gpt-4o',
            messages: messages,
            onDelta: (delta) => renderer.write(delta) // Stream the aggregation to UI
        });

        return response.text || "Failed to reach logical consensus.";
    }
}

const reasoningEngine = new ReasoningEngine();
module.exports = reasoningEngine;

