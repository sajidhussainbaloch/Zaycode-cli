/**
 * core/executor.js — Tool Execution Engine
 * 
 * Dispatches tool calls from the agent loop to the appropriate tool modules.
 * Returns structured results for the model to process.
 */

'use strict';

const fileTools = require('../tools/fileTools');
const shellTools = require('../tools/shellTools');
const gitTools = require('../tools/gitTools');
const searchTools = require('../tools/searchTools');
const symbolTools = require('../tools/symbolTools');
const lintTools = require('../tools/lintTools');
const taskTools = require('../tools/taskTools');
const diffTools = require('../tools/diffTools');
const evalTools = require('../tools/evalTools');
const os = require('os');
const path = require('path');
const fs = require('fs');
const promptRegistry = require('./promptRegistry');
const promptTools = require('../tools/promptTools');
const memoryManager = require('./memoryManager');
const mcpManager = require('./mcpManager');
const renderer = require('../ui/renderer');

const PLUGIN_DIR = path.join(os.homedir(), '.zaycode', 'plugins');

// Tool registry: maps tool names to their handler functions
const TOOL_HANDLERS = {};
const PLUGIN_DEFINITIONS = [];

/** Register all built-in tools */
function _registerBuiltins() {
    TOOL_HANDLERS['read_file'] = fileTools.read_file;
    TOOL_HANDLERS['write_file'] = fileTools.write_file;
    TOOL_HANDLERS['edit_file'] = fileTools.edit_file;
    TOOL_HANDLERS['create_file'] = fileTools.create_file;
    TOOL_HANDLERS['delete_file'] = fileTools.delete_file;
    TOOL_HANDLERS['list_files'] = fileTools.list_files;
    TOOL_HANDLERS['get_file_outline'] = symbolTools.get_file_outline;
    TOOL_HANDLERS['run_shell'] = shellTools.run_shell;
    TOOL_HANDLERS['git_status'] = gitTools.git_status;
    TOOL_HANDLERS['git_diff'] = gitTools.git_diff;
    TOOL_HANDLERS['git_branch'] = gitTools.git_branch;
    TOOL_HANDLERS['git_commit'] = gitTools.git_commit;
    TOOL_HANDLERS['search_project'] = searchTools.search_project;
    TOOL_HANDLERS['search_files'] = searchTools.search_files;
    TOOL_HANDLERS['read_lints'] = lintTools.read_lints;
    TOOL_HANDLERS['todo_write'] = taskTools.todo_write;
    TOOL_HANDLERS['apply_diff'] = diffTools.apply_diff;
    TOOL_HANDLERS['remember_fact'] = async ({ fact }) => await memoryManager.updateProjectMemory(fact);
    TOOL_HANDLERS['mcp_discover_tools'] = async () => {
        const servers = await mcpManager.discoverLocalServers();
        return { success: true, servers: servers.map(s => s.name), message: `Found ${servers.length} MCP servers.` };
    };
    TOOL_HANDLERS['mcp_call_tool'] = async ({ server, tool, arguments: args }) => {
        return { success: false, error: "MCP tool execution requires an active server connection" };
    };
    TOOL_HANDLERS['spawn_research_agent'] = async ({ task, context = [] }) => {
        const SubAgent = require('./subAgent');
        const sa = new SubAgent();
        renderer.info(`[Sub-Agent] Spawning specialized researcher...`);
        const report = await sa.run(task, context);
        return { success: true, report, message: "Sub-agent research completed." };
    };
    TOOL_HANDLERS['evaluate_prompt'] = evalTools.evaluate_prompt;
    TOOL_HANDLERS['check_outdated_prompts'] = async () => {
        const outdated = await promptRegistry.checkOutdated();
        return { success: true, outdated };
    };
    TOOL_HANDLERS['get_prompt_lineage'] = async ({ id }) => {
        const lineage = await promptRegistry.getLineage(id);
        return { success: true, lineage };
    };
    TOOL_HANDLERS['generate_tech_docs'] = promptTools.generate_tech_docs;
    TOOL_HANDLERS['extract_session_prompts'] = promptTools.extract_session_prompts;
    TOOL_HANDLERS['semantic_search'] = searchTools.semantic_search;
}

/**
 * v8.3: Dynamic Plugin Loader
 * Loads .js files from ~/.zaycode/plugins/
 */
function _loadPlugins() {
    if (!fs.existsSync(PLUGIN_DIR)) {
        try { fs.mkdirSync(PLUGIN_DIR, { recursive: true }); } catch (e) { return; }
    }

    const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith('.js'));
    files.forEach(file => {
        try {
            const plugin = require(path.join(PLUGIN_DIR, file));
            if (plugin.tools && Array.isArray(plugin.tools)) {
                plugin.tools.forEach(t => {
                    // Register handler
                    TOOL_HANDLERS[t.definition.function.name] = t.handler;
                    // Register definition
                    PLUGIN_DEFINITIONS.push(t.definition);
                });
                renderer.hint(`[Plugins] Loaded ${plugin.tools.length} custom tools from ${file}`);
            }
        } catch (e) {
            renderer.error(`Failed to load plugin ${file}: ${e.message}`);
        }
    });
}

