# SECONDARY PROMPT LIBRARY ANALYSIS (v7.0)

This report deconstructs the `D:\Musab\Data\PromptLibrary` patterns and maps them to ZayCode v7.0 features.

## 1. Feature: Workspace Guardrails (Rule Engine)
**Source Pattern**: `prompts/cusor-rule-sample.md`
**CLI Component**: `core/ruleEngine.js`
**Pattern**: Enforcement of coding styles (TS, Functional, naming, early returns).

### Python Skeleton (Proposed)
```python
class RuleEngine:
    """
    Loads .zaycoderules from the workspace root.
    Injects style constraints (TS, Functional, Early Returns) into the prompt.
    """
    def load_rules(self, path):
        # Read .zaycoderules or .cursorrules
        # Parse Markdown requirements
        # Convert to bullet-point prompt injection
        pass

    def get_active_constraints(self):
        # Return currently active guardrails
        pass
```

---

## 2. Feature: Performance Optimization Mode
**Source Pattern**: `prompts/code-optimization-assistant.md`
**CLI Component**: `index.js` (/optimize command)
**Pattern**: Big O analysis and performance hotspots.

### Python Skeleton (Proposed)
```python
class OptimizationAssistant:
    """
    Analyzes code for performance bottlenecks.
    Triggers on '/optimize' or 'how to make this faster'.
    """
    def analyze_complexity(self, code_snippet):
        # Direct the model to perform Big O analysis
        # Suggest cache points, loop unrolling, or algorithm changes
        pass
```

---

## 3. Feature: Professional API Documentation (Sub-mode)
**Source Pattern**: `prompts/api-documentation-generator.md`
**CLI Component**: `tools/promptTools.js` (upgrade `/doc`)
**Pattern**: 6-section detailed API documentation structure.

### Python Skeleton (Proposed)
```python
class APIDocGenerator:
    """
    Generates professional documentation for endpoints.
    Includes Auth, Endpoint Specs, Responses, and Errors.
    """
    def document_endpoints(self, code_context):
        # Extract endpoints, methods, and parameters
        # Format using the 6-point Markdown template
        # Include successful and failed response examples
        pass
```

---

## 4. Feature: High-Precision Component Rules
**Source Pattern**: UI/Logos/Data Analysis Prompts
**CLI Component**: `core/router.js` (DATA mode)
**Pattern**: Specialized logic for data visualization and analysis.
