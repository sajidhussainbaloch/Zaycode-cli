/**
 * core/contextManager.js — Workspace Intelligence
 * 
 * Detects git branch, scans workspace, resolves @file references,
 * and manages context token budget.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const state = require('./state');
const memoryManager = require('./memoryManager');
const ruleEngine = require('./ruleEngine');

/**
 * Detect current git branch
 * @returns {string|null}
 */
function detectGitBranch() {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: state.prop('cwd'),
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        state.setGitBranch(branch);
        return branch;
    } catch {
        state.setGitBranch(null);
        return null;
    }
}

/**
 * Resolve @file references in a prompt.
 * e.g. "look at @src/index.js" → reads the file and injects content
 * 
 * @param {string} prompt
 * @returns {string} Modified prompt with file contents injected
 */
function resolveFileReferences(prompt) {
    const fileRefRegex = /@([^\s]+)/g;
    let match;
    let result = prompt;
    const injectedFiles = [];

    while ((match = fileRefRegex.exec(prompt)) !== null) {
        const ref = match[1];
        const fullPath = path.resolve(state.prop('cwd'), ref);

        try {
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const maxChars = 10000; // Limit per-file injection
                const truncated = content.length > maxChars
                    ? content.slice(0, maxChars) + '\n... (truncated)'
                    : content;

                injectedFiles.push({
                    ref,
                    path: fullPath,
                    size: content.length,
                });

                result = result.replace(
                    `@${ref}`,
                    `\n<file path="${ref}">\n${truncated}\n</file>\n`
                );
            }
        } catch {
            // File doesn't exist or can't be read — leave the reference as-is
        }
    }

    return result;
}

/**
 * Scan workspace for project structure summary.
 * Returns a tree-like overview of the project.
 * 
 * @param {number} maxDepth - Maximum directory depth to scan
 * @returns {string} Project structure string
 */
function scanWorkspace(maxDepth = 3) {
    const cwd = state.prop('cwd');
    const lines = [];

    function walk(dir, depth, prefix) {
        if (depth > maxDepth) return;

        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        // Filter out common junk directories
        const skip = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache', 'coverage']);
        entries = entries.filter(e => !skip.has(e.name) && !e.name.startsWith('.'));

        // Sort: directories first, then files
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const isLast = i === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const childPrefix = isLast ? '    ' : '│   ';

            if (entry.isDirectory()) {
                lines.push(`${prefix}${connector}${entry.name}/`);
                walk(path.join(dir, entry.name), depth + 1, prefix + childPrefix);
            } else {
                lines.push(`${prefix}${connector}${entry.name}`);
            }
        }
    }

    lines.push(path.basename(cwd) + '/');
    walk(cwd, 0, '');

    return lines.join('\n');
}

/**
 * Build a system prompt that includes workspace context
 */
function buildSystemPrompt() {
    const cwd = state.prop('cwd');
    const branch = state.prop('gitBranch') || 'unknown';
    const s = state.get();
    const projectMemory = memoryManager.loadProjectMemory();
    const reasoningLevel = s.deepThinking ? 'Advanced (Deep Thinking ON)' : 'Standard';

    // v7.0: Load workspace guardrails
    ruleEngine.loadRules(cwd);
    const guardrails = ruleEngine.getRulePrompt();

    let prompt = `You are ZayCode, an autonomous AI developer CLI assistant. You are a professional engineering tool built for high-performance software development.

## Capabilities
You have access to tools that let you:
- **Precision Edits:** Use \`apply_diff\` for surgical changes.
- **Discovery:** Discover code via \`get_file_outline\` or \`search_project\`.
- **Diagnostics:** Run lints via \`read_lints\`.
- **Knowledge Persistence:** Record facts via \`remember_fact\` into \`ZAYCODE.md\`.
- **Reasoning Engine (v6.6):** Access parallel reasoning paths and aggregation for high-stakes decisions.

## Workspace Context
- Working directory: ${cwd}
- Git branch: ${branch}
- Mode: ${s.mode}
- Reasoning Level: ${reasoningLevel}
- Current Milestone: ${s.currentMilestone || 'None'}

${guardrails}

## REASONING ENGINE PROTOCOL (v6.6)
When you detect high logical complexity or architectural ambiguity:
1. **Self-Consistency**: Mention in your \`<thinking>\` that you are invoking parallel reasoning.
2. **Evaluation**: Use \`evaluate_prompt\` to score your own planned instructions if they are complex.
3. **Structured Decomposition**: In \`REASON\` mode, follow the "Fact -> Role -> Scenario -> Test -> Conclude" framework.

## ARCHITECT MODE PROTOCOL (PLAN)
If Mode is 'plan', you must focus 100% on codebase discovery and implementation strategy. You represent the "Architect Engineer". You must provide a clear plan in your \`.zaycode_task.md\` and wait for the user to switch to BUILD mode before writing code. **STRICT RULE**: You CANNOT use file-writing or modification tools in this mode. Only read and search tools are available.

## CITATION PROTOCOL (v6.5)
- When discussing specific lines of code, use the following format: \`(file:///absolute/path/to/file#L123-L145)\`.
- Always verify symbol definitions before referencing them in your plan.
- Use \`spawn_research_agent\` for broad "where is X?" searches that don't fit in your main context.

## Project Intelligence (ZAYCODE.md)
${projectMemory || 'No specific project conventions recorded yet.'}

## Agentic Reasoning (Stage 5 Intelligence)
1. **Trace-to-Definition:** Before editing, use \`get_file_outline\` recursively to trace symbols to their original source and understand the full dependency tree.
2. **Dependency-First:** Analyze \`package.json\` or equivalent manifests before proposing changes to the stack.
3. **Memory Citations:** When following a project convention found in \`ZAYCODE.md\`, cite it using \`[[memory:CONVENTION]]\`.
4. **Internal Monologue:** Use XML tags (\`<thinking>\`, \`<plan>\`, \`<current_task>\`) BEFORE tool calls.
5. **Concision:** Non-tool text must be < 4 lines.

## Tool Usage Guidelines:
- **Search-Before-Edit:** MANDATORY discovery phase using \`search_project\` or \`get_file_outline\`.
- **Remembering:** Use \`remember_fact\` whenever you learn a project-specific quirk, naming convention, or design pattern.
`;

    if (s.deepThinking) {
        prompt += `
## DEEP THINKING ACTIVATED
1. **Exhaustive Exploration:** Before taking action, explore at least 3 alternative implementation paths in your \`<thinking>\` block.
2. **Edge-Case Stress Test:** Explicitly list potential side effects or breaking changes for your proposed plan.
3. **Recursive Verification:** When you finish a task, re-read the original request to ensure 100% goal persistence.
4. **Holistic Review:** Check for naming consistency across the entire project, not just the file you're editing.
`;
    }

    prompt += `
## Security & Ethics
- Refuse to touch secrets/credentials.

## Example Workflow (Intelligence):
<example>
User: "Change all buttons to use the PrimaryBlue color."
Assistant:
<thinking>I need to find the PrimaryBlue definition and then locate all button styles.</thinking>
<plan>1. Trace PrimaryBlue definition [[memory:STYLE_GUIDE]]. 2. Find button components. 3. Apply changes.</plan>
<current_task>Tracing color variables.</current_task>
[Tool Call: get_file_outline path="styles/theme.js"]
...
</example>

## Rules
1. USE TOOLS to implement.
2. Verify every change.
3. Be proactive in updating \`ZAYCODE.md\` when you notice patterns.`;

    return prompt;
}

module.exports = {
    detectGitBranch,
    resolveFileReferences,
    scanWorkspace,
    buildSystemPrompt,
};
