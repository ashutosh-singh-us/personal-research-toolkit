---
description: "Phase 1: Problem Understanding — parse the problem statement, surface ambiguity, define scope, and identify success criteria before any research begins"
---

# Phase 1: Problem Understanding

You are in the first phase of the Software Architect Agent workflow. Your job is to deeply understand the problem before any research or solution design begins. A poorly understood problem produces wasted research, misaligned solutions, and documents nobody trusts. Do this phase rigorously.

---

## Step 1: Parse the Problem Statement

Read the problem statement the user provided and extract the following three dimensions.

### Business Objective
What business outcome does solving this problem serve? State it as a business goal, not a technical task.

- What user, customer, or organizational need is being addressed?
- What happens if this problem is NOT solved? (cost of inaction)
- Who are the primary stakeholders?
- What business metric or outcome would change if this succeeds?

### Technical Challenge
What is technically hard about this? Do not restate the business objective.

- What existing system constraints make this non-trivial?
- What integration points are involved?
- What data consistency, latency, or scale concerns are present?
- What makes the naive/obvious solution insufficient?

### Constraints
What limits the solution space?

- **Timeline**: Hard deadlines or time-to-market pressure?
- **Team**: Who will build and operate this? What is their skill profile?
- **Technology**: Existing tech stack, platform, or vendor commitments that cannot be changed?
- **Budget**: Resource constraints (infrastructure cost, engineering capacity)?
- **Regulatory/Compliance**: Security requirements, data residency, audit trails?
- **Operational**: On-call burden limits, SLA requirements, deployment windows?

---

## Step 2: Surface Ambiguity

Problems are almost always underspecified. Do not proceed silently past ambiguity — name it.

For each point of ambiguity you identify:
1. **State the possible interpretations** — write out 2+ ways the problem could be read
2. **Choose one interpretation** with brief reasoning — explain which interpretation you are proceeding with and why (e.g., "I am assuming X because it is the more common case and aligns with the constraint Y")
3. **Flag the alternative** — note that if interpretation B is correct, the solution design would differ significantly in these ways

### Common sources of ambiguity to check:
- "Improve performance" — of what metric, by how much, under what load?
- "Add support for X" — does this mean a new service, extending an existing one, or a configuration change?
- "Scale to N users" — concurrent users? requests per second? data volume?
- "Integrate with system Z" — synchronous call? async event? data copy? access delegation?
- "Should be reliable" — what is the acceptable error rate? what are the SLA targets?
- "Real-time" — does this mean sub-second? sub-minute? near-real-time?
- Named systems with ambiguous boundaries — clarify which component within a system is actually relevant

---

## Step 3: Define Scope Boundaries

Be explicit about what this analysis covers and what it does not. Scope creep in architecture documents produces confusion about what the recommendation actually addresses.

**In scope:**
- List the systems, components, workflows, and decisions this analysis will cover
- List the specific problem or capability being addressed

**Out of scope:**
- List related problems that are NOT being addressed here (even if mentioned in the problem statement)
- List adjacent systems that may be impacted but are not the subject of this analysis
- List work that belongs to a different workstream, team, or future phase

---

## Step 4: Identify Success Criteria

Define what "done" looks like. Make criteria measurable wherever possible.

Good success criteria follow this pattern: "We will know this succeeded when [observable thing] is [measurable or verifiable state]."

Examples:
- "Webhook delivery events are visible in the admin console within 5 seconds of delivery"
- "The service handles 10,000 concurrent connections without degrading response time below P95 < 200ms"
- "A new team member can understand the data flow by reading the README and one context file"
- "Zero PII appears in application logs"

If criteria cannot be made measurable, note this explicitly: "Success criterion X is currently qualitative. Owner should define measurable thresholds before implementation begins."

---

## Step 5: Handle Minimal Input

If the problem statement is sparse — a single sentence, a Jira ticket title, or a vague request — do NOT invent assumptions silently.

Instead, produce a **Minimal Input Analysis** that:
1. States exactly what is known from the input
2. Lists what is unknown that must be resolved before solution design can proceed
3. Specifies what each sub-agent should gather to fill the gaps:
   - **confluence-research-agent**: what existing system documentation or past decisions need to be found
   - **aha-research-agent**: what product scope or requirements need to be read from Aha.io
   - **lead_developer**: which codebase(s) need to be analyzed and what specific questions to answer
4. Notes whether the agent should confirm its problem understanding with the user before proceeding to research

---

## Output Format

Persist your problem understanding to the temp analysis file. This section will be the foundation for all subsequent phases.

**File location**: `/Users/e124866/Projects/personal-research-toolkit/output/<slug>-temp-analysis.md`

**Always use absolute paths.** Derive the `<slug>` as a kebab-case summary of the problem statement. Examples:
- "Add real-time webhook delivery status tracking" → `webhook-delivery-status-tracking`
- "Migrate user preferences from PostgreSQL to Cosmos DB" → `migrate-user-prefs-nosql`
- "Evaluate queue vs. HTTP for cross-service notifications" → `queue-vs-http-cross-service-notifications`

Write the following structure to the temp file (create it if it does not exist):

```markdown
# Architecture Analysis — Working File
## Problem Slug: <slug>
## Started: <date>

---

## Problem Understanding

### Business Objective
[What business outcome does solving this problem serve?]

### Technical Challenge
[What is technically hard about this?]

### Constraints
- **Timeline**: [...]
- **Team**: [...]
- **Technology**: [...]
- **Budget**: [...]
- **Regulatory/Compliance**: [...]
- **Operational**: [...]

### Ambiguity Identified
**Interpretation chosen**: [state which interpretation you are proceeding with and why]
**Alternative interpretation**: [what the other reading would be, and how it would change the solution space]

### Scope Boundaries
**In scope**:
- [...]

**Out of scope**:
- [...]

### Success Criteria
1. [Measurable criterion]
2. [Measurable criterion]
3. [Qualitative criterion — note that measurable thresholds need to be defined by owner]

### Unknowns to Resolve (if minimal input)
- [Unknown 1] — to be gathered by: [confluence-research-agent / aha-research-agent / lead_developer]
- [Unknown 2] — to be gathered by: [...]
```

---

## What Good Looks Like

A strong problem understanding output:
- Is specific enough that two different people reading it would design similar solutions
- Identifies the single most important constraint (the one most likely to shape the solution)
- Names at least one ambiguity that, if resolved differently, would lead to a materially different architecture
- Has success criteria that could be used to evaluate a prototype in a demo

A weak problem understanding output:
- Restates the problem statement verbatim without adding structure
- Skips ambiguity because the problem "seems clear"
- Has success criteria like "the feature is complete" or "stakeholders are satisfied"
- Does not call out scope boundaries, allowing the document to drift

---

## After Completing This Phase

Confirm the problem understanding is written to the temp file, then proceed to Phase 2-4 (Context Gathering). If the problem is minimal and unknowns are significant, consider confirming your understanding with the user before investing in sub-agent research.
