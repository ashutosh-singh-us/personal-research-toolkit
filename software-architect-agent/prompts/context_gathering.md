---
description: "Phases 2-4: Context Gathering — invoke confluence-research-agent, aha-research-agent, and lead_developer sub-agents to gather existing system knowledge, product scope, and codebase analysis before solution design"
---

# Phases 2-4: Context Gathering via Sub-Agents

You are in the context-gathering phases of the Software Architect Agent workflow. Before designing any solutions, you need a clear picture of what already exists, what the product demands, and what the codebase reveals. These three phases run in parallel wherever possible — they feed each other and together they prevent you from designing in a vacuum.

**Read the temp file before starting any phase.** Your problem understanding from Phase 1 is the anchor. Every research question you formulate must trace back to a specific gap identified there.

---

## Phase 2: Existing Systems (Confluence Research)

### Purpose
Understand what is already built, decided, and documented. Avoid re-inventing the wheel or colliding with existing work. Identify prior art, past decisions, known constraints, and existing integration contracts.

### When to invoke confluence-research-agent

Invoke the confluence-research-agent when any of the following are true:
- The problem involves an existing service or system whose internals are not fully known
- The problem touches integration points with other teams' systems
- There may be a prior architecture decision record (ADR), design doc, or past discussion relevant to this problem
- The problem involves a domain (authentication, payments, notifications, etc.) with known enterprise-wide patterns

You do NOT need to invoke this agent if:
- The problem is entirely greenfield with no existing system dependencies
- You already have authoritative documentation from a previous research session

### Prompt location
`/Users/e124866/Projects/personal-research-toolkit/.github/prompts/research-orchestrator-agent.prompt.md`

### How to delegate effectively

Formulate **specific, answerable research questions** — not open-ended exploration. The sub-agent will do better work if it knows exactly what you need and why.

**Delegation brief template:**
```
RESEARCH TASK: [2-4 word label]

QUESTIONS TO ANSWER:
1. [Specific question — e.g., "What is the current architecture of the notification service? How does it route events to consumers?"]
2. [Specific question]
3. [Specific question]

CONTEXT (why this matters):
We are evaluating approaches for [problem statement in 1-2 sentences]. The answers to these questions will determine [what part of the solution design depends on this].

SCOPE BOUNDARY:
Focus on [specific service / domain / team space]. Do NOT spend time on [adjacent areas that are out of scope].

EXPECTED OUTPUT FORMAT:
For each question, provide:
- A direct answer (or note that the answer was not found in Confluence)
- Source: Confluence page title and URL
- Any contradictions or gaps between pages
- Links to related pages worth following up
```

### Research question formulation

Good questions for this phase are driven by the unknowns in your Problem Understanding. For each unknown, ask:

- **Existing system boundaries**: "What does [system X] own? Where does its responsibility end and [system Y]'s begin?"
- **Existing integration contracts**: "What APIs, events, or data contracts does [system X] expose today?"
- **Past decisions**: "Has this problem been discussed before? Was a similar approach tried? What was the outcome?"
- **Known limitations**: "Are there documented scalability limits, reliability issues, or debt in [system X]?"
- **Ownership**: "Which team owns [system X]? Who is the architect or tech lead?"

### Handling results

When the sub-agent returns findings:
- **Synthesize, do not concatenate.** Extract the key facts, not the full prose.
- **Note contradictions.** If two Confluence pages say different things, flag both and note which appears more current.
- **Note gaps.** If the sub-agent reports that documentation does not exist for an area, that is useful signal — it means the real answer must come from a lead_developer codebase analysis or a direct conversation with the team.
- **Do not block on incomplete results.** If Confluence has no documentation for a component, proceed with a labeled assumption: "ASSUMPTION (no Confluence documentation found): [stated assumption]. Confidence: LOW."

### Persist findings

Append to the temp file under:

```markdown
## Context: Existing Systems

### Research Questions Posed
1. [Question]
2. [Question]

### Findings

#### [System or Topic Name]
**Source**: [Confluence page title](url)
- [Key finding 1]
- [Key finding 2]

#### [Another System or Topic]
**Source**: [Confluence page title](url)
- [Key finding]

### Gaps (not found in Confluence)
- [Area] — no documentation found. Proceeding with assumption: [stated assumption].

### Contradictions Identified
- [Topic]: Page A says X; Page B says Y. Page B appears more current (last modified: [date]).
```

---

## Phase 3: Product Scope (Aha.io Research)

