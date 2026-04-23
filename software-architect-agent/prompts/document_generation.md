---
description: "Phase 8: Document Assembly — read the temp file in full, produce the final architecture analysis document following the complete output schema, verify all math is shown, then delete the temp file"
---

# Phase 8: Document Assembly

You are in the final phase of the Software Architect Agent workflow. All research, solution proposals, trade-off analysis, and scoring are complete in the temp file. Now you assemble the final deliverable.

**Read the temp file in full before writing a single word of the final document.** Do not rely on your context memory of what was written in earlier phases — re-read the source of truth.

---

## Step 1: Read the Temp File

```bash
# The temp file is at:
/Users/e124866/Projects/personal-research-toolkit/output/<slug>-temp-analysis.md
```

Read it completely. Verify all required sections are present:
- `## Problem Understanding`
- `## Context: Existing Systems` (or a note that this phase was intentionally skipped)
- `## Context: Product Scope` (or a note that no Aha.io epic was provided)
- `## Context: Codebase Analysis — [repo]` (or a note that no workspace was provided)
- `## Solution Proposals`
- `## Trade-off Analysis`
- `## Comparative Analysis`
- `## Recommendation Scoring`

If any section is missing or incomplete, do not proceed — revisit the corresponding phase before generating the final document.

---

## Step 2: Derive the Output File Path

The final document is written to:

```
/Users/e124866/Projects/personal-research-toolkit/output/<slug>-architecture-analysis.md
```

The `<slug>` is the same kebab-case slug used for the temp file. **Always use absolute paths.**

Examples:
- Temp file: `/Users/e124866/Projects/personal-research-toolkit/output/webhook-delivery-status-tracking-temp-analysis.md`
- Final document: `/Users/e124866/Projects/personal-research-toolkit/output/webhook-delivery-status-tracking-architecture-analysis.md`

---

## Step 3: Write the Final Document

Write the complete document following the schema below. Do not omit sections. Every section listed here must appear in the final document — if a section has no content because the corresponding context was not gathered, write a brief note explaining why (e.g., "No Aha.io epic was provided for this analysis").

---

## Output Schema

The final document must contain these 9 top-level sections with the subsections defined below. Follow the order exactly.

