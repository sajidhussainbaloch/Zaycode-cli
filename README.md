# Zaycode CLI

A command-line tool for Zaycode.

## Installation

### 1. Clone the repository
```
git clone https://github.com/your-username/your-repo.git
cd "Zaycode cli"
```

### 2. Install dependencies
```
npm install
```

### 3. Link the CLI globally
This allows you to use `zaycode` from anywhere on your system:
```
npm link
```

### 4. Usage
Run the CLI with:
```
zaycode
```

## Updating the CLI
If you make changes to the code, run `npm link` again to update the global link.

## Uninstalling the CLI
To remove the global link:
```
npm uninstall -g zaycode
```

---

Replace the repository URL above with your actual GitHub repo URL.

---

## Features & Walkthrough

### Core CLI Commands

- **/swarm [free] <task>**: Multi-agent Swarm Mode for complex tasks. Add 'free' to use free agents.
- **/reason**: Toggle Deep Thinking Mode (extended chain-of-thought reasoning).
- **/eval <prompt>**: Evaluate a prompt and get feedback and scoring.
- **/prompt [save|list|check]**: Manage prompt registry (save, list, or check outdated prompts).
- **/m**: Open the interactive command menu.
- **/consolidate**: Consolidate session outputs (Session Consolidator).
- **/optimize**: Analyze code for performance bottlenecks and get optimization suggestions.

### Major Features

- **Context Handover Pipeline**: Summarizes user/AI context for model switching. (core/pipelineManager.js)
- **Automated Technical Documentation**: Generates markdown docs after debugging. (tools/promptTools.js)
- **Prompt Isolation Engine**: Extracts only user-written prompts from session logs. (tools/promptTools.js)
- **Session Consolidator**: Merges and summarizes session outputs. (index.js)
- **Workspace Guardrails**: Enforces coding style and rules via rule engine. (core/ruleEngine.js)
- **Performance Optimization Mode**: Big O analysis and performance suggestions. (index.js)
- **Professional API Documentation**: Generates detailed API docs for endpoints. (tools/promptTools.js)
- **High-Precision Component Rules**: Specialized logic for data visualization and analysis. (core/router.js)

### Plugin Support

- Example plugin: Adds custom tools (e.g., 'calculate_sum') and hooks into model calls.

---

For more details, see the PROMPT_ANALYSIS_REPORT.md and PROMPT_ANALYSIS_V7_REPORT.md files.

---

## Setting Your OpenRouter API Key

Zaycode CLI requires an OpenRouter API key to function. You can provide your API key in one of two ways:

### 1. Using the .env file (recommended for local development)

Create a file named `.env` in the project root and add:

```
OPENROUTER_API_KEY=your-api-key-here
```

### 2. Using the global config file (for global installs or multiple projects)

Edit (or create) the config file at:
`%USERPROFILE%\.zaycode\config.json` (Windows)
or
`~/.zaycode/config.json` (Mac/Linux)

Add your API key under the `providers.openrouter.apiKey` field:

```json
{
	"providers": {
		"openrouter": {
			"apiKey": "your-api-key-here",
			"baseUrl": "https://openrouter.ai/api/v1/chat/completions"
		}
	},
	...
}
```

---

If you do not set your API key, the CLI will not be able to connect to OpenRouter.