// Initialize on load
_registerBuiltins();
_loadPlugins();

/**
 * Register a custom tool (from plugins)
 * @param {string} name - Tool name
 * @param {Function} handler - async function(args) => result
 */
function registerTool(name, handler) {
    if (typeof handler !== 'function') {
        throw new Error(`Tool handler for '${name}' must be a function`);
    }
    TOOL_HANDLERS[name] = handler;
}

/**
 * Execute a tool call
 * @param {{ name: string, arguments: object }} toolCall
 * @returns {Promise<{ success: boolean, result: any, error?: string }>}
 */
async function execute(toolCall) {
    const { name, arguments: args } = toolCall;
    const handler = TOOL_HANDLERS[name];

    if (!handler) {
        return {
            success: false,
            result: null,
            error: `Unknown tool: ${name}. Available tools: ${Object.keys(TOOL_HANDLERS).join(', ')}`,
        };
    }

    try {
        const result = await handler(args || {});
        return {
            success: true,
            result,
            error: null,
        };
    } catch (err) {
        return {
            success: false,
            result: null,
            error: `Tool '${name}' failed: ${err.message}`,
        };
    }
}

/**
 * Get all registered tool names
 */
function getToolNames() {
    return Object.keys(TOOL_HANDLERS);
}

/**
 * Get all tool definitions for the API (OpenAI function-calling format)
 */