### Purpose
Understand what the product team has planned, committed to, and constrained. Architecture must serve product requirements — not the other way around. Identify acceptance criteria, adjacent planned features that may interact with this solution, and the product timeline.

### When to invoke aha-research-agent

Invoke the aha-research-agent when any of the following are true:
- An Aha.io epic or feature URL is provided with the problem statement
- The problem involves product-defined requirements with acceptance criteria that must be met
- There is adjacent planned work in the product backlog that could interact with proposed solutions
- The product timeline is a key constraint and you need to understand delivery milestones

You do NOT need to invoke this agent if:
- The problem is purely technical (infrastructure, refactoring, tech debt) with no direct product requirements
- The user has already provided comprehensive product requirements inline

### Prompt location
`/Users/e124866/Projects/personal-research-toolkit/.github/prompts/aha-research-agent.prompt.md`

### How to delegate effectively

**Delegation brief template:**
```
AHA RESEARCH TASK: [Epic or feature area]

AHA URL: [https://mastercard.aha.io/epics/PROJ-E-123]

QUESTIONS TO ANSWER:
1. What are the explicit acceptance criteria for this epic/feature?
2. Are there adjacent epics or features in the same release that interact with [component X]?
3. What is the planned delivery timeline or milestone?
4. Are there non-functional requirements stated (performance, SLA, volume targets)?
5. What user personas or business processes does this serve?

CONTEXT (why this matters):
We are designing the architecture for [problem in 1-2 sentences]. The product requirements will constrain which solutions are viable.

SCOPE BOUNDARY:
Focus on this epic and any directly linked child features. Do not expand to the full product roadmap.

EXPECTED OUTPUT FORMAT:
- Bullet-point summary of acceptance criteria
- List of adjacent features with brief description of the interaction risk
- Timeline/milestone if present
- Any explicit technical constraints stated in the epic
```

### What to extract from Aha findings

- **Acceptance criteria**: These become your success criteria constraints. Any solution that cannot meet them is eliminated.
- **Volume/performance targets**: If the epic states "must handle 1M events/day," that drives scalability requirements.
- **Adjacent planned work**: If a related epic is planning a data model change in the same area, it may create a collision or an opportunity to combine work.
- **Timeline**: A hard Q2 deadline eliminates solutions with 6-month implementation timelines.
- **Stated technical constraints**: Product teams sometimes name specific technologies ("must use the existing notification service") — document these even if you disagree with them.

### Persist findings

Append to the temp file under:

```markdown
## Context: Product Scope

### Epic Summary
**Epic**: [title]
**Aha Link**: [url]

### Acceptance Criteria
1. [criterion]
2. [criterion]

### Non-Functional Requirements
- [Performance target]
- [Reliability target]
- [Volume target]

### Adjacent Planned Work
- [Epic/Feature title](url) — potential interaction: [describe]

### Timeline
[Milestone or deadline, if found]

### Constraints Stated in Epic
- [Any technical constraints named in the product documentation]

### Gaps
- [What was not found or was ambiguous in the Aha documentation]
```

---

## Phase 4: Codebase Analysis (lead_developer)

### Purpose
Understand the actual state of the code — not what the docs say, but what the code does. Identify architecture patterns in use, tech debt, integration points, and the real dependency graph. This prevents proposing solutions that conflict with how the system actually works.

### When to invoke lead_developer

Invoke the lead_developer sub-agent when any of the following are true:
- A workspace path to a relevant repository is provided
- The problem involves modifying or extending an existing service
- You need to understand how a system is actually structured (patterns, dependencies, entities)
- Confluence documentation is absent or out of date for a codebase

Invoke the lead_developer **once per repository**. If the problem spans 3 codebases, invoke 3 separate lead_developer sub-agents with targeted, codebase-specific questions.

### Prompt location
`/Users/e124866/Projects/personal-research-toolkit/.github/prompts/lead_developer.md`

### Task specification

For each codebase, the task is always:

> "Run Project Discovery (Section 1 only) on the workspace at [absolute path to repo]. Read the context files, identify the tech stack, and then provide a structured summary covering:
> 1. What this service does (domain, purpose, owners)
> 2. Tech stack (language, framework, build tool, key libraries)
> 3. Architecture pattern in use (layered, hexagonal, spec-first API, etc.)
> 4. Key entities and data model (tables, documents, core domain objects)
> 5. Inbound integration points (who calls this service, via what mechanism)
> 6. Outbound integration points (what this service calls, via what mechanism)
> 7. Any relevant tech debt, known issues, or documented limitations
> 8. [Problem-specific question 1 — tie this directly to your Problem Understanding]
> 9. [Problem-specific question 2]"

