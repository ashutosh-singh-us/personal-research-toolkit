# Lead Developer Agent Integration

## When to Invoke

Invoke the lead_developer sub-agent when the architect needs to understand:
- A specific codebase's structure, patterns, and architecture
- Dependencies and integration points of an existing service
- Tech debt, risks, and known issues in a codebase
- What technology stack and frameworks are in use
- How existing services are wired together (Spring config, API contracts, etc.)

## How to Invoke

Spawn a sub-agent using the lead developer prompt:

**Prompt location**: `/Users/e124866/Projects/personal-research-toolkit/.github/prompts/lead_developer.md`

### Key Rule: One Sub-Agent Per Codebase

If the problem spans multiple codebases, invoke lead_developer **ONCE PER CODEBASE** with targeted questions. Do not ask a single agent to analyze multiple repos.

### Task: Project Discovery Only

For architectural analysis, you typically need only **Section 1: Project Discovery** from the lead developer agent. Do NOT ask it to decompose tasks, write code, or do code review — that is not the architect's job.

**Example delegation:**
```
Run Project Discovery (Section 1 only) on the workspace at /Users/e124866/Projects/webhook-service.

Read context files (.context/, .claude/CLAUDE.md), identify the tech stack from the build file,
and understand the architecture.

Provide a concise summary covering:
1. What this service does (purpose, domain)
2. Tech stack and key frameworks (Java version, Spring Boot version, database, etc.)
3. Architecture patterns in use (layered, spec-first API, delegate pattern, etc.)
4. Key entities, domain objects, and API endpoints
5. Upstream/downstream dependencies and integration points
6. Tech debt, known risks, or architectural concerns
7. Authentication/security patterns

Focus on information that is relevant to adding delivery status tracking.
Keep the summary under 500 words.

Write findings to /Users/e124866/Projects/personal-research-toolkit/output/webhook-delivery-status-tracking-temp-analysis.md
under the heading "## Context: Codebase Analysis -- webhook-service".
```

### What NOT to Ask For

- Do NOT ask for task decomposition (Section 3) — the architect decomposes differently
- Do NOT ask for code review (Section 4) — not relevant to architectural analysis
- Do NOT ask for code generation — the architect produces analysis, not code
- Do NOT ask for "analyze everything" — give targeted questions about what matters

## Expected Output

The lead_developer agent produces findings in this format:

```markdown
## Context: Codebase Analysis -- [service-name]

### Tech Stack
| Component | Technology |
|-----------|-----------|
| Language | Java 17 |
| Framework | Spring Boot 3.x |
| Build | Maven |
| Database | PostgreSQL (prod), H2 (test) |
| API Design | OpenAPI 3.0, delegate pattern |
| ... | ... |

### Architecture Overview
[Brief description of the service architecture, key components, and patterns]

### Key Entities & Endpoints
- [Entity/Endpoint]: [purpose]

### Dependencies
**Upstream** (services that call this):
- [Service]: [how/why]

**Downstream** (services this calls):
- [Service]: [how/why]

### Integration Points
- [Integration]: [protocol, contract, data format]

### Tech Debt & Risks
- [Issue]: [severity, impact on the proposed change]

### Relevant Findings for Architecture Decision
- [Finding specific to the problem being analyzed]
```

## Handling Failures

If the lead_developer agent:
- **Cannot find context files**: The codebase may not have `.context/` or `CLAUDE.md`. The agent will still discover the tech stack from build files. Results may be less detailed.
- **Returns very detailed output**: Extract only what's relevant to the architectural decision. The lead developer prompt is thorough — you may need to summarize.
- **Cannot read the repo path**: Verify the path exists. Ask the user if the path is correct.
- **Finds patterns that conflict with Confluence docs**: Flag the discrepancy explicitly. Codebase is the ground truth for "what exists"; Confluence may be outdated.

## Multiple Codebases

When analyzing multiple repos:

1. Spawn one lead_developer sub-agent per repo (can run in parallel)
2. Give each a unique heading in the temp file: `## Context: Codebase Analysis -- [service-name]`
3. After all complete, synthesize findings:
   - How do the codebases relate to each other?
   - Are there shared patterns or divergent approaches?
   - Where are the integration boundaries?
   - Does the dependency graph create constraints on the architecture?
