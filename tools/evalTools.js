/**
 * tools/evalTools.js — Prompt Evaluation & LLM-as-a-judge
 * 
 * Allows the agent (or user) to score prompt variants against 
 * criteria like clarity, specificity, and relevance.
 */

'use strict';

const openrouter = require('../providers/openrouter');
const state = require('../core/state');

/**
 * Score a prompt based on specific criteria.
 * @param {object} args - { promptToEval, taskContext, criteria }
 */
async function evaluate_prompt({ promptToEval, taskContext = '', criteria = ['clarity', 'specificity', 'relevance'] }) {
    const evalPrompt = `You are a professional Prompt Engineer. Evaluate the following prompt candidate based on the provided criteria.

### PROMPT TO EVALUATE:
"${promptToEval}"

### TASK CONTEXT:
${taskContext}

### EVALUATION CRITERIA:
${criteria.join(', ')}

### INSTRUCTIONS:
1. Provide a score from 1-10 for EACH criterion.
2. Provide a single line of critical feedback for improvement.
3. Calculate an overall average score.

Format your response as a JSON object:
{
  "scores": { "criterion": score },
  "feedback": "...",
  "average": 8.5
}`;

    const messages = [{ role: 'user', content: evalPrompt }];

    try {
        const response = await openrouter.stream({
            model: 'meta-llama/llama-3.3-70b-instruct:free', // Use a smart but free model for high-frequency eval
            messages: messages,
            onDelta: () => { }
        });

        const result = JSON.parse(response.text);
        return {
            success: true,
            result,
            message: `Evaluation complete. Average Score: ${result.average}`
        };
    } catch (err) {
        return {
            success: false,
            error: `Evaluation failed: ${err.message}`
        };
    }
}

module.exports = { evaluate_prompt };
