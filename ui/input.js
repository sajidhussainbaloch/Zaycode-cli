/**
 * ui/input.js — Interactive Input Handler with Ctrl+T Menu
 * 
 * Raw keypress-based input with:
 *   - Ctrl+T → opens interactive menu overlay
 *   - Arrow key history
 *   - Slash commands
 *   - @file reference resolution
 */

'use strict';

const chalk = require('chalk');
const readline = require('readline');
const { colors, styles, icons } = require('./theme');
const statusBar = require('./statusBar');
const renderer = require('./renderer');
const { showBanner } = require('./banner');
const menu = require('./menu');
const state = require('../core/state');
const registry = require('../models/registry');
const defaults = require('../models/defaults');
const contextManager = require('../core/contextManager');

const COMMANDS = [
    '/m', '/models', '/mode', '/reason', '/swarm', '/eval', '/prompt',
    '/config', '/status', '/help', '/exit', '/clear', '/use', '/provider', '/resume'
];

/**
 * Start the interactive input loop with raw keypress handling.
 * 
 * @param {Function} onPrompt - async (input) => void — called with user prompt
 * @returns {Promise<void>} — resolves when user exits
 */
function startInputLoop(onPrompt) {
    return new Promise((resolve) => {
        let buffer = '';
        let history = [];
        let histIndex = -1;
        let isProcessing = false;
        let menuOpen = false;
        let suggestions = [];
        let suggestionIndex = -1;

        // Setup readline for keypress events
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        readline.emitKeypressEvents(process.stdin, rl);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);

        let _lastPromptLines = 0;

        // Render the mode selector header
        function renderModeHeader(newline = true) {
            const currentMode = state.prop('mode');
            const modes = [
                { id: 'plan', label: ' PLAN ' },
                { id: 'code', label: ' BUILD ' },
                { id: 'reason', label: ' REASON ' },
                { id: 'debug', label: ' DEBUG ' },
                { id: 'auto', label: ' AUTO ' }
            ];

            const header = modes.map(m => {
                if (m.id === currentMode) {
                    return colors.modeActive(m.label);
                } else {
                    return colors.modeInactive(m.label);
                }
            }).join('  ');

            process.stdout.write(`\r\x1b[2K  ${header}${newline ? '\n' : ''}`);
        }

        /**
         * The only function that should write to the prompt area.
         * Redraws the 3-line block (Header, Status, Prompt).
         * Handles line wrapping to stay in place.
         */
        function _drawUI(fullRedraw = false) {
            if (menuOpen || isProcessing) return;

            // 1. Move cursor back to the start of our UI block
            if (!fullRedraw && _lastPromptLines > 0) {
                // Move up N lines to reach the header
                // _lastPromptLines includes Prompt lines + 1 (Status) + 1 (Header)
                process.stdout.write(`\x1b[${_lastPromptLines}A\r`);
            }

            // 2. Clear from cursor to end of screen (prevents ghosts)
            process.stdout.write('\x1b[J');

            // 3. Print Header
            renderModeHeader(true);

            // 4. Print Status Bar
            const bar = statusBar.render();
            process.stdout.write(`  ${colors.dim(bar)}\n`);

            // 5. Print Prompt
            const promptStr = `  ${colors.primary(icons.prompt)} ${buffer}`;
            process.stdout.write(promptStr);

            // 6. Calculate how many lines we just used
            const cols = process.stdout.columns || 80;
            const plainLen = promptStr.replace(/\x1b\[[0-9;]*m/g, '').length;
            const promptLines = Math.max(1, Math.ceil((plainLen + 2) / cols));

            _lastPromptLines = promptLines + 1;

            // 7. Suggestions Dropdown
            if (suggestions.length > 0) {
                _renderSuggestions();
            }
        }

        function _renderSuggestions() {
            const cols = process.stdout.columns || 80;
            const width = Math.min(cols - 6, 30);

            process.stdout.write(`\n  ${chalk.dim('┌' + '─'.repeat(width) + '┐')}\n`);
            suggestions.forEach((s, i) => {
                const isSelected = i === suggestionIndex;
                const text = s.padEnd(width - 2).slice(0, width - 2);
                const line = isSelected
                    ? `  ${chalk.dim('│')} ${chalk.bgHex('#00D4FF').black(' ' + text)} ${chalk.dim('│')}`
                    : `  ${chalk.dim('│')} ${colors.text(' ' + text)} ${chalk.dim('│')}`;
                process.stdout.write(line + '\n');
            });
            process.stdout.write(`  ${chalk.dim('└' + '─'.repeat(width) + '┘')}`);

            // Do NOT increment _lastPromptLines here because we moved the cursor back up.
            // _lastPromptLines should only represent the distance to the Header from the Prompt line.

            // Move cursor back to prompt line correctly
            process.stdout.write(`\x1b[${suggestions.length + 2}A\r`);

            // Re-calculate prompt position to restore cursor
            const promptStr = `  ${colors.primary(icons.prompt)} ${buffer}`;
            const plainLen = promptStr.replace(/\x1b\[[0-9;]*m/g, '').length;
            const cursorCol = (plainLen % cols) + 1;
            process.stdout.write(`\x1b[${cursorCol}C`);
        }

        // External API matches previous names for compatibility
        function renderPrompt() {
            _drawUI(true);
        }

        function refreshLine() {
            _drawUI(false);
        }

        function refreshUI() {
            _drawUI(false);
        }

        // Initial prompt
        renderPrompt();

        // Handle Ctrl+T menu flow
        async function openMenu() {
            menuOpen = true;

            const action = await menu.showMainMenu();

            switch (action) {
                case 'models': {
                    const modelId = await menu.showModelPicker();
                    if (modelId) {
                        state.setModel(modelId);
                        const meta = registry.findById(modelId);
                        // Re-show banner + status
                        showBanner();
                        renderer.success(`Model locked: ${modelId}${meta ? ` (${meta.name})` : ''}`);
                    } else {
                        showBanner();
                    }
                    break;
                }

                case 'mode': {
                    const mode = await menu.showModePicker();
                    if (mode) {
                        state.setMode(mode);
                        showBanner();
                        if (mode === 'auto') {
                            renderer.info('Mode: Auto (smart routing, model lock cleared)');
                        } else {
                            renderer.info(`Mode: ${mode.toUpperCase()} (default: ${defaults.getDefaultModel(mode)})`);
                        }
                    } else {
                        showBanner();
                    }
                    break;
                }

                case 'status':
                    showBanner();
                    showStatus();
                    break;

                case 'clear':
                    showBanner();
                    state.emit('command:clear');
                    renderer.success('Conversation memory cleared.');
                    break;

                case 'help':
                    showBanner();
                    showHelp();
                    break;

                case 'exit':
                    console.log('');
                    renderer.hint('Goodbye.');
                    console.log('');
                    if (process.stdin.isTTY) process.stdin.setRawMode(false);
                    rl.close();
                    resolve();
                    return;

                default:
                    // Cancelled (Esc)
                    showBanner();
                    break;
            }

            menuOpen = false;
            console.log('');
            renderPrompt();
        }

        // Keypress handler
        process.stdin.on('keypress', async (str, key) => {
            if (!key) return;
            if (menuOpen) return; // Menu handles its own keypresses

            // Ctrl+C → exit
            if (key.ctrl && key.name === 'c') {
                console.log('');
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                rl.close();
                resolve();
                return;
            }

            // Ctrl+T → open menu
            if (key.ctrl && key.name === 't') {
                await openMenu();
                return;
            }

            // Ignore keys while processing
            if (isProcessing) return;

            // Enter
            if (key.name === 'return') {
                if (suggestions.length > 0 && suggestionIndex !== -1) {
                    buffer = suggestions[suggestionIndex];
                    suggestions = [];
                    suggestionIndex = -1;
                    refreshUI();
                    return;
                }

                const input = buffer.trim();
                buffer = '';

                if (!input) {
                    process.stdout.write('\n');
                    renderPrompt();
                    return;
                }

                // Save to history
                history.unshift(input);
                if (history.length > 50) history.pop();
                histIndex = -1;

                process.stdout.write('\n');

                // Handle slash commands
                if (input.startsWith('/')) {
                    const passToMain = ['/swarm', '/eval', '/prompt'];
                    const lowerInput = input.toLowerCase().trim();
                    const isPassSafe = passToMain.some(cmd => lowerInput.startsWith(cmd));

                    if (lowerInput === '/m') {
                        menu.displayMenu();
                        renderPrompt();
                        return;
                    }

                    if (!isPassSafe) {
                        const exitResult = handleCommand(input, rl, resolve);
                        if (exitResult === 'exit') return;
                        console.log('');
                        renderPrompt();
                        return;
                    }
                }

                // Resolve @file references
                const resolved = contextManager.resolveFileReferences(input);

                // Send to agent
                isProcessing = true;
                try {
                    await onPrompt(resolved);
                } catch (err) {
                    renderer.error(`Error: ${err.message}`);
                }
                isProcessing = false;

                renderPrompt();
                return;
            }

            // Backspace
            if (key.name === 'backspace') {
                if (buffer.length > 0) {
                    buffer = buffer.slice(0, -1);
                    _updateSuggestions();
                    refreshLine();
                }
                return;
            }

            // Delete key
            if (key.name === 'delete') {
                return;
            }

            // Up arrow → history or suggestion
            if (key.name === 'up') {
                if (suggestions.length > 0) {
                    suggestionIndex = suggestionIndex <= 0 ? suggestions.length - 1 : suggestionIndex - 1;
                    refreshUI();
                    return;
                }
                if (history.length > 0) {
                    histIndex = Math.min(histIndex + 1, history.length - 1);
                    buffer = history[histIndex];
                    refreshLine();
                }
                return;
            }

            // Down arrow → history or suggestion
            if (key.name === 'down') {
                if (suggestions.length > 0) {
                    suggestionIndex = (suggestionIndex + 1) % suggestions.length;
                    refreshUI();
                    return;
                }
                if (histIndex <= 0) {
                    histIndex = -1;
                    buffer = '';
                    refreshLine();
                    return;
                }
                histIndex--;
                buffer = history[histIndex];
                refreshLine();
                return;
            }

            // Tab → Suggestion or Mode
            if (key.name === 'tab') {
                if (suggestions.length > 0) {
                    suggestionIndex = (suggestionIndex + 1) % suggestions.length;
                    refreshUI();
                    return;
                }

                const order = ['plan', 'code', 'reason', 'debug', 'auto'];
                const current = state.prop('mode');
                const idx = order.indexOf(current);
                const next = order[(idx + 1) % order.length];

                state.setMode(next);

                // Visual feedback (refresh full UI block)
                refreshUI();
                return;
            }

            // Home
            if (key.name === 'home') return;
            // End
            if (key.name === 'end') return;

            // Printable characters
            if (str && str.length === 1 && !key.ctrl && !key.meta) {
                buffer += str;
                _updateSuggestions();
                refreshLine();
                return;
            }

            function _updateSuggestions() {
                if (buffer.startsWith('/') && !buffer.includes(' ')) {
                    suggestions = COMMANDS.filter(c => c.startsWith(buffer.toLowerCase()));
                    if (suggestions.length > 10) suggestions = suggestions.slice(0, 10);
                    if (suggestions.length === 0) suggestionIndex = -1;
                    else if (suggestionIndex >= suggestions.length) suggestionIndex = 0;
                } else {
                    suggestions = [];
                    suggestionIndex = -1;
                }
            }
        });
    });
}

/**
 * Handle slash commands
 * @returns {'exit'|'handled'}
 */
function handleCommand(input, rl, exitResolve) {
    const spaceIdx = input.indexOf(' ');
    const cmd = spaceIdx === -1
        ? input.slice(1).toLowerCase()
        : input.slice(1, spaceIdx).toLowerCase();
    const arg = spaceIdx === -1 ? null : input.slice(spaceIdx + 1).trim();

    switch (cmd) {
        case 'help':
            showHelp();
            return 'handled';

        case 'models':
            showModels();
            return 'handled';

        case 'use': {
            if (!arg) {
                renderer.error('Usage: /use <model-name>  (or press Ctrl+T → Select Model)');
                return 'handled';
            }
            const resolved = registry.resolve(arg);
            if (!resolved) {
                renderer.error(`Model not found: ${arg}`);
                return 'handled';
            }
            state.setModel(resolved);
            const meta = registry.findById(resolved);
            renderer.success(`Model locked: ${resolved}${meta ? ` (${meta.name})` : ''}`);
            return 'handled';
        }

        case 'mode': {
            if (!arg) {
                renderer.error(`Usage: /mode <${defaults.getModes().join('|')}>  (or press Ctrl+T → Switch Mode)`);
                return 'handled';
            }
            const mode = normalizeMode(arg);
            if (!mode) {
                renderer.error(`Unknown mode: ${arg}. Valid: ${defaults.getModes().join(', ')}`);
                return 'handled';
            }
            state.setMode(mode);
            if (mode === 'auto') {
                renderer.info('Mode: Auto (smart routing enabled, model lock cleared)');
            } else {
                const defaultModel = defaults.getDefaultModel(mode);
                renderer.info(`Mode: ${mode.toUpperCase()} (default model: ${defaultModel})`);
            }
            return 'handled';
        }

        case 'provider': {
            if (!arg) {
                renderer.info(`Current provider: ${state.prop('provider')}`);
                renderer.hint(`Available: ${registry.getProviders().join(', ')}`);
                return 'handled';
            }
            state.setProvider(arg.toLowerCase());
            renderer.success(`Provider set: ${arg.toLowerCase()}`);
            return 'handled';
        }

        case 'clear':
            renderer.success('Conversation memory cleared.');
            state.emit('command:clear');
            return 'handled';

        case 'config': {
            if (!arg) {
                showConfig();
                return 'handled';
            }

            // Format: /config [key] [value]
            const parts = arg.split(/\s+/);
            const key = parts[0].toLowerCase();
            const value = parts.slice(1).join(' ');

            const configManager = require('../core/configManager');
            const validKeys = ['model', 'mode', 'temperature'];

            if (!validKeys.includes(key)) {
                renderer.error(`Invalid config key: ${key}. Valid: ${validKeys.join(', ')}`);
                return 'handled';
            }

            if (!value) {
                const current = configManager.get().defaults[key];
                renderer.info(`Current default ${key}: ${current}`);
                return 'handled';
            }

            let finalVal = value;
            if (key === 'temperature') {
                finalVal = parseFloat(value);
                if (isNaN(finalVal)) {
                    renderer.error('Temperature must be a number.');
                    return 'handled';
                }
            }

            configManager.update('defaults', { [key]: finalVal });
            renderer.success(`Updated default ${key} to ${finalVal}`);
            return 'handled';
        }

        case 'resume':
            if (!arg) {
                renderer.error('Usage: /resume <session-id>');
                return 'handled';
            }
            state.emit('command:resume', arg);
            return 'handled';

        case 'status':
            showStatus();
            return 'handled';

        case 'exit':
        case 'quit':
            console.log('');
            renderer.hint('Goodbye.');
            console.log('');
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            rl.close();
            if (exitResolve) exitResolve();
            return 'exit';

        default:
            renderer.error(`Unknown command: /${cmd}. Type /help or Ctrl+T for menu.`);
            return 'handled';
    }
}

function normalizeMode(s) {
    const map = {
        'auto': 'auto',
        'code': 'code', 'coding': 'code',
        'reason': 'reason', 'reasoning': 'reason',
        'debug': 'debug', 'debugging': 'debug',
        'plan': 'plan', 'planning': 'plan',
    };
    return map[s.toLowerCase()] || null;
}

function showHelp() {
    console.log('');
    console.log(styles.title('  Commands & Shortcuts'));
    console.log('');

    console.log(`  ${chalk.bold(colors.secondary('KEYBOARD SHORTCUTS'))}`);
    console.log(`    ${colors.primary('Ctrl+T'.padEnd(18))} ${colors.dim('Open interactive menu')}`);
    console.log(`    ${colors.primary('↑ / ↓'.padEnd(18))} ${colors.dim('Browse command history')}`);
    console.log(`    ${colors.primary('Tab'.padEnd(18))} ${colors.dim('Autocomplete commands')}`);
    console.log(`    ${colors.primary('Ctrl+C'.padEnd(18))} ${colors.dim('Exit')}`);
    console.log('');

    console.log(`  ${chalk.bold(colors.secondary('SLASH COMMANDS'))}`);
    const cmds = [
        ['/help', 'Show this help'],
        ['/swarm <prompt>', 'Run multi-agent Swarm sequence (Architect/Eng/QA)'],
        ['/models', 'List all available models'],
        ['/use <model>', 'Lock a specific model'],
        ['/mode <mode>', 'Set mode: auto, code, reason, debug, plan'],
        ['/provider <name>', 'Set provider'],
        ['/config', 'View or edit global configuration defaults'],
        ['/resume <id>', 'Resume a past session by ID'],
        ['/clear', 'Clear conversation memory'],
        ['/status', 'Show session status'],
        ['/exit', 'Exit ZayCode'],
    ];
    for (const [cmd, desc] of cmds) {
        console.log(`    ${colors.primary(cmd.padEnd(22))} ${colors.dim(desc)}`);
    }

    console.log('');
    console.log(styles.hint('  Tip: Use @filepath in prompts to inject file contents'));
    console.log(styles.hint('  Tip: Press Ctrl+T for the interactive model & mode picker'));
    console.log('');
}

function showModels() {
    console.log('');
    console.log(styles.title('  Available Models'));
    console.log('');

    const providers = registry.getProviders();
    for (const prov of providers) {
        console.log(`  ${colors.provider(prov.toUpperCase())}`);
        const models = registry.getByProvider(prov);
        for (const m of models) {
            const active = state.prop('activeModel') === m.id;
            const prefix = active ? colors.success(icons.dot) : colors.dim(icons.circle);
            const tools = m.tools ? colors.dim(' [tools]') : '';
            console.log(`    ${prefix} ${colors.model(m.id)}  ${colors.dim(m.name)}${tools}`);
        }
        console.log('');
    }

    console.log(`  ${colors.dim('Mode Defaults:')}`);
    const modeDefaults = defaults.getAll();
    for (const [mode, model] of Object.entries(modeDefaults)) {
        console.log(`    ${colors.primary(mode.padEnd(8))} ${icons.arrow} ${colors.model(model)}`);
    }
    console.log('');
    console.log(styles.hint('  Tip: Press Ctrl+T → Select Model for interactive picker'));
    console.log('');
}

function showStatus() {
    const s = state.get();
    console.log('');
    console.log(styles.title('  Session Status'));
    console.log('');
    console.log(`  ${colors.dim('Session:'.padEnd(14))} ${colors.text(s.sessionId)}`);
    console.log(`  ${colors.dim('Mode:'.padEnd(14))} ${colors.primary(s.mode)}`);
    console.log(`  ${colors.dim('Model:'.padEnd(14))} ${colors.model(s.activeModel || '(auto)')}`);
    console.log(`  ${colors.dim('Manual Lock:'.padEnd(14))} ${s.manualOverride ? colors.warning('YES') : colors.dim('no')}`);
    console.log(`  ${colors.dim('Provider:'.padEnd(14))} ${colors.provider(s.provider)}`);
    console.log(`  ${colors.dim('CWD:'.padEnd(14))} ${colors.text(s.cwd)}`);
    console.log(`  ${colors.dim('Git Branch:'.padEnd(14))} ${colors.text(s.gitBranch || 'N/A')}`);
    console.log(`  ${colors.dim('Sandbox:'.padEnd(14))} ${s.sandbox ? colors.warning('ON') : colors.dim('off')}`);
    console.log('');
}

function showConfig() {
    const configManager = require('../core/configManager');
    const conf = configManager.get();

    console.log('');
    console.log(styles.title('  Global Configuration Defaults'));
    console.log('');
    console.log(`  ${colors.dim('Default Mode:'.padEnd(20))} ${colors.primary(conf.defaults.mode || 'auto')}`);
    console.log(`  ${colors.dim('Default Model:'.padEnd(20))} ${colors.model(conf.defaults.model || 'auto')}`);
    console.log(`  ${colors.dim('Temperature:'.padEnd(20))} ${colors.text(conf.defaults.temperature)}`);
    console.log('');
    console.log(styles.hint('  To edit: /config <key> <value> (e.g. /config model qwen/qwen3-coder:free)'));
    console.log('');
}

module.exports = { startInputLoop };
