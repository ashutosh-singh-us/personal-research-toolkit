# Confluence Research Agent Integration

## When to Invoke

Invoke the confluence-research-agent when the architect needs to understand:
- What services or systems already exist in the problem domain
- Past design decisions and their rationale
- Prior art — has something similar been attempted before?
- Known limitations or constraints documented by other teams
- Existing integration points, API contracts, and data flows
- Architectural patterns established in the org

## How to Invoke

### Option 1: Spawn as Sub-Agent (Recommended for Broad Research)

Spawn a sub-agent using the research orchestrator prompt:

**Prompt location**: `/Users/e124866/Projects/personal-research-toolkit/.github/prompts/research-orchestrator-agent.prompt.md`

Provide the sub-agent with:
1. **Specific research questions** — NOT "tell me everything about X"
2. **Context about WHY** — what architectural decision this informs
3. **Scope boundary** — which domain, service, or system area to focus on
4. **Expected output** — what structured information you need back

**Example delegation:**
```
Research the existing webhook delivery infrastructure in Confluence.
I need to understand:
1. What services currently handle webhook dispatch and delivery?
2. What retry/delivery tracking mechanisms exist today?
3. Are there any documented limitations or known issues with the current approach?
4. What integration contracts exist between the webhook service and its consumers?

This information will inform an architectural decision about adding real-time delivery
status tracking. Focus on webhook-related services only — not general notification systems.

Write findings to /Users/e124866/Projects/personal-research-toolkit/output/webhook-delivery-status-tracking-temp-analysis.md
under the heading "## Context: Existing Systems".
```

### Option 2: Direct Search (For Quick Lookups)

For targeted, narrow questions where you already know what to search for:

```bash
cd /Users/e124866/Projects/personal-research-toolkit && npm run search "webhook delivery architecture"
```

Then read specific pages:
```bash
cd /Users/e124866/Projects/personal-research-toolkit && npm run read "https://confluence.mastercard.int/display/SPACE/Page+Title"
```

Use direct search when:
- You need a quick answer to a specific question
- You already know the keywords and likely page titles
- The research scope is narrow (1-3 pages)

Use a sub-agent when:
- The topic is broad and may span multiple pages
- You need to follow links between related pages
- The research requires keyword variations to find relevant content

## Expected Output

The confluence-research-agent produces findings in this format:

```markdown
## Context: Existing Systems

### Existing Services
- [Service Name]: [what it does, how it's relevant]

### Past Design Decisions
- [Decision]: [rationale, outcome, reference]

### Known Limitations
- [Limitation]: [impact, documented workarounds]

### Integration Points
- [System A] <-> [System B]: [contract type, protocol, data format]

### Sources
- [Page Title](url) — [relevance note]
```

## Handling Failures

If the confluence-research-agent:
- **Returns no results**: The topic may not be documented. Note this as an information gap. Proceed with the assumption that no prior art exists, but flag the gap.
- **Returns contradictory information**: Note both versions with their sources. Do not silently pick one.
- **Returns partial results**: Use what's available. Note what's missing and reduce confidence scores on affected dimensions.
- **Session expired error**: Run `cd /Users/e124866/Projects/personal-research-toolkit && npm run login` then retry.

## Important: Read-Only Mode

The confluence-research-agent and all its sub-agents operate in **STRICT READ-ONLY MODE**. They will never write to, update, or modify any Confluence content. This is a mandatory guardrail.