**Include problem-specific questions.** Generic codebase analysis is less useful than targeted analysis. If you are evaluating whether to add a new column to a database, ask: "What is the current schema for [table]? What migrations exist? Is Flyway or Liquibase in use?"

### Delegation brief template

```
CODEBASE ANALYSIS TASK: [Repo name]

WORKSPACE PATH: [/absolute/path/to/repo]

TASK:
Run Project Discovery (Section 1 only) on this workspace. Then answer these specific questions:

GENERAL (always include):
1. What does this service do? What domain does it own?
2. Tech stack: language, framework, build tool, key libraries
3. Architecture pattern in use
4. Key entities and domain model
5. Inbound integrations (who calls this, via what: REST, event, message queue, etc.)
6. Outbound integrations (what this calls, and how)
7. Known tech debt, limitations, or documented issues

PROBLEM-SPECIFIC (add based on your Phase 1 understanding):
8. [Specific question tied to the problem]
9. [Specific question tied to the problem]

CONTEXT (why this matters):
We are evaluating [problem in 1-2 sentences]. The answers will determine [what decision depends on this analysis].

SCOPE:
Section 1 (Project Discovery) only. Do NOT implement any code changes.
```

### Handling results

- **Synthesize the findings.** The lead_developer will produce a detailed structured output — extract the parts relevant to your problem.
- **Note conflicts with Confluence docs.** If Confluence says the service uses PostgreSQL but the code shows Cosmos DB, flag the discrepancy explicitly.
- **Extract integration contracts.** The actual API surface (endpoints, events, data schemas) matters more than what the docs claim.
- **Note tech debt that affects the solution.** If the service has no test coverage, or uses a deprecated library, or has a known scaling ceiling, these constrain what solutions are viable.

### Persist findings

Append to the temp file under — one section per codebase:

```markdown
## Context: Codebase Analysis — [repo-name]

**Workspace**: [/absolute/path/to/repo]
**Service Purpose**: [what it does]
**Tech Stack**: [language, framework, build tool]
**Architecture Pattern**: [e.g., spec-first REST API with delegate pattern, layered Java/Spring Boot]

### Key Entities
- [Entity name]: [brief description]

### Integration Points
**Inbound** (callers of this service):
- [Caller] via [mechanism: REST / event / queue]

**Outbound** (services this calls):
- [Dependency] via [mechanism]

### Relevant Tech Debt / Limitations
- [Issue]

### Problem-Specific Findings
- [Answer to problem-specific question 1]
- [Answer to problem-specific question 2]

### Conflicts with Documentation
- [Discrepancy found between Confluence docs and actual code]
```

---

## Parallelization Strategy

Run Phases 2, 3, and 4 in parallel wherever possible — they are independent of each other and feed into Phase 5 together.

| Phase | Dependency | Can run parallel with |
|-------|-----------|----------------------|
| Phase 2: Confluence research | Phase 1 complete | Phases 3 and 4 |
| Phase 3: Aha research | Phase 1 complete | Phases 2 and 4 |
| Phase 4: Codebase analysis (per repo) | Phase 1 complete | Phases 2 and 3, and each other |

Dispatch all sub-agents simultaneously. While they run, do not proceed to Phase 5. Collect all results before beginning solution design.

---

## CLI Tools Available

Use these directly if you need to do targeted Confluence lookups without delegating a full sub-agent:

```bash
# Search Confluence
cd /Users/e124866/Projects/personal-research-toolkit && npm run search "keywords here"

# Read a Confluence page
cd /Users/e124866/Projects/personal-research-toolkit && npm run read "https://confluence.mastercard.int/display/SPACE/Page+Title"

# Read an Aha.io page
cd /Users/e124866/Projects/personal-research-toolkit && npm run aha-read "https://mastercard.aha.io/epics/PROJ-E-123"
```

Use these directly for:
- A single targeted page lookup (sub-agent overhead not justified)
- Verifying a URL found in sub-agent findings
- Following a specific link that the sub-agent surfaced but did not read

---

## After Completing Phases 2-4

Before proceeding to Phase 5:
1. Read the temp file in full — confirm all three context sections are populated (or note that a phase was skipped and why)
2. Verify that the context gathered is sufficient to design solutions — if critical unknowns remain, note them as labeled assumptions
3. Proceed to Phase 5: Solution Design
