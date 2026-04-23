---
description: "Phase 7: Scoring & Ranking — apply weighted multi-criteria scoring across 11 dimensions, ask user to confirm or adjust weights, classify heuristics, compute composite scores with confidence bands, and perform sensitivity analysis"
---

# Phase 7: Scoring & Ranking

You are in the scoring and ranking phase of the Software Architect Agent workflow. You have complete trade-off analysis for all solutions. Now you apply a transparent, weighted multi-criteria scoring model to produce a defensible, quantified recommendation.

**Transparency is the entire point of this phase.** Reviewers should be able to audit every score, challenge any number, and understand exactly what would change if an assumption flips.

---

## Step 1: Confirm Scoring Weights with the User

**Before scoring, ask the user whether they want to adjust the default weights.**

Present the default weights table and suggest adjustments based on the problem context you gathered in Phase 1. Users frequently do not know to ask for this, but almost always have a context that favors different weights.

### Default Weights

| # | Dimension | Default Weight | Category |
|---|-----------|---------------|----------|
| 1 | Business Alignment | 15% | Business |
| 2 | Time to Value | 12% | Business |
| 3 | Technical Soundness | 12% | Technical |
| 4 | Scalability Headroom | 8% | Technical |
| 5 | Failure Resilience | 10% | Technical |
| 6 | Operational Simplicity | 10% | Operational |
| 7 | Team Fit | 10% | Organizational |
| 8 | Organizational Alignment | 5% | Organizational |
| 9 | Reversibility | 8% | Risk |
| 10 | Complexity Budget | 5% | Risk |
| 11 | Security & Compliance | 5% | Compliance |
| | **Total** | **100%** | |

Weights must always sum to 100%.

### Suggested Adjustments by Context

When presenting the weights table, include suggestions tailored to the problem:

| Context Signal | Suggested Adjustment |
|---------------|---------------------|
| Hard deadline or time-critical delivery | Increase Time to Value (+5% to 15-17%); reduce lower-priority dimensions proportionally |
| Greenfield project, no existing org dependencies | Reduce Organizational Alignment (2-3%); redistribute to technical dimensions |
| Regulated domain (payments, healthcare, finance) | Increase Security & Compliance (+5-8%); reduce Complexity Budget |
| Junior or under-resourced team | Increase Operational Simplicity and Team Fit (+3-5% each); reduce Scalability Headroom |
| Long-lived platform / core infrastructure | Increase Reversibility and Scalability Headroom (+3-5% each); reduce Time to Value |
| High existing operational burden / fragile system | Increase Operational Simplicity (+5%); reduce Organizational Alignment |
| Known security audit or compliance requirement | Increase Security & Compliance (+5-10%) |

Present your specific recommendations to the user based on the constraints you gathered in Phase 1. Then wait for their response before proceeding.

If the user confirms the defaults or provides adjustments, note the final weights used and the rationale for any changes.

The weights config is referenced at `config/scoring_weights.yaml` — if this file exists and contains saved weights for this context, prefer those as the starting point.

---

## Step 2: Score Each Solution on All 11 Dimensions

Apply the confirmed weights. Score each solution on a **1-10 integer scale**.

### Scoring Rules (Non-Negotiable)

1. **No perfect 10s or 1s without explicit justification.** A score of 10 means "cannot be improved in this context." A score of 1 means "catastrophically fails on this dimension." Both are rare. If you assign a 10 or 1, write a full sentence explaining why nothing else in the feasible solution space would score differently.

2. **Scores are relative, not absolute.** You are comparing solutions against each other within this specific context, not against a universal ideal. The best solution on a dimension gets the highest score; the worst gets the lowest. Two solutions can share a score if they are genuinely equivalent on a dimension.

3. **Each score requires a 1-sentence justification.** "Solution 1 scores 7 on Technical Soundness" is not useful. "Solution 1 scores 7 on Technical Soundness because it uses established outbox pattern with well-understood failure modes, though it introduces a new polling component that adds latency variance" is useful.

4. **Note assumption sensitivity for each score.** If a score depends on an assumption that might not hold, flag it inline: `[7 — assuming A3: team has Kafka operational experience. If false: 4]`.

---

## Step 3: Classify Each Score as Known, Informed Assumption, or Unknown

For each score, classify the heuristic basis:

| Classification | Meaning | How to Handle |
|---------------|---------|---------------|
| **Known** | Based on concrete data gathered in this analysis (Confluence documentation, codebase findings, explicit product requirements, stated constraints) | Cite the source (Confluence page, codebase finding, stated constraint) |
| **Informed Assumption** | Estimated from patterns, context, and engineering judgment — not directly verified | State the assumption and its basis explicitly. Example: "Assumed team has ~2 years Spring Boot experience based on codebase patterns observed." |
| **Unknown** | Cannot be determined from available information | Make a clearly labeled default assumption and show sensitivity: "Assuming [X]. If [X] is wrong, score shifts from N to M, and the ranking impact is: [describe]." |

Unknown heuristics are not failures — they are signals about where the analysis is weakest and where the recommendation should be hedged.