```markdown
# Architectural Analysis: [Problem Title — human-readable, not the slug]

**Problem**: [1-2 sentence problem statement]
**Date**: [YYYY-MM-DD]
**Status**: DRAFT | REVIEW | FINAL

---

## 1. Executive Summary

[Written last, placed first. See Executive Summary guidelines below.]

---

## 2. Problem Understanding

### 2.1 Business Objective
[What business outcome does solving this problem serve? Why does it matter?]

### 2.2 Technical Challenge
[What is technically hard about this, separate from the business framing?]

### 2.3 Constraints
- **Timeline**: [...]
- **Team**: [...]
- **Technology**: [...]
- **Budget / Resources**: [...]
- **Regulatory / Compliance**: [...]
- **Operational**: [...]

### 2.4 Success Criteria
1. [Measurable criterion]
2. [Measurable criterion]
3. [Qualitative criterion — note if measurable threshold is still needed]

### 2.5 Scope Boundaries
**In scope:**
- [item]

**Out of scope:**
- [item]

### 2.6 Ambiguity and Interpretation
[State the ambiguity identified, the interpretation chosen, and what would change under the alternative interpretation]

---

## 3. Context Landscape

### 3.1 Existing Systems
[What exists today that is relevant: services, databases, integration contracts, prior decisions]
[What has been tried before and why it did or did not work]
[Existing integration points and their contracts]
[Source: Confluence pages with links]

### 3.2 Product Scope
[Epic/feature requirements that constrain the solution]
[Acceptance criteria that must be met]
[Adjacent planned work that may interact with this solution]
[Product timeline and milestone context]
[Source: Aha.io epic links]

### 3.3 Codebase Analysis
[Per-repo findings — repeat subsection for each codebase analyzed]
[Current architecture patterns in use]
[Tech debt and identified risks]
[Key integration points discovered]
[Source: Lead Developer findings for each repo]

---

## 4. Assumptions and Unknowns

### 4.1 Known Facts
| Fact | Source |
|------|--------|
| [fact] | [Confluence page / codebase / stated by user] |

### 4.2 Assumptions
| # | Assumption | Confidence | If Wrong, Changes... |
|---|-----------|------------|---------------------|
| A1 | [assumption] | HIGH / MEDIUM / LOW | [what scoring or solution design would change] |
| A2 | [assumption] | ... | ... |

### 4.3 Information Gaps
- [Gap] — Would need [information source] to resolve. Impact on recommendation: [LOW / MEDIUM / HIGH]

### 4.4 Deferrable Decisions
- [Decision] — Safe to defer until [trigger or milestone] because [reason]

---

## 5. Solution Proposals

[One full subsection per solution. Repeat the structure below for each.]

### 5.N Solution: [Descriptive Name]
[Label the Simplest Path solution with: `**— Simplest Path**`]

#### 5.N.1 Overview
[One-paragraph description. Comprehensible to a technical stakeholder reading only this paragraph.]

#### 5.N.2 Architecture Diagram

[Mermaid diagram. Must show: components, labeled data flows, integration boundaries, failure domains.]

```mermaid
[diagram]
```

#### 5.N.3 How It Works

**Data Flow:**
[Where data enters, what transformations occur, what is persisted where, what events are emitted]

**Control Flow:**
[What triggers the operation, sequence of calls and decisions, how errors are handled]

**Key Components:**
| Component | Responsibility | New / Existing / Modified | Owner |
|-----------|---------------|--------------------------|-------|

**Integration Points:**
| System | Mechanism | Data Exchanged | Direction |
|--------|-----------|---------------|-----------|

#### 5.N.4 Arguments FOR
- **Technical**: [...]
- **Business**: [...]
- **Organizational**: [...]
- **Operational**: [...]

#### 5.N.5 Arguments AGAINST
- **Technical risks**: [...]
- **Complexity cost**: [...]
- **Organizational friction**: [...]
- **What could go wrong**: [...]

#### 5.N.6 Failure Mode Analysis
| Failure Scenario | Impact | Detection | Recovery | Blast Radius |
|-----------------|--------|-----------|----------|--------------|
| [...] | [...] | [...] | [...] | [...] |

#### 5.N.7 Reversibility Assessment
**One-way doors:**
- [Decision] — Reversal cost: HIGH / MEDIUM. [Why]

**Two-way doors:**
- [Decision] — [Why safe to defer/change]

#### 5.N.8 Operational Impact
- **On-call burden**: [assessment]
- **Monitoring requirements**: [what must be instrumented]
- **Deployment complexity**: [assessment]
- **Team cognitive load**: [assessment]

#### 5.N.9 Implementation Sketch
| Phase | Description | Effort | Dependencies | Parallelizable with |
|-------|------------|--------|-------------|---------------------|

---

## 6. Comparative Analysis

### 6.1 Side-by-Side Comparison

| Dimension | Solution 1: [Name] | Solution 2: [Name] | Solution 3: [Name] |
|-----------|-------------------|-------------------|-------------------|
| Complexity | | | |
| Scalability | | | |
| Timeline to first value | | | |
| Timeline to full delivery | | | |
| Technical risk | | | |
| Operational burden | | | |
| Reversibility | | | |
| Team fit | | | |
| Business alignment | | | |
| Recommended for | | | |

### 6.2 Operational Comparison

| Dimension | Solution 1 | Solution 2 | Solution 3 |
|-----------|-----------|-----------|-----------|
| New infrastructure components | | | |
| On-call burden change | | | |
| Monitoring additions required | | | |
| Deployment pipeline changes | | | |
| Documentation requirements | | | |

### 6.3 Implementation Comparison

| Dimension | Solution 1 | Solution 2 | Solution 3 |
|-----------|-----------|-----------|-----------|
| Critical path effort | | | |
| First increment of value | | | |
| Cross-team dependencies | | | |
| Key delivery risk | | | |

---

## 7. Recommendation Scoring

### 7.1 Weights Applied
| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Business Alignment | [%] | [why this weight for this problem] |
| Time to Value | [%] | [...] |
| [all 11 dimensions] | | |
| **Total** | **100%** | |

### 7.2 Scoring Table
| Dimension | Wt | Sol 1: [Name] | Basis | Sol 2: [Name] | Basis | Sol 3: [Name] | Basis |
|-----------|-----|--------------|-------|--------------|-------|--------------|-------|
| [all 11 dimensions] | | | | | | | |

Basis legend: [K] = Known fact (cited source) | [IA] = Informed Assumption (stated basis) | [U] = Unknown (default assumed, sensitivity shown)

### 7.3 Composite Score Calculations

[Show full arithmetic for each solution. All math must be verifiable.]

```
Solution 1: [Name]
  Business Alignment:     [score] × [weight] = [result]
  Time to Value:          [score] × [weight] = [result]
  [all 11 rows]
  ──────────────────────────────────────────
  COMPOSITE SCORE:                    [X.XX] / 10
