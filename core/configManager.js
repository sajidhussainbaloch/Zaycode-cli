/**
 * core/configManager.js
 * Handles reading and writing global configuration from ~/.zaycode/config.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.zaycode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    providers: {
        openrouter: {
            apiKey: '',
            baseUrl: 'https://openrouter.ai/api/v1/chat/completions'
        }
    },
    activeProvider: 'openrouter',
    defaults: {
        model: 'auto',
        mode: 'auto',
        temperature: 0.2
    },
    system: {
        verbose: false,
        saveHistory: true
    }
};

class ConfigManager {
    constructor() {
        this._config = null;
    }

    /**
     * Ensure the config directory exists
     */
    _ensureDir() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
    }

    /**
     * Load configuration from disk, creating defaults if missing
     */
    load() {
        this._ensureDir();

        if (!fs.existsSync(CONFIG_FILE)) {
            this._config = { ...DEFAULT_CONFIG };
            this.save();
        } else {
            try {
                const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                // Merge with defaults to ensure new fields are populated
                this._config = this._deepMerge({ ...DEFAULT_CONFIG }, parsed);
            } catch (err) {
                // If the file is corrupt, backup the old one and create a new one
                if (fs.existsSync(CONFIG_FILE)) {
                    fs.renameSync(CONFIG_FILE, `${CONFIG_FILE}.bak`);
                }
                this._config = { ...DEFAULT_CONFIG };
                this.save();
            }
        }
        return this._config;
    }

    /**
     * Save current config state to disk
     */
    save() {
        if (!this._config) return;
        this._ensureDir();
        // Use 4-space indent for readable user editing
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(this._config, null, 4), 'utf8');
    }

    /**
     * Retrieve the current loaded config object
     */
    get() {
        if (!this._config) {
            return this.load();
        }
        return this._config;
    }

    /**
     * Update a specific section of the config
     * @param {string} section Top-level key (e.g., 'defaults', 'providers')
     * @param {object} updates Object containing values to merge
     */
    update(section, updates) {
        if (!this._config) this.load();

        if (this._config[section]) {
            if (typeof updates === 'object' && !Array.isArray(updates)) {
                this._config[section] = { ...this._config[section], ...updates };
            } else {
                this._config[section] = updates;
            }
        } else {
            this._config[section] = updates;
        }
        this.save();
    }

    /**
     * Retrieve current API Key for the active provider
     */
    getActiveKey() {
        const conf = this.get();
        const active = conf.activeProvider;
        if (!active || !conf.providers[active]) return null;
        return conf.providers[active].apiKey || null;
    }

    /**
     * Set API Key for a given provider
     */
    setKey(provider, key) {
        if (!this._config) this.load();
        if (!this._config.providers[provider]) {
            this._config.providers[provider] = {};
        }
        this._config.providers[provider].apiKey = key;
        this.save();
    }

    /**
     * Helper to deeply merge two objects safely
     */
    _deepMerge(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], this._deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }
}

// Export a singleton
module.exports = new ConfigManager();