---

## Step 4: Scoring Table

Produce the scoring table in this format. Every cell must be filled.

```
### Scoring Table

| Dimension | Wt | Sol 1: [Name] | Basis | Sol 2: [Name] | Basis | Sol 3: [Name] | Basis |
|-----------|-----|--------------|-------|--------------|-------|--------------|-------|
| Business Alignment | 15% | [1-10] | [1-sentence + classification] | [1-10] | [...] | [1-10] | [...] |
| Time to Value | 12% | | | | | | |
| Technical Soundness | 12% | | | | | | |
| Scalability Headroom | 8% | | | | | | |
| Failure Resilience | 10% | | | | | | |
| Operational Simplicity | 10% | | | | | | |
| Team Fit | 10% | | | | | | |
| Organizational Alignment | 5% | | | | | | |
| Reversibility | 8% | | | | | | |
| Complexity Budget | 5% | | | | | | |
| Security & Compliance | 5% | | | | | | |
```

**Basis column legend**: append `[K]`, `[IA]`, or `[U]` to classify the heuristic (Known, Informed Assumption, Unknown).

---

## Step 5: Scoring Dimension Definitions

Apply these definitions consistently when scoring.

### 1. Business Alignment (15%)
Does this solution directly serve the stated business objective? Does it deliver the outcome the product team needs?
- **10**: Directly and completely addresses the business objective; no gaps
- **7-9**: Addresses the primary objective; minor gaps or indirect delivery
- **4-6**: Partially addresses the objective; requires follow-on work to close gaps
- **1-3**: Weakly addresses the objective; significant gap remains

### 2. Time to Value (12%)
How quickly does this solution deliver meaningful value? When does the first useful increment land?
- **10**: Value delivered in days to 1 week
- **7-9**: First meaningful increment in 2-4 weeks
- **4-6**: Value visible in 1-3 months
- **1-3**: Full delivery requires 4+ months; no meaningful increments before that

### 3. Technical Soundness (12%)
How technically well-founded is this approach? Does it use proven patterns correctly? Are there known pitfalls?
- **10**: Industry-standard pattern, well-understood failure modes, no significant technical risk
- **7-9**: Sound approach with minor technical risks or novel elements
- **4-6**: Workable but with non-trivial technical risk or significant unknowns
- **1-3**: Technically fragile, relies on unproven technology, or has known serious weaknesses

### 4. Scalability Headroom (8%)
Does this solution have room to grow? At what scale does it require re-architecture?
- **10**: Scales 100x beyond current requirements with no architectural changes
- **7-9**: Scales 10x; minor work required beyond that
- **4-6**: Adequate for near-term; requires significant work at 3-5x growth
- **1-3**: Already near ceiling; will require re-architecture within 12 months

### 5. Failure Resilience (10%)
How well does this solution handle failures? Does it fail safely, detect failures quickly, and recover cleanly?
- **10**: Fully self-healing, no data loss on any failure mode, automated recovery
- **7-9**: Handles most failure modes automatically; rare failures require simple manual intervention
- **4-6**: Common failure modes handled; some scenarios require significant manual recovery
- **1-3**: Fragile; likely to lose data or require extended manual recovery on common failures

### 6. Operational Simplicity (10%)
How easy is this solution to run, monitor, and debug in production?
- **10**: No new infrastructure; minimal new monitoring; failures are obvious and easy to diagnose
- **7-9**: Small operational delta; runbooks are simple; on-call burden is low
- **4-6**: Moderate operational overhead; new infrastructure to manage; moderate runbook complexity
- **1-3**: High operational burden; complex infrastructure; failures are hard to diagnose

### 7. Team Fit (10%)
Can the team who will build and own this execute it successfully with their current skills?
- **10**: Uses only patterns and technologies the team already owns deeply
- **7-9**: Small learning curve; team can ramp in 1-2 weeks
- **4-6**: Moderate skill gap; meaningful ramp-up required; key-person dependency risk
- **1-3**: Significant skills gap; likely to require external expertise or carry high risk during implementation

### 8. Organizational Alignment (5%)
Does this solution align with team ownership structures, avoiding cross-team friction?
- **10**: Entirely within one team's ownership; no cross-team dependencies
- **7-9**: Minor cross-team coordination needed; clear ownership
- **4-6**: Multiple teams involved; coordination overhead is non-trivial
- **1-3**: Fights org structure; significant ownership confusion; high coordination cost

### 9. Reversibility (8%)
How costly is it to reverse or significantly modify this decision if context changes?
- **10**: All decisions are two-way doors; can be changed at any time with low cost
- **7-9**: One or two one-way doors with manageable reversal cost
- **4-6**: Multiple one-way doors; reversal requires significant engineering effort
- **1-3**: Core decision is a deep one-way door; reversal would require near-full rewrite or painful migration

### 10. Complexity Budget (5%)
What is the net impact on the system's overall cognitive and operational complexity?
- **10**: Reduces existing complexity; simplifies the system
- **7-9**: Neutral or minimal addition to complexity
- **4-6**: Meaningful complexity addition; new abstractions require ongoing learning
- **1-3**: Significant complexity addition; introduces concepts or infrastructure that will be a long-term burden

