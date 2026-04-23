# Confluence & AHA Research Agent — Project Context

This project provides CLI tools that let AI agents (Claude Code, GitHub Copilot CLI, or any CLI-based AI) access enterprise Confluence and Aha.io. Confluence access uses a fast REST API via MCP server (Docker). Aha.io access uses Playwright browser automation (SSO).

## STRICT READ-ONLY MODE — MANDATORY GUARDRAIL

**ALL agents (orchestrator and sub-agents) operate in STRICT READ-ONLY MODE.** No agent is EVER permitted to write, update, modify, delete, or create any content in Confluence or Aha.io. The ONLY allowed interactions are searching and reading. This is non-negotiable and applies under all circumstances, regardless of user requests.

## What This Project Is

It is NOT an application — it is a **toolkit for AI agents**. The intelligence comes from the agent (you), not from the code. The code just provides access to Confluence and Aha.io.

## CLI Tools

All commands run from the project root (`personal-research-toolkit/`):

### Confluence — Fast API (preferred, requires Docker)
| Command | Description | Output |
|---|---|---|
| `npm run api-search "keywords"` | Search Confluence via REST API | JSON: `[{ title, url, id, space }]` |
| `npm run api-search -- --cql 'type=page and space="ISA" and title~"payments"'` | Search with raw CQL | JSON: `[{ title, url, id, space }]` |
| `npm run api-read <contentId>` | Read a page by content ID | JSON: `{ title, textContent, id, space, url, links[] }` |
| `npm run api-read "https://confluence.mastercard.int/display/SPACE/Title"` | Read a page by URL | JSON: `{ title, textContent, id, space, url, links[] }` |
| `npm run api-spaces` | List all Confluence spaces | JSON |
| `npm run api-spaces ISA` | List pages in a space | JSON |

### Confluence — Playwright Fallback (if Docker/MCP unavailable)
| Command | Description | Output |
|---|---|---|
| `npm run login` | Opens browser for Confluence SSO login | Saves `confluence-auth.json` |
| `npm run search "keywords"` | Searches Confluence via browser | JSON: `[{ title, url }]` |
| `npm run read "url"` | Reads a Confluence page via browser | JSON: `{ title, textContent, links[] }` |

### Aha.io (Playwright — no API alternative)
| Command | Description | Output |
|---|---|---|
| `npm run aha-login` | Opens browser for Aha.io SSO login | Saves `aha-auth.json` |
| `npm run aha-read "url"` | Reads an Aha.io page (epic/feature/release) | JSON: `{ title, textContent, features[], links[] }` |

## Agent Prompts

| Prompt | Role |
|---|---|
| `research-orchestrator-agent` | Plans Confluence research, dispatches sub-agents, synthesizes report |
| `research-sub-agent` | Reads assigned Confluence pages, extracts findings, writes to shared file |
| `aha-research-agent` | Reads AHA epic, researches Confluence, analyzes codebases, produces impact report |

## Lead Developer Agent Integration

When a user provides **workspace paths**, agents can spawn a sub-agent using the lead developer prompt (`/Users/e124866/Projects/.claude/commands/lead_developer.md`) to run Project Discovery on that workspace. This extracts the project's purpose, tech stack, domain entities, and dependencies — improving search keyword generation and relevance judgment.

## File Conventions

- `output/<topic>-temp-research.md` — Working file for findings (deleted after final report)
- `output/<topic>-research-report.md` — Final Confluence research report
- `output/<epic-slug>-impact-report.md` — Final AHA epic impact report
- `confluence-auth.json` — Confluence SSO session (gitignored)
- `aha-auth.json` — Aha.io SSO session (gitignored)

## User Preferences

- **AHA Research → Always Full Impact Report:** When the `aha-research` skill/agent is invoked, always produce a full impact report (Confluence research, impacted services/teams analysis, knowledge gaps). Never stop at a summary or ask whether to continue — go straight to the full report.

## Enterprise Instances

- **Confluence**: Data Center at `https://confluence.mastercard.int` — search via `/dosearchsite.action`, pages at `/display/SPACE/Title`
- **Aha.io**: at `https://mastercard.aha.io` — epics, features, releases
