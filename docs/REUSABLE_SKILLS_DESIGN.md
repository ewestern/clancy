# Reusable Skill Templates Design Document

> Status: **Exploratory** – capturing early thoughts before concrete implementation.  This doc is intentionally separate from the core architecture docs to avoid coupling speculative ideas with committed designs.

## 1 · Why Skill Templates?
Digital employees often need the *same* micro-behaviours ("skills") – e.g., collecting user input, querying a CRM, sending an email.  Re-implementing each behaviour per employee is wasteful.  A **Skill Template** packages

1. A reusable graph topology (nodes + edges)  
2. A declared set of tool invocations & permissions  
3. Parameterised prompts / schemas that specialise the skill at runtime

into a versioned artefact that can be instantiated by the Graph-Creator.

## 2 · Definitions
* **Skill** – a directed graph segment that achieves one logical sub-task ("collect user feedback", "create invoice").
* **Skill Template** – a parameterisable, versioned description of a skill (graph + tools + prompts).  Instantiation == filling parameters + splicing into a larger employee graph.

## 3 · Template Anatomy
Each template is a directory published to a registry (git, S3, DB row, etc.)
```
<skill_id>/<version>/
├── skill.yaml          # metadata + manifest
├── topology.json       # LangGraph (or compatible) node/edge description
├── tools.yaml          # list of tool calls + required scopes
├── prompts/
│   ├── system.md       # fixed system instruction(s)
│   ├── user.md         # parameterised user prompt (Mustache / Handlebars style)
│   └── examples.json   # few-shot examples or schema samples
└── inputs.schema.json  # JSON-Schema describing expected parameters
```

### 3.1 skill.yaml (example)
```yaml
id: human_interaction
version: 1.0.0
name: "Human Interaction"
description: "Collects clarifications from humans via chat UI (options + questions modes)"
author: "core-platform"
inputsSchema: inputs.schema.json
prompts:
  system: prompts/system.md
  user: prompts/user.md
toolsManifest: tools.yaml
topology: topology.json
```

### 3.2 inputs.schema.json
Declares runtime parameters required to materialise the template.  Example snippet:
```jsonc
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["kind", "messages"],
  "properties": {
    "kind": { "enum": ["options", "questions"] },
    "options": {
      "type": "array",
      "items": { "type": "object", "required": ["id", "label"] }
    },
    "questions": {
      "type": "array",
      "items": { "type": "object", "required": ["id", "text"] }
    }
  }
}
```

### 3.3 topology.json
Minimal LangGraph snippet (IDs reference nodes).  Tool-specific config is externalised via template variables so the same topology works for different prompt sets.

## 4 · Instantiation Workflow
1. **Select template** by `id` + `version` (or latest compatible).
2. **Validate parameters** against `inputs.schema.json`.
3. **Render prompts** (Mustache interpolation) with parameters.
4. **Inline topology** into target employee graph; update node IDs to avoid collisions.
5. **Propagate required permissions** to employee manifest.

## 5 · Example – Human Interaction Skill
*Kind = `options`*
```jsonc
parameters = {
  "kind": "options",
  "messages": [
    {
      "role": "assistant",
      "content": "Please choose the CRM you use in your organisation."
    }
  ],
  "options": [
    { "id": "salesforce", "label": "Salesforce" },
    { "id": "hubspot", "label": "HubSpot" },
    { "id": "zoho", "label": "Zoho" }
  ]
}
```
Graph-Creator passes `parameters` → template renders prompts → produces concrete LangGraph nodes ready for execution.

## 6 · Versioning & Compatibility
* **SemVer** for template versions. Breaking changes bump major.  
* Graph-Creator can specify `^1.0` to auto-upgrade patch/minor versions.

## 7 · Validation & Testing
* Unit tests per template: parameter set → expected rendered prompt & node count.  
* Integration harness: spin up minimal LangGraph with mock tools, assert end-to-end flow.

## 8 · Open Questions (tracked for later)
1. Packaging format – zip vs OCI-style tar vs DB.  
2. Template discovery – global registry vs per-org overrides.  
3. Security – template sandboxing & policy evaluation.  
4. UI metadata – icon, colour, grouping for option choices.

---
*This doc captures an early blueprint for reusable skill templates. Details will evolve as we dog-food the Graph-Creator and gather real-world requirements.* 