```

### 7.4 Composite Scores Summary

| Solution | Composite Score | Confidence Band | Primary Uncertainty |
|----------|----------------|----------------|-------------------|
| [Name 1] | [X.XX] / 10 | +/- [Y] | [Key assumption] |
| [Name 2] | [X.XX] / 10 | +/- [Y] | [...] |

### 7.5 Sensitivity Analysis

[Conditional rankings under key assumption changes. Prose paragraph on ranking robustness.]

---

## 8. Final Recommendation

### 8.1 Recommended Solution

**[Solution Name]** — [2-3 sentence summary of why this is the recommendation given the context and constraints]

### 8.2 Conditions for This Recommendation

This recommendation holds as long as:
- [Condition 1 — e.g., "team has or can acquire Kafka operational experience within 4 weeks"]
- [Condition 2 — e.g., "throughput stays under 50K events/day for at least 12 months"]

### 8.3 Contingency

If [condition changes], reconsider [alternative solution] because [reason].

### 8.4 Next Steps (Priority Order)

1. [Action — owner, what, by when]
2. [Action]
3. [Action]

### 8.5 Decisions to Make Now vs. Defer

**Decide now** (one-way doors, time-sensitive):
- [Decision] — because [reason]

**Safe to defer** (two-way doors, can decide later):
- [Decision] — until [trigger]

---

## 9. Appendix

### 9.1 Glossary
| Term | Definition |
|------|-----------|
| [term] | [definition] |

### 9.2 References

**Confluence Sources:**
- [Page Title](url) — [brief note on what it contributed]

**Aha.io Sources:**
- [Epic/Feature Title](url) — [brief note]

**Codebases Analyzed:**
- [repo-name] at [/absolute/path] — [summary of what was found]

### 9.3 Sub-Agent Research Summaries

[Condensed findings from each sub-agent invoked. One paragraph per sub-agent, summarizing what was found and what it contributed to the analysis.]

#### confluence-research-agent
[Summary of Confluence findings]

#### aha-research-agent
[Summary of Aha.io findings, or "Not invoked — no Aha.io epic was provided"]

#### lead_developer — [repo-name]
[Summary of codebase findings]
```

---

## Executive Summary Guidelines

The Executive Summary (Section 1) should be written **last** but placed **first** in the document.

It must be readable in under 2 minutes. It is the section that executives, product managers, and technical leads who will not read the full document will rely on.

It contains exactly three things:

1. **The problem** (1-2 sentences): What is the business or technical problem being solved?
2. **The recommendation** (2-3 sentences): Which solution is recommended, and what is the core reason? What constraint does it optimize for?
3. **The key trade-off acknowledged** (1-2 sentences): What is the main cost or risk of the recommendation? What would change the recommendation?

Do not:
- Summarize every section of the document
- List all solutions and scores
- Use technical jargon not defined elsewhere
- Write more than 200 words

Example structure:
```
The [system] currently [problem statement]. Without a solution, [cost of inaction].

This analysis recommends [Solution Name]: [core idea in one sentence]. This approach is preferred because [primary reason tied to the dominant constraint — timeline / team fit / simplicity]. It delivers [key benefit] while [key trade-off, honestly stated].

This recommendation holds as long as [key condition]. If [condition changes], [alternative solution] should be reconsidered.
```

---

## Document Length and Depth Guidelines

- **Executive Summary**: Under 200 words. Readable in 2 minutes.
- **Full document**: Comprehensive enough to be reviewable in 30-45 minutes. Use headers, tables, and diagrams to make it skimmable.
- **Mermaid diagrams**: Include all diagrams from the solution design phase. Do not reduce or simplify them in the final document.
- **Scoring tables**: All math must be shown. Every score must have a 1-sentence justification. Reviewers must be able to audit every number.
- **Length overall**: As long as it needs to be and no longer. Do not pad. Do not cut sections to save space.

---

## After Writing the Document

### Verify completeness
Before finalizing, check:
- All 9 sections are present with their subsections
- Every solution has all 9 subsections (5.N.1 through 5.N.9)
- Every Mermaid diagram from the solution design phase is included
- Composite score calculations show all arithmetic
- All Confluence and Aha.io pages are cited in Section 9.2 References
- The Executive Summary leads with the recommendation and acknowledges the key trade-off

### Delete the temp file

After the final document is confirmed complete, delete the temp file:

```bash
# Replace <slug> with the actual slug
rm /Users/e124866/Projects/personal-research-toolkit/output/<slug>-temp-analysis.md
```

The temp file exists solely to prevent context rot during the research phases. It is not a deliverable. The final architecture analysis document is the only output.

### Report completion

Confirm to the user:
- The final document path: `/Users/e124866/Projects/personal-research-toolkit/output/<slug>-architecture-analysis.md`
- The recommended solution (one sentence)
- Any open questions or assumptions that should be validated before acting on the recommendation
- Any decisions flagged as one-way doors that should be reviewed before commitment