### 11. Security & Compliance (5%)
Does this solution meet security and compliance requirements? Does it introduce new attack surface?
- **10**: Meets all requirements; reduces attack surface vs. current state
- **7-9**: Fully compliant; no new meaningful attack surface
- **4-6**: Compliant with some risk areas to address; minor new attack surface
- **1-3**: Compliance gaps or significant new attack surface; requires remediation before production

---

## Step 6: Compute Composite Scores

For each solution, compute:

```
Composite Score = SUM( dimension_score × weight ) for all 11 dimensions
```

Show the full calculation — do not just present the final number. Reviewers must be able to verify the math.

```
Solution 1: [Name]
  Business Alignment:      7 × 0.15 = 1.050
  Time to Value:           8 × 0.12 = 0.960
  Technical Soundness:     6 × 0.12 = 0.720
  Scalability Headroom:    7 × 0.08 = 0.560
  Failure Resilience:      6 × 0.10 = 0.600
  Operational Simplicity:  8 × 0.10 = 0.800
  Team Fit:                9 × 0.10 = 0.900
  Org Alignment:           8 × 0.05 = 0.400
  Reversibility:           7 × 0.08 = 0.560
  Complexity Budget:       8 × 0.05 = 0.400
  Security & Compliance:   7 × 0.05 = 0.350
  ─────────────────────────────────────────
  COMPOSITE SCORE:                    7.30 / 10
```

---

## Step 7: Confidence Bands

For each solution, compute a confidence band that reflects assumption sensitivity.

The confidence band is the range the composite score would move if the key Unknown and shaky Informed Assumption heuristics were scored at their alternate value.

1. Identify all scores tagged `[U]` (Unknown) and `[IA]` (Informed Assumption)
2. For each, note the alternate score if the assumption is wrong
3. Compute the composite score under the pessimistic and optimistic alternate assumptions
4. Report as `[base score] +/- [band width]`

Example:
```
Solution 2 Base Composite: 6.85
  Key uncertainty: Team Fit scored 8 [IA — assumed Kafka experience].
    If wrong → Team Fit = 4. Score drops by (8-4) × 0.10 = 0.40
  Key uncertainty: Operational Simplicity scored 7 [U — no ops data available].
    If wrong → Operational Simplicity = 4. Score drops by (7-4) × 0.10 = 0.30

Pessimistic composite: 6.85 - 0.40 - 0.30 = 6.15
Confidence band: 6.85 +/- 0.70
```

---

## Step 8: Composite Scores Summary Table

| Solution | Composite Score | Confidence Band | Primary Uncertainty |
|----------|----------------|----------------|-------------------|
| [Name 1] | [X.XX] / 10 | +/- [Y] | [Key assumption driving the band] |
| [Name 2] | [X.XX] / 10 | +/- [Y] | [...] |
| [Name 3] | [X.XX] / 10 | +/- [Y] | [...] |

---

## Step 9: Conditional Ranking

State the ranking clearly, but qualify it.

```
RANKING (with default weights, base assumptions):
  #1: [Solution name] — [X.XX]
  #2: [Solution name] — [X.XX]
  #3: [Solution name] — [X.XX]
```

Then state conditional rankings for the key sensitivity scenarios:

```
CONDITIONAL RANKINGS:

If [key assumption A changes — e.g., "team does not have Kafka experience"]:
  → [Solution name] drops from #1 to #2; [Solution name] rises to #1
  → Reason: [brief explanation]

If [weight adjusted — e.g., "Time to Value weight increased to 20%"]:
  → Rankings shift to: [new order]
  → Reason: [brief explanation]

If [assumption B changes — e.g., "throughput requirement doubles"]:
  → [Solution name] drops from #2 to #3
  → Reason: [brief explanation]
```

This section prevents the recommendation from being taken as context-independent. Reviewers who know something you do not can apply the sensitivity analysis themselves.

---

## Step 10: Sensitivity Analysis Summary

Write a prose paragraph summarizing the overall robustness of the ranking:

- Is the #1 solution dominant (leads on most dimensions, not dependent on a single assumption)?
- Are the confidence bands narrow (reliable ranking) or wide (uncertain)?
- Is there a scenario where the Simplest Path should win that reviewers should pressure-test?
- What is the single piece of information that, if learned, would most likely change the recommendation?

---

## Persist Results

Append to the temp file under:

```markdown
## Recommendation Scoring

### Weights Applied
| Dimension | Weight | Rationale |
|---|---|---|
| [...] | [%] | [...] |

### Scoring Table
[Full table with all scores, justifications, and basis classifications]

### Composite Score Calculations
[Full math for each solution]

### Composite Scores Summary
[Summary table with confidence bands]

### Conditional Rankings
[Ranking under base assumptions + key sensitivity scenarios]

### Sensitivity Analysis
[Prose paragraph on ranking robustness]
```

---

## After Completing This Phase

Confirm scoring is written to the temp file. Proceed to Phase 8: Document Generation.
