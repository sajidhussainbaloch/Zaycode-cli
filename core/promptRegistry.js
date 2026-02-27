/**
 * core/promptRegistry.js — Versioned Prompt Registry
 * 
 * Manages storage and lineage of system prompts and user templates.
 * Inspired by PromptHub CLI's file-based version control system.
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const state = require('./state');
const renderer = require('../ui/renderer');

class PromptRegistry {
    constructor() {
        this.baseDir = path.join(process.env.HOME || process.env.USERPROFILE, '.zaycode', 'prompts');
        this.registryFile = path.join(this.baseDir, 'registry.json');
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            try {
                await fs.access(this.registryFile);
            } catch {
                await fs.writeFile(this.registryFile, JSON.stringify({ prompts: {}, tags: {} }, null, 2));
            }
            this.initialized = true;
        } catch (err) {
            renderer.error(`Failed to initialize PromptRegistry: ${err.message}`);
        }
    }

    /**
     * Save a prompt variant.
     * @param {string} id - Unique identifier
     * @param {string} content - Prompt text
     * @param {string} model - Intended model
     * @param {string|null} parentId - ID of parent prompt for lineage
     * @param {Array<string>} tags - Metadata tags
     */
    async savePrompt(id, content, model, parentId = null, tags = []) {
        await this.init();

        const promptData = {
            id,
            content,
            model,
            parentId,
            tags,
            createdAt: new Date().toISOString(),
            metadata: {
                version: '1.0.0'
            }
        };

        const promptFile = path.join(this.baseDir, `${id}.json`);
        await fs.writeFile(promptFile, JSON.stringify(promptData, null, 2));

        // Update registry index
        const registry = JSON.parse(await fs.readFile(this.registryFile, 'utf8'));
        registry.prompts[id] = {
            id,
            parentId,
            tags,
            createdAt: promptData.createdAt
        };

        // Update tags index
        tags.forEach(tag => {
            if (!registry.tags[tag]) registry.tags[tag] = [];
            if (!registry.tags[tag].includes(id)) registry.tags[tag].push(id);
        });

        await fs.writeFile(this.registryFile, JSON.stringify(registry, null, 2));
        return promptData;
    }

    async getPrompt(id) {
        await this.init();
        try {
            const content = await fs.readFile(path.join(this.baseDir, `${id}.json`), 'utf8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * Check for variants that were created from an older version of their parent.
     */
    async checkOutdated() {
        await this.init();
        const registry = JSON.parse(await fs.readFile(this.registryFile, 'utf8'));
        const outdated = [];

        for (const [id, meta] of Object.entries(registry.prompts)) {
            if (meta.parentId) {
                const parent = registry.prompts[meta.parentId];
                if (parent && new Date(parent.createdAt) > new Date(meta.createdAt)) {
                    outdated.push({
                        id,
                        parentId: meta.parentId,
                        reason: `Parent prompt (${meta.parentId}) was updated after this variant was created.`
                    });
                }
            }
        }
        return outdated;
    }

    async getLineage(id) {
        await this.init();
        const registry = JSON.parse(await fs.readFile(this.registryFile, 'utf8'));
        const ancestry = [];
        let currentId = id;

        while (currentId) {
            const meta = registry.prompts[currentId];
            if (!meta) break;
            ancestry.push(meta);
            currentId = meta.parentId;
        }
        return ancestry;
    }

    async listPrompts(tag = null) {
        await this.init();
        const registry = JSON.parse(await fs.readFile(this.registryFile, 'utf8'));
        let prompts = Object.values(registry.prompts);

        if (tag) {
            prompts = prompts.filter(p => p.tags.includes(tag));
        }

        prompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return prompts;
    }
}

module.exports = new PromptRegistry();