function getToolDefinitions() {
    return [
        // File tools
        {
            type: 'function',
            function: {
                name: 'read_file',
                description: 'Read the contents of a file. For large files, consider using get_file_outline first to find relevant symbols.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Absolute or relative file path' },
                    },
                    required: ['path'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_file_outline',
                description: 'Quickly get a summary of symbols (classes, functions, methods) in a file without reading the whole file.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to analyze' },
                    },
                    required: ['path'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'write_file',
                description: 'Write content to a file, creating it if it does not exist, overwriting if it does',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to write to' },
                        content: { type: 'string', description: 'Content to write' },
                    },
                    required: ['path', 'content'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'edit_file',
                description: 'Edit a file by replacing specific strings. Supports multiple non-contiguous chunks.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to edit' },
                        chunks: {
                            type: 'array',
                            description: 'List of search/replace pairs',
                            items: {
                                type: 'object',
                                properties: {
                                    search: { type: 'string', description: 'Exact text to find' },
                                    replace: { type: 'string', description: 'Text to replace it with' },
                                },
                                required: ['search', 'replace'],
                            }
                        },
                        // Legacy support
                        search: { type: 'string', description: 'Legacy: Exact text to find' },
                        replace: { type: 'string', description: 'Legacy: Replacement text' },
                    },
                    required: ['path'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'create_file',
                description: 'Create a new file with content. Fails if file already exists.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to create' },
                        content: { type: 'string', description: 'Initial file content' },
                    },
                    required: ['path', 'content'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'delete_file',
                description: 'Delete a file at the given path',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to delete' },
                    },
                    required: ['path'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'list_files',
                description: 'List files and directories in the given directory path',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Directory path to list' },
                        recursive: { type: 'boolean', description: 'Whether to list recursively (default false)' },
                    },
                    required: ['path'],
                },
            },
        },
        // Shell tools
        {
            type: 'function',
            function: {
                name: 'run_shell',
                description: 'Execute a shell command and return stdout, stderr, and exit code',
                parameters: {
                    type: 'object',
                    properties: {
                        command: { type: 'string', description: 'Shell command to execute' },
                        cwd: { type: 'string', description: 'Working directory (optional, defaults to project root)' },
                    },
                    required: ['command'],
                },
            },
        },
        // Git tools
        {
            type: 'function',
            function: {
                name: 'git_status',
                description: 'Get the current git status of the working directory',
                parameters: { type: 'object', properties: {}, required: [] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'git_diff',
                description: 'Get the git diff of current changes',
                parameters: {
                    type: 'object',
                    properties: {
                        staged: { type: 'boolean', description: 'Show staged changes only (default false)' },
                    },
                    required: [],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'git_branch',
                description: 'Get current branch name and list all branches',
                parameters: { type: 'object', properties: {}, required: [] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'git_commit',
                description: 'Stage all changes and create a git commit with the given message',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'Commit message' },
                    },
                    required: ['message'],
                },
            },
        },
        // Search tools
        {
            type: 'function',
            function: {
                name: 'search_project',
                description: 'Search for a text pattern across all project files (like grep)',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Text or regex pattern to search for' },
                        path: { type: 'string', description: 'Directory to search in (default: project root)' },
                    },
                    required: ['query'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'search_files',
                description: 'Find files by name pattern (glob)',
                parameters: {
                    type: 'object',
                    properties: {
                        pattern: { type: 'string', description: 'Glob pattern like *.js or **/*.test.ts' },
                        path: { type: 'string', description: 'Directory to search in (default: project root)' },
                    },
                    required: ['pattern'],
                },
            },
        },
        // Killer Pattern Tools
        {
            type: 'function',
            function: {
                name: 'read_lints',
                description: 'Run lints and diagnostics on the codebase. Supports ESLint and basic syntax checks.',
                parameters: {
                    type: 'object',
                    properties: {
                        directory: { type: 'string', description: 'Directory to lint (default: project root)' },
                    },
                    required: [],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'todo_write',
                description: 'Manage the persistent .zaycode_task.md file for tracking goals.',
                parameters: {
                    type: 'object',
                    properties: {
                        action: { type: 'string', enum: ['add', 'update', 'delete'], description: 'Action to perform' },
                        task: { type: 'string', description: 'The task description' },
                        status: { type: 'string', enum: ['todo', 'progress', 'done'], description: 'Task status (for update action)' },
                    },
                    required: ['action', 'task'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'apply_diff',
                description: 'Apply surgical SEARCH/REPLACE blocks to a file. Use this for precise edits to large files.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'File path to edit' },
                        diff: {
                            type: 'string',
                            description: 'One or more blocks: <<<<<<< SEARCH\\n[old]\\n=======\\n[new]\\n>>>>>>> REPLACE'
                        },
                    },
                    required: ['path', 'diff'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'remember_fact',
                description: 'Save an important project-specific convention or fact to ZAYCODE.md for future reference.',
                parameters: {
                    type: 'object',
                    properties: {
                        fact: { type: 'string', description: 'The convention or observation to remember.' },
                    },
                    required: ['fact'],
                },
            },
        },
        // MCP Tools (v6.4)
        {
            type: 'function',
            function: {
                name: 'mcp_discover_tools',
                description: 'Discover available tools from local MCP servers configured in ~/.zaycode/mcp_config.json',
                parameters: { type: 'object', properties: {}, required: [] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'mcp_call_tool',
                description: 'Call a tool on a specific MCP server.',
                parameters: {
                    type: 'object',
                    properties: {
                        server: { type: 'string', description: 'Name of the MCP server' },
                        tool: { type: 'string', description: 'Name of the tool to call' },
                        arguments: { type: 'object', description: 'Arguments for the tool' },
                    },
                    required: ['server', 'tool', 'arguments'],
                },
            },
        },
        // Agentic Platform Tools (v6.5)
        {
            type: 'function',
            function: {
                name: 'spawn_research_agent',
                description: 'Spawn a stateless sub-agent to perform deep research or codebase exploration. Useful for complex questions like "which file does X?"',
                parameters: {
                    type: 'object',
                    properties: {
                        task: { type: 'string', description: 'Detailed research task description' },
                        context: { type: 'array', items: { type: 'object' }, description: 'Relevant conversation history snippets' },
                    },
                    required: ['task'],
                },
            },
        },
        // Reasoning Engine Tools (v6.6)
        {
            type: 'function',
            function: {
                name: 'evaluate_prompt',
                description: 'Evaluate a prompt candidate using LLM-as-a-judge. Returns scores and feedback.',
                parameters: {
                    type: 'object',
                    properties: {
                        promptToEval: { type: 'string', description: 'The prompt text to evaluate' },
                        taskContext: { type: 'string', description: 'Optional context about what the prompt is for' },
                        criteria: { type: 'array', items: { type: 'string' }, description: 'Criteria to score (default: clarity, specificity, relevance)' },
                    },
                    required: ['promptToEval'],
                },
            },
        },
        // Prompt Registry Tools (v6.7)
        {
            type: 'function',
            function: {
                name: 'check_outdated_prompts',
                description: 'Scan the registry for prompt variants whose parent instructions have been updated.',
                parameters: { type: 'object', properties: {} },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_prompt_lineage',
                description: 'Retrieve the ancestry tree (parent history) of a specific prompt ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'ID of the prompt to trace' },
                    },
                    required: ['id'],
                },
            },
        },
        // Prompt Excellence Tools (v6.9)
        {
            type: 'function',
            function: {
                name: 'generate_tech_docs',
                description: 'Automatically create high-quality markdown technical documentation based on the current session context.',
                parameters: { type: 'object', properties: {} },
            },
        },
        {
            type: 'function',
            function: {
                name: 'extract_session_prompts',
                description: 'Extract and format all user prompts from the current session history into a clean list.',
                parameters: { type: 'object', properties: {} },
            },
        },
        // Mastermind Tools (v8.0)
        {
            type: 'function',
            function: {
                name: 'semantic_search',
                description: 'Search for code patterns and logic by intent and meaning rather than exact string matches.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The semantic query or intent to search for' },
                    },
                    required: ['query'],
                },
            },
        },
    ].concat(PLUGIN_DEFINITIONS);
}

const executor = { execute, registerTool, getToolDefinitions, getToolNames };
module.exports = executor;
