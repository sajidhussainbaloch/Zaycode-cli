/**
 * ui/dashboardServer.js — Visual Thought Dashboard Backend (v8.4)
 * 
 * Express server that provides a real-time view of ZayCode's logic.
 */

'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const publisher = require('../core/publisher');
const state = require('../core/state');
const renderer = require('./renderer');

async function startDashboard(port = 3000) {
    const app = express();
    const server = http.createServer(app);
    const mcpManager = require('../core/mcpManager');

    app.use(express.json());

    // Static assets
    app.use(express.static(path.join(__dirname, 'dashboard')));

    // API: Current State
    app.get('/api/state', (req, res) => {
        res.json({
            ...state.get(),
            history: publisher.getHistory()
        });
    });

    // API: MCP Management
    app.get('/api/mcp', async (req, res) => {
        const servers = await mcpManager.discoverLocalServers();
        res.json(servers);
    });

    app.post('/api/mcp/add', async (req, res) => {
        const { name, config } = req.body;
        if (!name || !config) return res.status(400).json({ error: 'Missing name or config' });

        try {
            await mcpManager.addServer(name, config);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/mcp/:name', async (req, res) => {
        try {
            const success = await mcpManager.removeServer(req.params.name);
            res.json({ success });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // SSE: Real-time updates
    app.get('/api/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const onUpdate = (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        publisher.on('update', onUpdate);

        req.on('close', () => {
            publisher.off('update', onUpdate);
        });
    });

    return new Promise((resolve) => {
        let currentPort = port;
        const maxAttempts = 10;
        let attempts = 0;

        const tryListen = (p) => {
            server.removeAllListeners('error');
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
                    attempts++;
                    renderer.hint(`[Dashboard] Port ${p} in use, trying ${p + 1}...`);
                    tryListen(p + 1);
                } else {
                    renderer.error(`[Dashboard] Failed to start: ${err.message}`);
                    resolve(null);
                }
            });

            server.listen(p, () => {
                renderer.success(`[Mastermind] Visual Thought Dashboard is now ONLINE.`);
                renderer.info(`  Link: http://localhost:${p}  <-- Copy/Paste into Browser`);
                resolve(server);
            });
        };

        tryListen(currentPort);
    });
}

module.exports = { startDashboard };
