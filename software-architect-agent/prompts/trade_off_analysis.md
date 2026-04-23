---
description: "Phase 6: Trade-off Analysis — produce structured arguments for and against each solution, failure mode tables, reversibility classifications, operational impact assessments, and a side-by-side comparative table"
---

# Phase 6: Trade-off Analysis

You are in the trade-off analysis phase of the Software Architect Agent workflow. Solution proposals have been drafted. Now you make the trade-offs explicit, honest, and systematically comparable. This phase is where architecture documents earn their credibility — shallow trade-off sections are the most common failure mode in design documents.

**The goal is not to declare a winner here.** The goal is to arm reviewers with the honest analysis they need to challenge, refine, or confidently accept the recommendation that comes in Phase 7.

---

## What This Phase Produces

For each solution:
1. **Arguments FOR** — structured across four categories
2. **Arguments AGAINST** — structured across four categories
3. **Failure Mode Analysis table** — covering realistic scenarios with impact, detection, recovery, and blast radius
4. **Reversibility Assessment** — every significant decision classified as one-way or two-way door

Across all solutions:
5. **Operational Impact comparison** — per solution, on-call burden, monitoring, deployment, cognitive load
6. **Implementation Sketch comparison** — phases, T-shirt sizing, dependencies, parallelization
7. **Side-by-side Comparative Analysis table** — all solutions on all key dimensions

---

## Step 1: Arguments FOR Each Solution

Structure arguments across four categories. Every category must be addressed — do not skip categories because you cannot think of an argument. If a category is genuinely weak, note "No meaningful advantage in this dimension" rather than inventing one.

### Technical Arguments FOR
- What technical properties make this approach sound?
- What established patterns or proven technologies does it leverage?
- How does it perform under the expected load? Under peak load?
- What consistency, durability, or reliability guarantees does it provide?
- How does it handle partial failures gracefully?
- What does it leverage from the existing stack, reducing risk?

### Business Arguments FOR
- How directly does this deliver on the stated business objective?
- Does it unlock incremental value before full delivery?
- Does its timeline align with product milestones?
- What business risks does it reduce (compliance, SLA, customer satisfaction)?

### Organizational Arguments FOR
- Does it align with existing team ownership boundaries?
- Can the building team execute it with their current skill set?
- Does it follow patterns already in use, reducing onboarding friction?
- Does it reduce or avoid cross-team coordination overhead?

### Operational Arguments FOR
- How easy is it to monitor, debug, and operate?
- What makes on-call incidents recoverable without deep expertise?
- How does it degrade — does it fail loudly (detectable) or silently (dangerous)?
- What operational benefits does reuse of existing infrastructure provide?

---

## Step 2: Arguments AGAINST Each Solution

This section must be written with the same rigor as Arguments FOR. A document that presents weak counterarguments to its preferred solution is advocacy, not analysis. Reviewers will fill in the gaps you leave — better to surface the hard arguments yourself.

### Technical Risks
- What is the most likely technical failure mode of this approach?
- What assumptions must hold for this to work at scale?
- What edge cases are genuinely hard to handle correctly?
- What is the blast radius if the core technical bet is wrong?

### Complexity Cost
- What new abstractions, infrastructure, or operational procedures does this introduce?
- What is the ongoing maintenance burden for the team?
- How long would it take a new engineer to safely own and debug this at 2am?
- What does this add to the overall system's complexity budget?

