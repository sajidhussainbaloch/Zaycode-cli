#!/usr/bin/env node
/**
 * ZayCode v6 — Autonomous AI Developer CLI
 * 
 * Clean entry point. Orchestrates modules, owns nothing.
 */

'use strict';

const config = require('./config');

// Core
const state = require('./core/state');
const dashboardServer = require('./ui/dashboardServer');

// v8.4: Launch Visual Thought Dashboard
dashboardServer.startDashboard(3000).catch(() => { /* port busy */ });
const Memory = require('./core/memory');
const agent = require('./core/agent');
const contextManager = require('./core/contextManager');

// UI
const { showBanner } = require('./ui/banner');
const { startInputLoop } = require('./ui/input');
const renderer = require('./ui/renderer');

// Plugins
const pluginManager = require('./plugins/pluginManager');

// Utils
const utils = require('./utils');

// Catch unhandled errors globally
process.on('unhandledRejection', (err) => {
  renderer.error(`Unhandled error: ${err.message || err}`);
});

process.on('uncaughtException', (err) => {
  renderer.error(`Fatal error: ${err.message}`);
  process.exit(1);
});

/**
 * Main entry point
 */
async function main() {
  process.stdout.write('\x1b[2J\x1b[H'); // Clear screen and home cursor
  const logger = require('./core/logger');

  // Parse Command Line Arguments
  const args = process.argv.slice(2);
  let initialPrompt = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--verbose' || arg === '-v') {
      logger.setVerbose(true);
    } else if (arg === '--file' || arg === '-f') {
      if (args[i + 1]) {
        initialPrompt += ` @${args[i + 1]} `;
        i++;
      }
    } else {
      initialPrompt += ` ${arg}`;
    }
  }
  initialPrompt = initialPrompt.trim();

  // Check if API key is missing and run interactive setup
  const configError = config.validate();
  if (configError === 'API_KEY_MISSING') {
    const setup = require('./core/setup');
    await setup.runSetup();
  } else if (configError) {
    console.error(`\n  ✗ ${configError}\n`);
    process.exit(1);
  }

  // Prevent accidentally running in Protected Directories (System32, Windows, or Home Root)
  try {
    const os = require('os');
    const path = require('path');

    const currentPath = process.cwd().toLowerCase();
    const homeDir = os.homedir().toLowerCase();

    // Protect Windows system folders AND the root User directory
    const isProtected = currentPath.includes('system32') ||
      currentPath.includes('syswow64') ||
      currentPath.includes('\\windows') ||
      currentPath === homeDir;

    if (isProtected) {
      const desktopPath = path.join(os.homedir(), 'Desktop');

      // Change Node's current working directory to Desktop
      process.chdir(desktopPath);
      state._state.cwd = desktopPath;

      console.log(`\n  ⚠️  ${require('chalk').yellow('Warning:')} Protected directory detected.`);
      console.log(`  Moved working directory to: ${desktopPath}\n`);
    } else {
      // Ensure state matches actual cwd
      state._state.cwd = process.cwd();
    }
  } catch (err) {
    // Ignore permissions errors and proceed
  }

  // Initialize state
  state.setSessionId(utils.generateSessionId());
  state.setMode(config.defaultMode);
  if (config.sandbox) state.setSandbox(true);

  // Detect git branch (now that we are in Desktop)
  contextManager.detectGitBranch();

  // Load plugins
  pluginManager.loadPlugins();

  // Create conversation memory
  const memory = new Memory();
  memory.setSystem(contextManager.buildSystemPrompt());

  // Listen for memory clear command from input handler
  state.on('command:clear', () => {
    memory.clear();
    memory.setSystem(contextManager.buildSystemPrompt());
  });

  // Listen for resume command to load specific history states
  state.on('command:resume', (sessionId) => {
    if (memory.loadFromDisk(sessionId)) {
      renderer.success(`Successfully resumed session: ${sessionId}`);
    } else {
      renderer.error(`Failed to find or load session: ${sessionId}`);
    }
  });

  // Show Startup Preloader (v6.8)
  const preloader = require('./ui/preloader');
  await preloader.showPreloader();

  // Show banner (once)
  showBanner();

  // Helper to execute a prompt block
  const executePrompt = async (prompt) => {
    try {
      // Handle Multi-Agent Swarm Mode
      if (prompt.toLowerCase().startsWith('/swarm')) {
        let swarmPrompt = prompt.slice(6).trim();
        let useFree = false;

        if (swarmPrompt.toLowerCase().startsWith('free ') || swarmPrompt.toLowerCase() === 'free') {
          useFree = true;
          swarmPrompt = swarmPrompt.slice(4).trim();
        }

        if (!swarmPrompt) {
          renderer.error('Usage: /swarm [free] <complex task description>');
          return;
        }
        const swarm = require('./core/swarm');
        await swarm.runSwarmTask(swarmPrompt, memory, useFree);
        return;
      }

      // Handle Deep Thinking Toggle
      if (prompt.trim().toLowerCase() === '/reason') {
        const current = state.prop('deepThinking');
        state.setDeepThinking(!current);
        const next = !current;
        if (next) {
          renderer.success('Deep Thinking Mode: ON 🧠');
          renderer.hint('ZayCode will now use extended Chain-of-Thought for every task.');
        } else {
          renderer.info('Deep Thinking Mode: OFF');
        }
        // Force refresh system prompt with new rules
        memory.setSystem(contextManager.buildSystemPrompt());
        return;
      }

      // Handle Prompt Evaluation Command (v6.6)
      if (prompt.toLowerCase().startsWith('/eval')) {
        const promptToEval = prompt.slice(5).trim();
        if (!promptToEval) {
          renderer.error('Usage: /eval <prompt text>');
          return;
        }
        renderer.info(`[Evaluation] Scoring prompt: "${promptToEval.substring(0, 40)}..."`);
        const evalTools = require('./tools/evalTools');
        const report = await evalTools.evaluate_prompt({ promptToEval });

        if (report.success) {
          renderer.success(`Evaluation Result: ${report.message}`);
          console.table(report.result.scores);
          renderer.write(`\nFeedback: ${report.result.feedback}\n`);
        } else {
          renderer.error(report.error);
        }
        return;
      }

      // Handle Prompt Registry Command (v6.7)
      if (prompt.toLowerCase().startsWith('/prompt')) {
        const args = prompt.slice(7).trim().split(' ');
        const subCommand = args[0];
        const promptRegistry = require('./core/promptRegistry');

        if (subCommand === 'save') {
          const content = args.slice(1).join(' ');
          if (!content) return renderer.error('Usage: /prompt save <content>');
          const id = require('./utils').generateSessionId().substring(0, 8);
          await promptRegistry.savePrompt(id, content, state.prop('activeModel'));
          renderer.success(`Prompt saved to registry with ID: ${id}`);
        } else if (subCommand === 'list') {
          const list = await promptRegistry.listPrompts();
          console.table(list.map(p => ({ id: p.id, parent: p.parentId || 'none', tags: p.tags.join(','), date: p.createdAt.split('T')[0] })));
        } else if (subCommand === 'check') {
          const outdated = await promptRegistry.checkOutdated();
          if (outdated.length) {
            renderer.warning(`${outdated.length} outdated variants detected.`);
            console.table(outdated);
          } else {
            renderer.success('All variants are up to date.');
          }
        } else {
          renderer.info('Usage: /prompt [save|list|check]');
        }
        return;
      }

      // Handle Command Menu (v6.8)
      if (prompt.trim().toLowerCase() === '/m') {
        const menu = require('./ui/menu');
        await menu.displayMenu();
        return;
      }

      // Handle Session Consolidation (v6.9)
      if (prompt.trim().toLowerCase() === '/consolidate') {
        const promptTools = require('./tools/promptTools');
        await promptTools.consolidate_session({ history: memory.getMessages() });
        return;
      }

      // Handle Technical Documentation (v6.9)
      if (prompt.trim().toLowerCase() === '/doc') {
        const promptTools = require('./tools/promptTools');
        await promptTools.generate_tech_docs({ history: memory.getMessages() });
        return;
      }

      // Handle Performance Optimization (v7.0)
      if (prompt.trim().toLowerCase().startsWith('/optimize')) {
        renderer.info('[v7.0] Switching to PERFORMANCE OPTIMIZATION mode...');
        const code = prompt.substring(9).trim();
        const optimizationPrompt = `Analyze the following code for performance bottlenecks, Big O complexity, and efficiency hotspots:\n\n${code}`;
        await agent.run(optimizationPrompt, memory);
        return;
      }


      // Normal single-agent execution
      const result = await agent.run(prompt, memory);

      // Show response metadata
      renderer.responseMeta({
        model: result.model,
        mode: result.mode,
        iterations: result.iterations,
        timeMs: result.timeMs,
      });
    } catch (err) {
      logger.error('Execution Failed', err.message);
      // Retry once with fallback
      renderer.error(err.message || 'Request failed');

      if (err.message && err.message.includes('API error')) {
        renderer.hint('Tip: Check your OPENROUTER_API_KEY config.json settings and model availability.');
      }
    }
  };

  // If arguments were passed, run them immediately as a one-shot before entering the REPL
  if (initialPrompt) {
    console.log(`\n  ${require('chalk').dim('Executing CLI arguments...')}`);
    const resolved = contextManager.resolveFileReferences(initialPrompt);
    await executePrompt(resolved);
  }

  // Start interactive loop
  await startInputLoop(async (prompt) => {
    await executePrompt(prompt);
  });
}

// Start
main().catch((err) => {
  console.error(`\n  ✗ Fatal: ${err.stack || err}\n`);
  process.exit(1);
});
