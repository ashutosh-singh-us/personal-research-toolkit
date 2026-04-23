# Confluence Research Agent — Architecture & Design Context

## Design Philosophy

The AI agent (Claude Code, Copilot CLI, etc.) is the brain. MCP servers are the hands. This project deliberately does NOT embed any LLM logic in the code — the agent prompt files define all research behavior.

```
User asks a question
    │
    ▼
┌───────────────────────────────────────┐
│ Research Orchestrator Agent           │
│ (AI agent running in CLI)             │
│                                       │
│ 1. Parses question → keywords         │
│ 2. search_confluence_content (MCP)    │
│ 3. Reviews results                    │
│ 4. Decides: solo or multi-agent?      │
│                                       │
│ If multi-agent:                       │
│ ├── Spawns Sub-Agent 1 ──┐            │
│ ├── Spawns Sub-Agent 2 ──┤            │
│ └── Spawns Sub-Agent 3 ──┤            │
│                           │            │
│                           ▼            │
│     <topic>-temp-research.md           │
│                           │            │
│ 5. Reads temp file        ◄            │
│ 6. Writes <topic>-research-report.md   │
│ 7. Deletes temp file                   │
└───────────────────────────────────────┘
    │
    ▼
output/<topic>-research-report.md (delivered to user)
```

For AHA epic impact analysis architecture, see `aha-research-context.md`.

## Why MCP Servers Over Browser Automation

- **No SSO/login headaches**: MCP servers use API tokens (PAT for Confluence, API key for Aha.io) — no interactive browser login, no session expiry
- **Faster**: REST API calls vs. launching a Chromium browser
- **More reliable**: No CSS selector breakage when UIs update
- **Portable**: MCP servers run in Docker — same setup on any machine
- **CQL support**: Confluence MCP enables advanced CQL queries (space filters, date ranges, labels)
- **Transferrable**: MCP protocol is supported by Copilot Studio, enabling future Teams integration

## Sub-Agent Design

Each sub-agent:
- Gets its own context window (isolated from orchestrator and other sub-agents)
- Is given specific URLs to read or searches to perform
- Writes findings to a shared temp file (append-only)
- Does not know about other sub-agents or the overall research plan

The orchestrator coordinates by:
- Reading the temp file to see all accumulated findings
- Persisting its own findings there too (avoids context window overflow)
- Producing the final report once all research is done
- Deleting the temp file after synthesis

## Context Rot Prevention

The temp file pattern (`<topic>-temp-research.md`) exists to solve a fundamental problem: AI agents have finite context windows that degrade as they fill up. By having all agents (orchestrator + sub-agents) write to a shared file:
- No findings are lost even if an agent's context overflows
- The orchestrator gets a fresh, complete view when it reads the file at synthesis time
- Multiple parallel sub-agents can work without conflicting

## Confluence Data Center URL Patterns

- Homepage: `https://host/index.action`
- Space page: `https://host/display/SPACENAME/Page+Title`
- Page by ID: `https://host/pages/viewpage.action?pageId=12345`
- Search: `https://host/dosearchsite.action?queryString=keywords`

## Technology Stack

- **Runtime**: Node.js (ESM modules)
- **MCP Servers**: Confluence (Docker, port 3998), Jira (Docker, port 3999), Aha.io (Docker, port 4000)
- **Config**: dotenv
- **AI Agent Frameworks**: Claude Code (CLAUDE.md + commands), GitHub Copilot CLI (.github/prompts)
- **Supporting Agents**: Lead Developer Agent (codebase analysis)
