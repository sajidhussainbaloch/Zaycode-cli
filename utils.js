/**
 * utils.js — Shared Utilities
 */

'use strict';

const crypto = require('crypto');

/** Generate a short session ID */
function generateSessionId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/** Current ISO timestamp */
function now() {
  return new Date().toISOString();
}

/** Simple timer */
function timer() {
  const start = Date.now();
  return { ms: () => Date.now() - start };
}

/** Sleep for N ms */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Rough token estimation (~4 chars per token) */
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

module.exports = { generateSessionId, now, timer, sleep, estimateTokens };
