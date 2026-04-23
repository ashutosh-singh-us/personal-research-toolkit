# Software Architect Agent

A decision-support AI agent that produces comprehensive architectural analysis documents. Given a problem statement or feature request, it generates multiple solution approaches, argues both sides of each design decision, and ranks solutions using a weighted recommendation scoring system.

This is NOT a code generator. It thinks like a senior software architect: making good trade-offs in complex systems under real-world constraints, and documenting the reasoning so others can follow, challenge, and build on it.
x   
## How It Works

```
User provides problem statement + optional context
    |
    v
+---------------------------------------------+
|      Software Architect Agent                |
|         (Supervisor/Orchestrator)            |
|                                              |
|  Phase 1: Problem Understanding              |
|  Phase 2: Context Gathering -----> confluence-research-agent
|  Phase 3: Scope Discovery -------> aha-research-agent
|  Phase 4: Codebase Analysis -----> lead_developer (per repo)
|  Phase 5: Solution Design                    |
|  Phase 6: Trade-off Analysis                 |
|  Phase 7: Scoring & Ranking                  |
|  Phase 8: Document Generation                |
+---------------------------------------------+
    |
    v
output/<problem-slug>-architecture-analysis.md
```

## Usage

### Claude Code

```bash
# Invoke as a slash command from any directory
/software-architect "Add real-time webhook delivery status tracking to the webhook service"

# With constraints
/software-architect "Migrate user preferences from SQL to NoSQL" \
  --workspace ~/Projects/user-prefs-service \
  --timeline "Q3 2026" \
  --team "2 backend engineers"

# With AHA epic context
/software-architect "Design the architecture for PROJ-E-456" \
  --aha-epic https://mastercard.aha.io/epics/PROJ-E-456 \
  --workspace ~/Projects/notification-service ~/Projects/webhook-service
```

### GitHub Copilot CLI

```bash
@workspace /software-architect-agent Add real-time webhook delivery status tracking
```

## Sub-Agent Integration

The architect delegates research to existing agents in the toolkit:

| Sub-Agent | When Invoked | What It Provides |
|---|---|---|
| `confluence-research-agent` | Understanding existing systems, prior art, known constraints | Research reports on existing documentation |
| `aha-research-agent` | Understanding product scope, epic requirements, adjacent work | Epic breakdown, feature requirements |
| `lead_developer` | Understanding codebase structure, patterns, tech debt | Per-repo technical landscape analysis |

## Output

The agent produces an **Architectural Analysis Document** at `output/<problem-slug>-architecture-analysis.md` containing:

1. Executive Summary
2. Problem Understanding
3. Context Landscape (from sub-agents)
4. Assumptions & Unknowns
5. Solution Proposals (2-4 alternatives, each with arguments for/against)
6. Comparative Analysis
7. Recommendation Scoring (weighted multi-criteria, transparent and verifiable)
8. Final Recommendation
9. Appendix

## Scoring Model

Solutions are scored across 11 dimensions with configurable weights:

| Dimension | Default Weight |
|---|---|
| Business Alignment | 15% |
| Time to Value | 12% |
| Technical Soundness | 12% |
| Failure Resilience | 10% |
| Operational Simplicity | 10% |
| Team Fit | 10% |
| Scalability Headroom | 8% |
| Reversibility | 8% |
| Complexity Budget | 5% |
| Organizational Alignment | 5% |
| Security & Compliance | 5% |

Weights are adjustable per engagement. The agent asks before scoring if defaults should be customized.

## File Structure

```
software-architect-agent/
+-- README.md                           # This file
+-- AGENT.md                            # Core agent prompt / system instructions
+-- config/
|   +-- scoring_weights.yaml            # Default and customizable scoring weights
|   +-- heuristics.yaml                 # Known heuristic patterns and defaults
|   +-- output_templates.yaml           # Document section templates
+-- prompts/
|   +-- system_prompt.md                # Full system prompt for the architect agent
|   +-- problem_intake.md               # Phase 1: understanding the problem
|   +-- context_gathering.md            # Phase 2-4: sub-agent delegation
|   +-- solution_design.md              # Phase 5: generating solutions
|   +-- trade_off_analysis.md           # Phase 6: arguing both sides
|   +-- scoring.md                      # Phase 7: scoring and ranking
|   +-- document_generation.md          # Phase 8: final document assembly
+-- schemas/
|   +-- input_schema.yaml               # Input validation schema
|   +-- output_schema.yaml              # Output document schema
+-- sub_agents/
|   +-- confluence_integration.md       # How to invoke confluence-research-agent
|   +-- aha_integration.md              # How to invoke aha-research-agent
|   +-- lead_developer_integration.md   # How to invoke lead_developer sub-agent
+-- examples/
|   +-- sample_output.md                # Example architectural analysis document
+-- tools/
    +-- scoring_calculator.py           # Utility for weighted score calculation
```

## Design Principles

- **No dogma**: Every recommendation states what it optimizes for AND what it sacrifices
- **Transparent scoring**: Anyone can verify the math and challenge individual scores
- **Failure-oriented**: Every solution includes failure mode analysis
- **Context-aware**: Evaluates designs against actual team, timeline, and org constraints
- **Reversibility-conscious**: Classifies decisions as one-way or two-way doors
- **Complexity-budgeted**: Tracks carrying cost of every abstraction and indirection
