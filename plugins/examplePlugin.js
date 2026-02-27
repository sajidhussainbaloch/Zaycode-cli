/**
 * plugins/examplePlugin.js
 * 
 * An example ZayCode plugin that adds a new 'calculate_sum' tool.
 */

'use strict';

module.exports = {
    name: 'Example Plugin',

    // Define new tools this plugin provides
    tools: {
        'calculate_sum': async ({ a, b }) => {
            const sum = Number(a) + Number(b);
            return { sum, message: `The sum of ${a} and ${b} is ${sum}` };
        }
    },

    // Lifecycle hook: Called once when ZayCode starts
    onLoad: () => {
        // console.log('  [Plugin] Example Plugin loaded!');
    },

    // Hook: Can modify params before sending to the LLM
    onBeforeModelCall: async (params) => {
        // console.log('  [Plugin] Preparing for model call...');
    },

    // Hook: Can process results after the model responds
    onAfterModelCall: async (result) => {
        // console.log('  [Plugin] Model response received.');
    }
};
