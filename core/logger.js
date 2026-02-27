/**
 * core/logger.js — Debug & System Logger
 * 
 * Logs API requests, tool traces, and verbose info to ~/.zaycode/logs/debug.log
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const configManager = require('./configManager');
const chalk = require('chalk');

const LOG_DIR = path.join(os.homedir(), '.zaycode', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'debug.log');

class Logger {
    constructor() {
        this.verbose = false;
        try {
            if (!fs.existsSync(LOG_DIR)) {
                fs.mkdirSync(LOG_DIR, { recursive: true });
            }
        } catch (e) { }
    }

    setVerbose(val) {
        this.verbose = val;
    }

    _write(level, message, data = null) {
        const conf = configManager.get();
        if (conf.system && conf.system.enableLogging === false) return;

        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] [${level}] ${message}`;
        if (data) {
            logLine += `\n${JSON.stringify(data, null, 2)}`;
        }

        // Live trace printing to console if --verbose flag is thrown
        if (this.verbose) {
            if (level === 'ERROR') console.log(chalk.red(logLine));
            else if (level === 'DEBUG') console.log(chalk.gray(logLine));
            else console.log(chalk.dim(logLine));
        }

        try {
            fs.appendFileSync(LOG_FILE, logLine + '\n\n');
        } catch (err) {
            // Silently fail if we can't write to logs (e.g. perms issue)
        }
    }

    info(msg, data) { this._write('INFO', msg, data); }
    debug(msg, data) { this._write('DEBUG', msg, data); }
    error(msg, data) { this._write('ERROR', msg, data); }

    apiTrace(endpoint, payload, response) {
        this._write('API', `Request to ${endpoint}`, { payload, response });
    }
}

module.exports = new Logger();
