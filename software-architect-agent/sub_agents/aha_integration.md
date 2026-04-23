# Aha.io Research Agent Integration

## When to Invoke

Invoke the aha-research-agent when the architect needs to understand:
- The product scope of an epic or feature being designed for
- Acceptance criteria and business requirements
- Adjacent planned work that may interact with the current design
- Product timeline and priority context
- Feature breakdown and stakeholder expectations

## How to Invoke

### Option 1: Spawn as Sub-Agent (Recommended for Epic Analysis)

Spawn a sub-agent using the AHA research agent prompt:

**Prompt location**: `/Users/e124866/Projects/personal-research-toolkit/.github/prompts/aha-research-agent.prompt.md`

Provide the sub-agent with:
1. **The Aha.io epic URL**
2. **What architectural questions** the epic analysis should help answer
3. **Workspace paths** (if codebase analysis is needed alongside)
4. **Focus areas** — which features or aspects are most relevant to the architecture

**Example delegation:**
```
Analyze the AHA epic at https://mastercard.aha.io/epics/PROJ-E-456.
I need to understand:
1. What are the core features and their acceptance criteria?
2. Are there adjacent features planned that might affect the webhook service architecture?
3. What is the expected timeline and delivery priority?
4. Are there any specific technical requirements or constraints mentioned?

This will inform an architectural analysis for adding delivery status tracking.
Focus on features that touch the webhook or notification domain.

Write findings to /Users/e124866/Projects/personal-research-toolkit/output/webhook-delivery-status-tracking-temp-analysis.md
under the heading "## Context: Product Scope".
```

### Option 2: Direct Read (For Quick Epic Overview)

For a quick read of a single epic without full impact analysis:

```bash
cd /Users/e124866/Projects/personal-research-toolkit && npm run aha-read "https://mastercard.aha.io/epics/PROJ-E-456"
```

Returns JSON: `{ title, textContent, features[], links[] }`

Use direct read when:
- You just need the epic description and feature list
- The product scope is well-understood and you only need confirmation

Use the full sub-agent when:
- The epic is complex with many features
- You need to understand adjacent epics or cross-epic dependencies
- The epic references other Confluence documentation that should be gathered

## Expected Output

The aha-research-agent produces findings in this format:

```markdown
## Context: Product Scope

### Epic Summary
- **Title**: [epic title]
- **Description**: [what the epic aims to achieve]
- **Timeline**: [expected delivery timeline]

### Features
| Feature | Description | Priority | Architectural Implications |
|---------|------------|----------|--------------------------|
| [name] | [what it does] | [P1/P2/P3] | [what this means for the architecture] |

### Adjacent Planned Work
- [Epic/Feature]: [how it might interact with current design]

### Business Context
- [Key business drivers, success metrics, stakeholder expectations]

### Technical Requirements from Product
- [Any specific technical constraints or preferences stated in the epic]
```

## Handling Failures

If the aha-research-agent:
- **Cannot read the epic** (permissions, URL format): Note the gap. Ask the user to provide the epic content directly or adjust the URL.
- **Returns sparse content**: Some epics are light on detail. Note this and flag that assumptions about product requirements have LOW confidence.
- **Session expired**: Run `cd /Users/e124866/Projects/personal-research-toolkit && npm run aha-login` then retry. Note: `aha-read` handles inline login with a headed browser.

## Important: Read-Only Mode

The aha-research-agent operates in **STRICT READ-ONLY MODE**. It will never write to, update, or modify any Aha.io content. This is a mandatory guardrail.
