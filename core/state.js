#!/usr/bin/env node
/**
 * core/state.js — Centralized State Engine
 * 
 * Single source of truth for all application state.
 * State mutations are guarded and emit change events.
 * Manual model override prevents auto-routing.
 */

'use strict';

const EventEmitter = require('events');
const path = require('path');

class AppState extends EventEmitter {
  constructor() {
    super();
    this._state = {
      sessionId: '',
      mode: 'plan',           // auto | code | reason | debug | plan
      manualOverride: false,   // true when user explicitly selects model
      activeModel: null,       // currently selected model ID
      provider: 'openrouter',  // active provider
      cwd: process.cwd(),
      gitBranch: null,
      sandbox: false,
      contextUsed: 0,
      contextMax: 128000,
      isThinking: false,
      agentIterations: 0,
      deepThinking: false,  // v6.4 Deep Thinking mode
      currentMilestone: null, // v6.5 Milestone Tracking
    };
  }

  /** Set Deep Thinking toggle */
  setDeepThinking(val) {
    const prev = this._state.deepThinking;
    this._state.deepThinking = !!val;
    this.emit('change', { key: 'deepThinking', prev, next: !!val });
  }

  /** Get a snapshot of current state (frozen copy) */
  get() {
    return Object.freeze({ ...this._state });
  }

  /** Get a single state property */
  prop(key) {
    return this._state[key];
  }

  /** Set mode — resets manual override if switching to auto */
  setMode(mode) {
    const valid = ['auto', 'code', 'reason', 'debug', 'plan'];
    if (!valid.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Valid: ${valid.join(', ')}`);
    }
    const prev = this._state.mode;
    this._state.mode = mode;
    if (mode === 'auto') {
      this._state.manualOverride = false;
      this._state.activeModel = null;
    }
    this.emit('change', { key: 'mode', prev, next: mode });
  }

  /** Set model override — locks routing */
  setModel(modelId) {
    if (!modelId) {
      throw new Error('Model ID required');
    }
    this._state.activeModel = modelId;
    this._state.manualOverride = true;
    this.emit('change', { key: 'activeModel', prev: null, next: modelId });
  }

  /** Clear model override — returns to auto routing */
  clearModelOverride() {
    this._state.activeModel = null;
    this._state.manualOverride = false;
    this.emit('change', { key: 'activeModel', prev: null, next: null });
  }

  /** Set provider */
  setProvider(provider) {
    this._state.provider = provider;
    this.emit('change', { key: 'provider', prev: null, next: provider });
  }

  /** Set session ID */
  setSessionId(id) {
    this._state.sessionId = id;
  }

  /** Set git branch */
  setGitBranch(branch) {
    this._state.gitBranch = branch;
    this.emit('change', { key: 'gitBranch', prev: null, next: branch });
  }

  /** Set CWD */
  setCwd(dir) {
    this._state.cwd = path.resolve(dir);
    this.emit('change', { key: 'cwd', prev: null, next: dir });
  }

  /** Set thinking status */
  setThinking(val) {
    this._state.isThinking = !!val;
    this.emit('change', { key: 'isThinking', prev: null, next: !!val });
  }

  /** Update context usage */
  setContextUsage(used, max) {
    this._state.contextUsed = used;
    if (max) this._state.contextMax = max;
  }

  /** Track agent iterations */
  incrementIterations() {
    this._state.agentIterations++;
  }

  resetIterations() {
    this._state.agentIterations = 0;
  }

  /** Set sandbox mode */
  setSandbox(val) {
    this._state.sandbox = !!val;
    this.emit('change', { key: 'sandbox', prev: null, next: !!val });
  }
}

// Singleton
const state = new AppState();

module.exports = state;
