# AHA Research Agent — Architecture & Design Context

## Purpose

The AHA Research Agent exists to bridge the gap between **planning** (Aha.io) and **institutional knowledge** (Confluence + codebases). When product teams plan epics for the next quarter, engineering teams need to understand what services are impacted, what documentation exists, which teams need to coordinate, and where code changes will be required. This agent automates that analysis.

## Architecture Overview

```
User provides AHA epic URL + optional workspace paths
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ AHA Research Agent (Orchestrator of Orchestrators)           │
│                                                              │
│ Phase 1: Read AHA Epic                                       │
│ ├── get_aha_epic (MCP) or npm run aha-read                   │
│ ├── Extract features, themes, scope                          │
│ └── get_aha_feature for sub-features (up to 5)               │
│                                                              │
│ Phase 2: Identify Research Topics                            │
│ ├── Service names, domains, integrations                     │
│ └── Business terminology, API patterns                       │
│                                                              │
│ Phase 3: Gather Project Context (if workspace paths given)   │
│ ├── Spawns Lead Developer Agent(s) ──┐                       │
│ │   └── Project Discovery (Section 1)│                       │
│ │       └── Purpose, stack, entities,│                       │
│ │           dependencies, terminology│                       │
│ │                                    ▼                       │
│ │              <epic>-temp-research.md                        │
│ │                                                            │
│ Phase 4: Confluence Research                                 │
│ ├── Spawns /confluence-research sub-agents ──┐               │
│ │   ├── Sub-agent 1: Search + read topic A   │               │
│ │   ├── Sub-agent 2: Search + read topic B   │               │
│ │   └── Sub-agent 3: Search + read topic C   │               │
│ │                                            ▼               │
│ │              <epic>-temp-research.md (append)               │
│ │                                                            │
│ Phase 5: Impact Analysis                                     │
│ ├── Map features → services                                  │
│ ├── Identify teams/owners                                    │
│ ├── Code change areas per service                            │
│ ├── Cross-team dependencies                                  │
│ ├── Knowledge gaps                                           │
│ └── Risks                                                    │
│                                                              │
│ Phase 6: Synthesize Impact Report                            │
│ ├── Read temp file in full                                   │
│ ├── Write <epic>-impact-report.md                            │
│ └── Delete temp file                                         │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
output/<epic-slug>-impact-report.md (delivered to user)
```

## How It Differs From the Confluence Research Agent

| Aspect | Confluence Research Agent | AHA Research Agent |
|--------|--------------------------|-------------------|
| **Input** | User's question (text) | AHA epic URL + optional workspace paths |
| **Source of topics** | User provides the topic | Topics extracted from AHA epic |
| **Output** | Research report (knowledge synthesis) | Impact report (planning analysis) |
| **Scope** | Single topic, deep research | Multi-topic, broad impact analysis |
| **Relationship** | Standalone or sub-agent | Orchestrator that spawns confluence-research agents |
| **Key insight** | "Here's what exists" | "Here's what's impacted and what's missing" |

## Agent Hierarchy

```
/aha-research (top-level orchestrator)
├── Lead Developer Agent (codebase analysis)
│   └── Reads: build files, context files, source code
├── /confluence-research (documentation research)
│   └── Research Sub-Agents
│       └── Search/read Confluence pages (MCP)
└── Direct MCP tools (for quick lookups)
    ├── Aha.io MCP (get_aha_epic, get_aha_feature, etc.)
    └── Confluence MCP (search_confluence_content, get_confluence_content, etc.)
```

The AHA agent is a **higher-level orchestrator** — it doesn't replace the confluence-research agent, it delegates to it. This composition model means:
- Each agent stays focused on its job
- The confluence-research agent can still be used independently
- The AHA agent benefits from all improvements to the confluence-research agent

## Aha.io Integration Details

### Authentication
- REST API with API key (Bearer token)
- API key generated at: Aha.io > Settings > Personal > Developer
- No browser login or session management required

### MCP Server (port 4000)
The Aha.io MCP server provides:
- `get_aha_epic` — Epic with description and child features
- `get_aha_feature` — Feature with description and requirements
- `get_aha_features_for_epic` — List features under an epic
- `get_aha_requirements` — List requirements under a feature
- `get_aha_requirement` — Individual requirement
- `search_aha_features` — Search features by name

### URL Patterns
- Epics: `https://<company>.aha.io/epics/<ID>`
- Features: `https://<company>.aha.io/features/<ID>`
- Releases: `https://<company>.aha.io/releases/<ID>`
- Requirements: `https://<company>.aha.io/requirements/<ID>`

### Content Extraction
The MCP tools and CLI return:
- **title** — Epic/feature/requirement name
- **reference** — Aha.io reference number (e.g., PROJ-E-123)
- **textContent** — Description (HTML stripped to text)
- **status** — Workflow status
- **features[]** — Child features/requirements with references, statuses, URLs
- **links[]** — Related Aha.io links

## Impact Report Structure

The final output (`<epic-slug>-impact-report.md`) is designed to be immediately actionable by engineering leads:

1. **Executive Summary** — What the epic is about and key findings
2. **Epic Breakdown** — Feature-by-feature with impacted services, code areas, and related docs
3. **Impacted Services Table** — Service name, impact level, change type, team/owner
4. **Cross-Team Dependencies** — Coordination needs, shared APIs, deployment ordering
5. **Code Change Areas** — Per-service module-level impact with change type
6. **Existing Documentation** — Confluence pages relevant to the epic work
7. **Knowledge Gaps** — Topics needing documentation (valuable finding for team leads)
8. **Risks & Considerations** — Complexity, coordination needs, blockers
9. **Recommended Next Steps** — Actionable items for planning

## Design Decisions

### Why MCP Over Playwright for Aha.io
- **No browser overhead**: REST API calls are faster and use less resources than Chromium
- **No session management**: API key doesn't expire like SSO sessions (8-24 hours)
- **More reliable content extraction**: Structured JSON from API vs. fragile CSS selectors on SPA
- **Docker-portable**: Same MCP server pattern as Confluence and Jira
- **Copilot Studio compatible**: MCP protocol enables future Teams bot integration

### Why a Separate Agent (Not an Extension)
- **Single Responsibility**: Confluence agent researches knowledge. AHA agent does planning & impact analysis. Different job functions.
- **Composition**: AHA agent uses confluence-research agent as a sub-agent. Cleaner than mixing responsibilities.
- **Reusability**: Confluence agent remains independently useful.
- **Output Difference**: Research report vs. impact report — fundamentally different deliverables.

### Why Temp Files for Context Persistence
- AI agents have finite context windows that degrade with volume (context rot)
- Multiple sub-agents working in parallel need a shared state
- Writing to a temp file ensures no findings are lost even if an agent's context overflows
- The orchestrator reads the full temp file at synthesis time — getting a fresh, complete view
- Temp file is deleted after synthesis — it's a working artifact, not a deliverable

## Technology Stack

- **Runtime**: Node.js (ESM modules)
- **MCP Servers**: Confluence (Docker, port 3998), Jira (Docker, port 3999), Aha.io (Docker, port 4000)
- **Config**: dotenv
- **AI Agents**: Claude Code (CLAUDE.md + commands), GitHub Copilot CLI (.github/prompts)
- **Supporting Agent**: Lead Developer Agent (codebase analysis)