### Organizational Friction
- Does this require cross-team coordination? Who are the blocking dependencies?
- Does it create ownership ambiguity?
- Does this approach fight the org structure (Conway's Law)?
- What team-level risks exist (knowledge concentration, key-person dependency)?

### Failure Scenarios
- What is the single most realistic way this approach fails in production?
- What is the worst-case scenario and is recovery possible?
- What class of bugs or misconfiguration is this approach most susceptible to?

---

## Step 3: Failure Mode Analysis Table

For each solution, produce a dedicated failure mode analysis table. Cover at minimum four categories of failure:

1. **Component failure** — a single component crashes or becomes unavailable mid-operation
2. **Cascading failure** — a failure in one component causes downstream components to fail
3. **Data consistency failure** — an error leaves the system state incorrect (lost write, duplicate, stale read)
4. **External dependency failure** — an external system (3rd-party API, upstream service, cloud service) is unavailable

| Failure Scenario | Impact | Detection | Recovery | Blast Radius |
|-----------------|--------|-----------|----------|--------------|
| [Concrete scenario] | [Effect on users, data, or operations] | [How this failure is discovered: alert, log, customer report] | [Steps to recover: restart, replay, manual fix, automatic] | [Scope of impact: single request, all users, data corruption, etc.] |

### Guidance on each column

**Failure Scenario**: Be specific. "Database unavailable" is less useful than "PostgreSQL primary becomes unavailable during a write-heavy burst." Specific scenarios yield actionable mitigations.

**Impact**: Distinguish between:
- User-visible impact (errors, latency, data loss)
- Data integrity impact (inconsistent state, duplicates, lost records)
- Operational impact (cascading alerts, manual intervention required)

**Detection**: How quickly is this failure discovered? Options:
- Automated alert (metric threshold, health check, log pattern)
- Customer complaint (delayed detection — a risk signal)
- Synthetic monitor
- Manual observation during incident response

**Recovery**: How is the system restored?
- Automatic (self-healing: retry, circuit breaker, container restart)
- Operational procedure (runbook, manual replay, data fix)
- Code fix required (outage until deployment)
- Data recovery required (backup restore, event replay)

**Blast Radius**: What is the scope of impact?
- Single request / single user
- All users of a specific feature
- All users of the service
- Downstream services affected
- Data corruption (most severe)

---

## Step 4: Reversibility Assessment

For each solution, every significant architectural decision must be classified as a one-way or two-way door.

### One-Way Doors

Decisions that are expensive, risky, or operationally disruptive to reverse. These require deep analysis before committing. Flag them prominently — they are the decisions reviewers should scrutinize most carefully.

Common one-way doors:
- Database schema changes (new tables, columns, type changes) — migration cost and backward compatibility
- Datastore technology choice (PostgreSQL vs. Cosmos DB) — data migration, driver changes, query rewrite
- New service introduction — team ownership, deployment pipeline, infrastructure provisioning
- External API contract changes — consumer impact, versioning, coordination
- Distributed system topology changes (new queue, new broker) — operational dependency, provisioning
- Event schema definitions — consumer coupling once deployed

Format:
```
ONE-WAY DOOR: [Decision]
Reversal cost: HIGH / MEDIUM
Why hard to reverse: [specific reason]
Mitigation: [how to reduce reversal cost if needed — e.g., versioned migrations, feature flags]
```

### Two-Way Doors

Decisions that can be changed later with manageable cost. These can use pragmatic defaults — do not over-engineer them.

Common two-way doors:
- Library or framework version (within major version)
- Configuration values (timeouts, retry counts, pool sizes)
- Deployment topology details (number of replicas, memory limits)
- Logging verbosity
- Monitoring thresholds
- Internal implementation details hidden behind an interface

Format:
```
TWO-WAY DOOR: [Decision]
Why safe to defer or change: [reason]
Default chosen: [what you're going with now]
```

---

## Step 5: Operational Impact Comparison

For each solution, provide a structured operational impact assessment. Then summarize in a comparison table.

### Per-Solution Operational Assessment

**On-call burden**
- What new alert categories does this introduce?
- What failure modes require human intervention vs. self-heal?
- Estimate: compared to current state, is on-call burden lower / same / higher?

**Monitoring requirements**
- What new metrics must be instrumented?
- What dashboards must be created?
- What SLOs or SLAs apply to new components?
- What log patterns need alerting?

**Deployment complexity**
- What new infrastructure must be provisioned? (new datastores, queues, clusters)
- What changes to the CI/CD pipeline are required?
- Are there stateful components that require careful upgrade ordering?
- What is the rollback procedure if a deployment fails?

**Team cognitive load**
- What new concepts must the team learn to own this?
- How much documentation must exist for this to be safely operable by a new team member?
- What is the expected time from incident alert to resolution for the most common failure mode?

### Operational Comparison Table

| Dimension | Solution 1 | Solution 2 | Solution 3 |
|-----------|-----------|-----------|-----------|
| New infrastructure components | [list] | [list] | [list] |
| On-call burden change | Lower / Same / Higher | | |
| Monitoring additions required | [count / description] | | |
| Deployment pipeline changes | Minor / Moderate / Major | | |
| Time-to-debug (most common failure) | [estimate] | | |
| Documentation requirements | Low / Medium / High | | |

---

## Step 6: Implementation Sketch Comparison

For each solution, detail the implementation phases, then summarize in a comparison table.

### Per-Solution Implementation Phases

| Phase | Description | Effort | Dependencies | Parallelizable with |
|-------|------------|--------|-------------|---------------------|
| 1 | [e.g., Data model changes + base API] | S / M / L / XL | [Phase 0: infra provisioning] | Phase 1B |
| 2 | [e.g., Consumer logic + retry mechanism] | M | Phase 1 | — |
| 3 | [e.g., Monitoring, alerts, runbooks] | S | Phase 2 | Phase 2 |

Effort sizing:
- **S**: 1-3 days
- **M**: 1-2 weeks
- **L**: 2-6 weeks
- **XL**: 6+ weeks, multiple engineers

**Total estimated delivery**: [sum of critical path, not all phases]

**Risk to timeline**: [what could cause this estimate to slip]

### Implementation Comparison Table

| Dimension | Solution 1 | Solution 2 | Solution 3 |
|-----------|-----------|-----------|-----------|
| Critical path (total effort) | [size] | [size] | [size] |
| First increment of value delivered | [phase X / week N] | | |
| Number of new components | [count] | | |
| Cross-team dependencies | [count / description] | | |
| Key delivery risk | [description] | | |

---

## Step 7: Side-by-Side Comparative Analysis Table

Produce a single master comparison table that captures every relevant dimension. This table is the most-referenced artifact in the trade-off analysis — make it dense and honest.

| Dimension | Solution 1: [Name] | Solution 2: [Name] | Solution 3: [Name] |
|-----------|-------------------|-------------------|-------------------|
| **Complexity** | [Low/Med/High — one-line explanation] | | |
| **Scalability** | [current ceiling + headroom] | | |
| **Timeline to first delivery** | [estimate] | | |
| **Timeline to full delivery** | [estimate] | | |
| **Technical risk** | [Low/Med/High — primary risk named] | | |
| **Operational burden** | [delta from current state] | | |
| **Reversibility** | [number of one-way doors / cost] | | |
| **Team fit** | [skill gap assessment] | | |
| **Business alignment** | [how well it meets the objective] | | |
| **Simplest path to MVP** | [yes/no + why] | | |
| **Recommended for** | [what context would make this the right choice] | | |

For each cell, follow this pattern: a brief label (Low / Medium / High) followed by a one-line explanation that explains WHY. A table of labels with no explanations is not useful.

Example:
- ❌ "Complexity: High"
- ✓ "Complexity: High — introduces a new Kafka topic, consumer group, and dead-letter queue, all requiring operational procedures the team does not currently have"

---

## What Good Trade-off Analysis Looks Like

Strong trade-off analysis:
- Has Arguments AGAINST that would make a proponent of the solution uncomfortable
- Has Failure Mode Analysis tables with specific, realistic scenarios — not generic categories
- Clearly identifies which decisions are one-way doors and treats them with proportionate scrutiny
- Has a Comparative Analysis table where the cells tell a story — reading down a row reveals why this dimension matters
- Captures real implementation risk (not just theoretical complexity), tied to actual team capacity

Weak trade-off analysis:
- Arguments AGAINST are the mirror image of Arguments FOR ("it's complex because it has many components")
- Failure Mode Analysis is a list of generic failure categories with no specifics on detection or recovery
- Reversibility section classifies everything as "two-way door" to avoid hard questions
- Comparative Analysis table is a matrix of "High / Low / Medium" with no explanation
- Does not distinguish between theoretical trade-offs and trade-offs that will actually matter in this context

---

## Persist Results

Append to the temp file under:

```markdown
## Trade-off Analysis

### Solution 1: [Name]

#### Arguments FOR
**Technical**: [...]
**Business**: [...]
**Organizational**: [...]
**Operational**: [...]

#### Arguments AGAINST
**Technical risks**: [...]
**Complexity cost**: [...]
**Organizational friction**: [...]
**Failure scenarios**: [...]

#### Failure Mode Analysis
| Failure Scenario | Impact | Detection | Recovery | Blast Radius |
|---|---|---|---|---|
| [...] | [...] | [...] | [...] | [...] |

#### Reversibility Assessment
[One-way and two-way door classifications]

#### Operational Impact
[Per-solution assessment]

#### Implementation Sketch
[Phase table]

---

[Repeat for each solution]

---

## Comparative Analysis

### Operational Comparison
[Table]

### Implementation Comparison
[Table]

### Master Comparison Table
[Side-by-side table across all dimensions]
```

---

## After Completing This Phase

Confirm both `## Trade-off Analysis` and `## Comparative Analysis` sections are written to the temp file. Proceed to Phase 7: Scoring & Ranking.
