# ZayCode v6.8: Technical Architecture Deep-Dive

This document provides a 100% comprehensive analysis of the ZayCode CLI architecture, covering its core engines, visual systems, and agentic reasoning patterns.

## 1. Core Orchestration Layer
ZayCode is built on a decoupled, event-driven architecture designed for high-performance autonomous coding.

- **`index.js` (The Orchestrator)**: The entry point. It initializes the `AppState` singleton, sets up `Memory`, and starts the `startInputLoop`. It also handles global session resumption and command routing for specialized modes like `/swarm` or `/reason`.
- **`core/state.js` (The Nervous System)**: A centralized `AppState` (EventEmitter) that tracks the "Mode", "Model", "CWD", and "Context Usage". It ensures every component stays in sync without direct coupling.
- **`core/agent.js` (The Brain)**: Implements the recursive autonomous loop. It manages the thinking process, coordinates with the `executor`, and handles model fallbacks (auto-switching to free models if credits are low).

## 2. Intelligence & Reasoning (DNA)
ZayCode uses "Cursor-grade" reasoning patterns discovered in industry-leading AI tools.

- **`core/router.js`**: An intent-based classification engine. It analyzes user prompts using keyword weights (e.g., "refactor" → `CODE` mode, "roadmap" → `PLAN` mode) to select the optimal model.
- **`core/contextManager.js`**: Handles "Workspace Intelligence". It resolves `@file` references (injecting real code into prompts) and builds the massive **System Prompt** that defines ZayCode's personality and safety rules.
- **XML Reasoning**: The system prompt enforces the use of `<thinking>`, `<plan>`, and `<current_task>` tags. This forces the LLM to "deliberate" before acting, significantly reducing hallucinations.

## 3. The Execution Engine (The Hands)
ZayCode interacts with your machine through a structured tool system.

- **`core/executor.js`**: The central dispatcher. It defines the JSON-Schema for all 30+ tools and routes model-generated `tool_calls` to the specific modules.
- **`tools/diffTools.js`**: One of the most important components. It implements the **SEARCH/REPLACE** pattern, allowing ZayCode to edit 5000+ line files with zero corruption by only targeting specific "surgical" chunks.
- **`tools/symbolTools.js`**: Extracts file outlines (classes/methods) using regex, enabling "Outline-First Discovery" to save tokens.

## 4. Visual & Interaction System (The Skin)
The v6.8 overhaul provides a premium, responsive CLI experience.

- **`ui/input.js`**: A custom raw-keyboard listener (replacing standard readline). It supports:
    - **Mode Switching**: Tapping `Tab` to cycle modes.
    - **Autocomplete (v6.8.1)**: Real-time dropdown selection for slash-commands with arrow-key navigation.
    - **UI Protection**: High-precision cursor math that ensures the logo and header remain static while the input area scrolls.
- **`ui/renderer.js`**: The visual engine that renders tool calls with box-drawing characters and formats model outputs into "Professional" streamed blocks.

## 5. Persistence & Memory
- **`core/memory.js`**: Manages the conversation history, including token estimation and dynamic context pruning (v6.4) to stay within model limits.
- **`core/memoryManager.js`**: Maintains the `ZAYCODE.md` project-level memory, where conventions and naming patterns are permanently recorded.

---
**Summary Performance Metadata**:
- **Architecture**: Modular Monolith ( decoupled via `core/state.js`)
- **Primary Language**: Node.js (Vanilla ES6)
- **Extensibility**: Plugin-ready via `core/executor.js:registerTool`
