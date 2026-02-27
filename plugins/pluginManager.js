/**
 * plugins/pluginManager.js — Dynamic Plugin Loader
 * 
 * Scans the plugins directory for .js files and auto-registers them.
 * Each plugin exports: { name, tools, onLoad, onBeforeModelCall, onAfterModelCall }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const executor = require('../core/executor');

const plugins = [];
const hooks = {
    beforeModelCall: [],
    afterModelCall: [],
};

/**
 * Load all plugins from the plugins directory.
 * Plugins are .js files (excluding pluginManager.js itself).
 */
function loadPlugins() {
    const pluginsDir = path.join(__dirname);

    let entries;
    try {
        entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    } catch {
        return; // No plugins directory
    }

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name === 'pluginManager.js') continue;
        if (!entry.name.endsWith('.js')) continue;

        try {
            const pluginPath = path.join(pluginsDir, entry.name);
            const plugin = require(pluginPath);

            if (!plugin.name) {
                console.warn(`Plugin '${entry.name}' missing 'name' export, skipping.`);
                continue;
            }

            // Register tools
            if (plugin.tools && typeof plugin.tools === 'object') {
                for (const [toolName, handler] of Object.entries(plugin.tools)) {
                    executor.registerTool(toolName, handler);
                }
            }

            // Register hooks
            if (typeof plugin.onBeforeModelCall === 'function') {
                hooks.beforeModelCall.push(plugin.onBeforeModelCall);
            }
            if (typeof plugin.onAfterModelCall === 'function') {
                hooks.afterModelCall.push(plugin.onAfterModelCall);
            }

            // Call onLoad
            if (typeof plugin.onLoad === 'function') {
                plugin.onLoad();
            }

            plugins.push(plugin);
        } catch (err) {
            console.warn(`Failed to load plugin '${entry.name}': ${err.message}`);
        }
    }
}

/** Get loaded plugin count */
function getCount() {
    return plugins.length;
}

/** Run before-model-call hooks */
async function runBeforeHooks(params) {
    for (const hook of hooks.beforeModelCall) {
        try {
            await hook(params);
        } catch {
            // Don't let plugin errors crash the main flow
        }
    }
}

/** Run after-model-call hooks */
async function runAfterHooks(params) {
    for (const hook of hooks.afterModelCall) {
        try {
            await hook(params);
        } catch {
            // Don't let plugin errors crash the main flow
        }
    }
}

module.exports = { loadPlugins, getCount, runBeforeHooks, runAfterHooks };
