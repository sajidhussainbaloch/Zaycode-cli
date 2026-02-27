/**
 * ui/renderer.js — Stream Renderer
 * 
 * Token-by-token rendering for AI responses.
 * Handles markdown code blocks, tool calls, and clean output.
 */

'use strict';

const chalk = require('chalk');
const { colors, styles, icons } = require('./theme');

const { highlight } = require('cli-highlight');

let _streamActive = false;
let _lineBuffer = '';
let _inCodeBlock = false;
let _codeLang = '';

/**
 * Print a single token during streaming.
 * Called by the agent loop for each delta.
 */
function streamToken(delta) {
    if (!delta) return;

    const publisher = require('../core/publisher');
    publisher.publish('token', delta);

    if (!_streamActive) {
        _streamActive = true;
        _inCodeBlock = false;
        _codeLang = '';
        _lineBuffer = '';
        console.log('');
    }

    _lineBuffer += delta;

    // Process complete lines
    let parts = _lineBuffer.split('\n');
    _lineBuffer = parts.pop(); // keep the incomplete remainder

    for (const line of parts) {
        _processLine(line);
    }
}

/**
 * Process and print a single complete line with syntax highlighting
 */
function _processLine(line) {
    const trimmed = line.trim();

    // Detect code block toggles
    if (trimmed.startsWith('```')) {
        if (_inCodeBlock) {
            _inCodeBlock = false;
            console.log(`  ${chalk.dim('```')}`);
        } else {
            _inCodeBlock = true;
            _codeLang = trimmed.slice(3).trim();
            console.log(`  ${chalk.dim(trimmed || '```')}`);
        }
        return;
    }

    // Detect XML reasoning tags (dimmed/subtle)
    const reasoningTags = ['<thinking>', '</thinking>', '<plan>', '</plan>', '<current_task>', '</current_task>', '<example>', '</example>'];
    const isReasoningMatch = reasoningTags.some(tag => trimmed.includes(tag));

    if (isReasoningMatch) {
        console.log(`  ${chalk.dim.italic(line)}`);
        const publisher = require('../core/publisher');
        publisher.publish('thought', line);
        return;
    }

    // Print the line
    if (_inCodeBlock) {
        try {
            const hLine = highlight(line, { language: _codeLang || 'javascript', ignoreIllegals: true });
            console.log(`  ${hLine}`);
        } catch (e) {
            console.log(`  ${line}`);
        }
    } else {
        // Normal text (bold headers, dim lists, etc via simple regex or just text color)
        let formatted = line;

        // Highlight [[memory:ID]] tags
        formatted = formatted.replace(/\[\[memory:([^\]]+)\]\]/g, (match, id) => {
            return chalk.bold.magenta(`[[memory:${id}]]`);
        });

        if (trimmed.startsWith('#')) {
            formatted = chalk.bold(formatted);
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            formatted = chalk.dim(formatted);
        } else {
            formatted = colors.text(formatted);
        }
        console.log(`  ${formatted}`);
    }
}

/**
 * End the current stream output.
 */
function streamEnd() {
    if (_streamActive) {
        // Flush remaining buffer
        if (_lineBuffer) {
            _processLine(_lineBuffer);
            _lineBuffer = '';
        }
        console.log('');
        _streamActive = false;
    }
}

/**
 * Display tool call start
 */
function toolCallStart(name, args) {
    let argsStr = '';
    try {
        const parsed = typeof args === 'string' ? JSON.parse(args) : args;
        // Show key args concisely
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
            const preview = keys.map(k => {
                let v = parsed[k];
                if (typeof v === 'string' && v.length > 50) {
                    v = v.slice(0, 47) + '...';
                }
                return `${colors.dim(k)}=${colors.text(JSON.stringify(v))}`;
            }).join(' ');
            argsStr = ` ${preview}`;
        }
    } catch {
        argsStr = '';
    }

    console.log(`\n  ${chalk.dim('┏━━━━')} ${styles.toolName(name)} ${chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
    if (argsStr) {
        console.log(`  ${chalk.dim('┃')} ${argsStr}`);
    }

    const publisher = require('../core/publisher');
    publisher.publish('tool_start', { name, args: argsStr });
}

/**
 * Display tool call result
 */
function toolCallResult(name, result) {
    const publisher = require('../core/publisher');
    publisher.publish('tool_result', { name, result });

    if (result.success) {
        const msg = typeof result.result === 'object' && result.result.message
            ? result.result.message
            : `${icons.success} done`;
        console.log(`  ${chalk.dim('┗━━━━')} ${colors.success(msg)}`);
    } else {
        console.log(`  ${chalk.dim('┗━━━━')} ${colors.error(result.error || 'failed')}`);
    }
}

/**
 * Print response metadata after stream completes
 */
function responseMeta({ model, mode, iterations, timeMs }) {
    console.log('');
    const parts = [
        colors.dim(`${model}`),
        colors.dim(`${timeMs}ms`),
    ];
    if (iterations > 1) {
        parts.push(colors.dim(`${iterations} steps`));
    }
    console.log(`  ${colors.dim(parts.join('  ·  '))}`);
    console.log('');
}

/**
 * Print an info message
 */
function info(msg) {
    console.log(`  ${colors.primary(icons.info)} ${colors.text(msg)}`);
    const publisher = require('../core/publisher');
    publisher.publish('info', msg);
}

/**
 * Print a success message
 */
function success(msg) {
    console.log(`  ${colors.success(icons.success)} ${colors.text(msg)}`);
    const publisher = require('../core/publisher');
    publisher.publish('success', msg);
}

/**
 * Print a warning message
 */
function warning(msg) {
    console.log(`  ${colors.warning(icons.warning)} ${colors.warning(msg)}`);
    const publisher = require('../core/publisher');
    publisher.publish('warning', msg);
}

/**
 * Print an error message
 */
function error(msg) {
    console.log(`  ${colors.error(icons.error)} ${colors.error(msg)}`);
    const publisher = require('../core/publisher');
    publisher.publish('error', msg);
}

/**
 * Print a hint/dim message
 */
function hint(msg) {
    console.log(`  ${colors.dim(msg)}`);
    const publisher = require('../core/publisher');
    publisher.publish('hint', msg);
}

/**
 * Render interactive Action Options (v0 style)
 * @param {Array<{label: string, value: string}>} options 
 */
function renderActionOptions(options) {
    if (!options || options.length === 0) return;

    console.log('');
    console.log(`  ${chalk.bold('Action Options:')}`);
    options.forEach((opt, idx) => {
        console.log(`  ${chalk.cyan(`[${idx + 1}]`)} ${opt.label} ${chalk.dim(`(/action ${opt.value})`)}`);
    });
    console.log('');
}

module.exports = {
    streamToken,
    streamEnd,
    toolCallStart,
    toolCallResult,
    responseMeta,
    info,
    success,
    warning,
    error,
    hint,
    renderActionOptions,
};
