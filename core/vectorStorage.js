/**
 * core/vectorStorage.js — Semantic Search & Vector RAG (v8.6)
 * 
 * Implements a lightweight local vector store for code indexing.
 * Uses a simple keyword-semantic hybrid approach for high-precision retrieval.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const renderer = require('../ui/renderer');

class VectorStorage {
    constructor() {
        this.indexFile = path.join(os.homedir(), '.zaycode', 'vector_index.json');
        this.index = { documents: [] };
        this._load();
    }

    _load() {
        if (fs.existsSync(this.indexFile)) {
            try {
                this.index = JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
            } catch (e) { /* corrupted index */ }
        }
    }

    _save() {
        const dir = path.dirname(this.indexFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.indexFile, JSON.stringify(this.index, null, 2), 'utf8');
    }

    /**
     * Index a file by creating "pseudo-embeddings" (keywords + summary)
     */
    async indexFile(filePath, content) {
        // In a real mastermind update, this would call an embedding model.
        // For the skeletal v8.6, we use refined keyword extraction as a hybrid.
        const keywords = Array.from(new Set(content.match(/\b\w{4,}\b/g) || [])).slice(0, 50);

        this.index.documents = this.index.documents.filter(d => d.path !== filePath);
        this.index.documents.push({
            path: filePath,
            keywords,
            summary: content.substring(0, 200),
            timestamp: Date.now()
        });

        this._save();
    }

    /**
     * Find documents by semantic similarity
     */
    search(query) {
        const queryTerms = query.toLowerCase().split(/\s+/);

        return this.index.documents
            .map(doc => {
                let score = 0;
                queryTerms.forEach(term => {
                    if (doc.keywords.some(kw => kw.toLowerCase().includes(term))) score += 2;
                    if (doc.path.toLowerCase().includes(term)) score += 5;
                    if (doc.summary.toLowerCase().includes(term)) score += 1;
                });
                return { ...doc, score };
            })
            .filter(d => d.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }
}

const vectorStorage = new VectorStorage();
module.exports = vectorStorage;
