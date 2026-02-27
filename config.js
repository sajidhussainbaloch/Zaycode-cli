/**
 * config.js — Configuration Loader
 * 
 * Reads .env, validates required keys, exposes typed config.
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load .env from the package directory (works with global installs)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const cm = require('./core/configManager');

module.exports = {
    /** OpenRouter API key overrides env */
    get apiKey() { return cm.getActiveKey() || process.env.OPENROUTER_API_KEY || ''; },

    /** Default provider */
    get defaultProvider() { return cm.get().activeProvider || process.env.ZAYCODE_PROVIDER || 'openrouter'; },

    /** Default mode */
    get defaultMode() { return (cm.get().defaults && cm.get().defaults.mode) ? cm.get().defaults.mode : (process.env.ZAYCODE_MODE || 'auto'); },

    /** Max agent iterations */
    get maxIterations() { return parseInt(process.env.ZAYCODE_MAX_ITERATIONS, 10) || 20; },

    /** Request timeout in ms */
    get timeout() { return parseInt(process.env.ZAYCODE_TIMEOUT, 10) || 120000; },

    /** Sandbox mode (disables destructive operations) */
    get sandbox() { return process.env.ZAYCODE_SANDBOX === 'true'; },

    /**
     * Validate required configuration
     * @returns {string|null} Error message or null if valid
     */
    validate() {
        if (!this.apiKey) {
            return 'API_KEY_MISSING';
        }
        return null;
    }
};
