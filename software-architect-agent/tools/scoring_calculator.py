#!/usr/bin/env python3
"""
Scoring Calculator for the Software Architect Agent.

Computes weighted composite scores for architectural solution proposals.
Validates weights sum to 1.0, enforces scoring rules, and produces
formatted output tables.

Usage:
    python scoring_calculator.py                    # Interactive mode
    python scoring_calculator.py --example          # Run with example data
    python scoring_calculator.py --weights-file scoring_weights.yaml
"""

import argparse
import json
import sys
from dataclasses import dataclass, field


# Default scoring dimensions and weights
DEFAULT_WEIGHTS = {
    "business_alignment": 0.15,
    "time_to_value": 0.12,
    "technical_soundness": 0.12,
    "scalability_headroom": 0.08,
    "failure_resilience": 0.10,
    "operational_simplicity": 0.10,
    "team_fit": 0.10,
    "organizational_alignment": 0.05,
    "reversibility": 0.08,
    "complexity_budget": 0.05,
    "security_compliance": 0.05,
}

DIMENSION_LABELS = {
    "business_alignment": "Business Alignment",
    "time_to_value": "Time to Value",
    "technical_soundness": "Technical Soundness",
    "scalability_headroom": "Scalability Headroom",
    "failure_resilience": "Failure Resilience",
    "operational_simplicity": "Operational Simplicity",
    "team_fit": "Team Fit",
    "organizational_alignment": "Organizational Alignment",
    "reversibility": "Reversibility",
    "complexity_budget": "Complexity Budget",
    "security_compliance": "Security & Compliance",
}


@dataclass
class SolutionScore:
    name: str
    scores: dict[str, float] = field(default_factory=dict)
    justifications: dict[str, str] = field(default_factory=dict)


def validate_weights(weights: dict[str, float]) -> list[str]:
    """Validate that weights are well-formed."""
    errors = []
    total = sum(weights.values())
    if abs(total - 1.0) > 0.001:
        errors.append(f"Weights sum to {total:.3f}, must sum to 1.0")
    for dim, w in weights.items():
        if w < 0 or w > 1:
            errors.append(f"Weight for {dim} is {w}, must be between 0 and 1")
        if dim not in DEFAULT_WEIGHTS:
            errors.append(f"Unknown dimension: {dim}")
    for dim in DEFAULT_WEIGHTS:
        if dim not in weights:
            errors.append(f"Missing dimension: {dim}")
    return errors


def validate_scores(solution: SolutionScore) -> list[str]:
    """Validate scoring rules."""
    errors = []
    for dim, score in solution.scores.items():
        if not 1 <= score <= 10:
            errors.append(f"{solution.name}: {dim} score {score} out of range [1, 10]")
        if score in (1, 10) and dim not in solution.justifications:
            errors.append(
                f"{solution.name}: {dim} scored {score} (extreme) without justification"
            )
    for dim in DEFAULT_WEIGHTS:
        if dim not in solution.scores:
            errors.append(f"{solution.name}: missing score for {dim}")
    return errors


def compute_composite(
    solution: SolutionScore, weights: dict[str, float]
) -> float:
    """Compute the weighted composite score."""
    total = 0.0
    for dim, weight in weights.items():
        score = solution.scores.get(dim, 0)
        total += score * weight
    return round(total, 2)


def compute_sensitivity(
    solutions: list[SolutionScore],
    weights: dict[str, float],
    assumption_dims: dict[str, dict[str, float]],
) -> dict[str, list[tuple[str, float]]]:
    """
    Compute how rankings change if assumption-sensitive scores change.

    assumption_dims: {assumption_id: {solution_name: adjusted_score_for_affected_dim}}
    Returns: {assumption_id: [(solution_name, adjusted_composite)]}
    """
    results = {}
    for assumption_id, adjustments in assumption_dims.items():
        adjusted_composites = []
        for sol in solutions:
            adjusted_scores = dict(sol.scores)
            if sol.name in adjustments:
                for dim, new_score in adjustments[sol.name].items():
                    adjusted_scores[dim] = new_score
            total = sum(
                adjusted_scores.get(d, 0) * w for d, w in weights.items()
            )
            adjusted_composites.append((sol.name, round(total, 2)))
        adjusted_composites.sort(key=lambda x: x[1], reverse=True)
        results[assumption_id] = adjusted_composites
    return results


def format_scores_table(
    solutions: list[SolutionScore], weights: dict[str, float]
) -> str:
    """Format the full scoring table as markdown."""
    lines = []

    # Header
    header = "| Dimension | Weight |"
    separator = "|-----------|--------|"
    for sol in solutions:
        header += f" {sol.name} | Justification |"
        separator += "-------|--------------|"
    lines.append(header)
    lines.append(separator)

    # Rows
    for dim, weight in weights.items():
        label = DIMENSION_LABELS.get(dim, dim)
        row = f"| {label} | {weight:.0%} |"
        for sol in solutions:
            score = sol.scores.get(dim, "-")
            justification = sol.justifications.get(dim, "")
            row += f" {score} | {justification} |"
        lines.append(row)

    return "\n".join(lines)


def format_composite_table(
    solutions: list[SolutionScore],
    weights: dict[str, float],
    confidence_bands: dict[str, float] | None = None,
) -> str:
    """Format the composite scores table as markdown."""
    composites = [
        (sol.name, compute_composite(sol, weights)) for sol in solutions
    ]
    composites.sort(key=lambda x: x[1], reverse=True)

    lines = [
        "| Solution | Raw Score | Confidence Band | Rank |",
        "|----------|-----------|----------------|------|",
    ]
    for rank, (name, score) in enumerate(composites, 1):
        band = confidence_bands.get(name, 0.5) if confidence_bands else 0.5
        lines.append(f"| {name} | {score:.2f} | +/- {band:.1f} | #{rank} |")

    return "\n".join(lines)


def run_example():
    """Run with example data to demonstrate the calculator."""
    weights = dict(DEFAULT_WEIGHTS)

    sol1 = SolutionScore(
        name="Extend Existing Service",
        scores={
            "business_alignment": 8,
            "time_to_value": 9,
            "technical_soundness": 7,
            "scalability_headroom": 5,
            "failure_resilience": 6,
            "operational_simplicity": 9,
            "team_fit": 9,
            "organizational_alignment": 9,
            "reversibility": 8,
            "complexity_budget": 9,
            "security_compliance": 8,
        },
        justifications={
            "business_alignment": "Directly adds status tracking to existing webhook flow",
            "time_to_value": "Minimal new infrastructure; can ship in 2-3 weeks",
            "technical_soundness": "Proven patterns but adds load to existing service",
            "scalability_headroom": "Existing DB may bottleneck at 10x scale",
            "failure_resilience": "Shares failure domain with webhook dispatch",
            "operational_simplicity": "No new services to deploy or monitor",
            "team_fit": "Team already owns and understands this codebase",
            "organizational_alignment": "Single team, single service",
            "reversibility": "Feature flag allows easy rollback",
            "complexity_budget": "Adds a table and a few endpoints; minimal",
            "security_compliance": "Same security perimeter as existing service",
        },
    )

    sol2 = SolutionScore(
        name="Event-Sourced Status Service",
        scores={
            "business_alignment": 9,
            "time_to_value": 5,
            "technical_soundness": 9,
            "scalability_headroom": 9,
            "failure_resilience": 8,
            "operational_simplicity": 4,
            "team_fit": 5,
            "organizational_alignment": 6,
            "reversibility": 4,
            "complexity_budget": 3,
            "security_compliance": 7,
        },
        justifications={
            "business_alignment": "Complete audit trail and real-time status; exceeds requirements",
            "time_to_value": "New service + event infrastructure; 8-10 weeks minimum",
            "technical_soundness": "Event sourcing is the textbook fit for status tracking",
            "scalability_headroom": "Horizontally scalable; handles 10x with capacity adds",
            "failure_resilience": "Independent failure domain; webhook dispatch unaffected",
            "operational_simplicity": "New service, new event bus, new monitoring dashboards",
            "team_fit": "Team has no event sourcing experience; steep learning curve",
            "organizational_alignment": "May need platform team to provision Kafka",
            "reversibility": "Event store schema is a one-way door; hard to migrate away",
            "complexity_budget": "Adds service, event bus, consumer, new DB; significant",
            "security_compliance": "New service needs security review; new PCI boundary possible",
        },
    )

    sol3 = SolutionScore(
        name="Async Status via Queue",
        scores={
            "business_alignment": 7,
            "time_to_value": 7,
            "technical_soundness": 8,
            "scalability_headroom": 7,
            "failure_resilience": 7,
            "operational_simplicity": 6,
            "team_fit": 7,
            "organizational_alignment": 8,
            "reversibility": 7,
            "complexity_budget": 6,
            "security_compliance": 8,
        },
        justifications={
            "business_alignment": "Covers core status tracking; near-real-time, not instant",
            "time_to_value": "4-5 weeks; uses existing queue infra where available",
            "technical_soundness": "Well-understood async pattern; proven in similar services",
            "scalability_headroom": "Queue provides natural backpressure; scales to 5-7x",
            "failure_resilience": "Queue provides buffer; consumer can recover independently",
            "operational_simplicity": "One new consumer + status table; moderate ops burden",
            "team_fit": "Team knows queues from existing integrations",
            "organizational_alignment": "Stays within team boundary; uses shared queue infra",
            "reversibility": "Can migrate to event sourcing later if needed",
            "complexity_budget": "Adds queue consumer and status table; contained",
            "security_compliance": "Uses existing secured queue infrastructure",
        },
    )

    solutions = [sol1, sol2, sol3]

    # Validate
    for sol in solutions:
        errors = validate_scores(sol)
        if errors:
            print(f"Validation errors for {sol.name}:")
            for e in errors:
                print(f"  - {e}")

    weight_errors = validate_weights(weights)
    if weight_errors:
        print("Weight validation errors:")
        for e in weight_errors:
            print(f"  - {e}")
        return

    # Print scoring table
    print("## Scores\n")
    print(format_scores_table(solutions, weights))
    print()

    # Print composite scores
    print("## Composite Scores\n")
    confidence_bands = {
        "Extend Existing Service": 0.4,
        "Event-Sourced Status Service": 0.8,
        "Async Status via Queue": 0.5,
    }
    print(format_composite_table(solutions, weights, confidence_bands))
    print()

    # Print raw composites
    print("## Raw Calculations\n")
    for sol in solutions:
        composite = compute_composite(sol, weights)
        print(f"{sol.name}: {composite:.2f}")
        for dim, weight in weights.items():
            score = sol.scores[dim]
            contribution = score * weight
            label = DIMENSION_LABELS[dim]
            print(f"  {label}: {score} x {weight:.0%} = {contribution:.2f}")
    print()

    # Sensitivity analysis
    print("## Sensitivity Analysis\n")
    sensitivity = compute_sensitivity(
        solutions,
        weights,
        {
            "A1: Team can learn event sourcing quickly": {
                "Event-Sourced Status Service": {
                    "team_fit": 7,
                    "time_to_value": 7,
                },
            },
            "A2: Existing DB hits scale limits": {
                "Extend Existing Service": {
                    "scalability_headroom": 3,
                    "failure_resilience": 4,
                },
            },
        },
    )
    for assumption, rankings in sensitivity.items():
        print(f"If {assumption}:")
        for rank, (name, score) in enumerate(rankings, 1):
            print(f"  #{rank} {name}: {score:.2f}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Scoring calculator for architectural analysis"
    )
    parser.add_argument(
        "--example", action="store_true", help="Run with example data"
    )
    parser.add_argument(
        "--json",
        type=str,
        help="Path to JSON file with solutions and weights",
    )
    args = parser.parse_args()

    if args.example:
        run_example()
    elif args.json:
        with open(args.json) as f:
            data = json.load(f)

        weights = data.get("weights", DEFAULT_WEIGHTS)
        weight_errors = validate_weights(weights)
        if weight_errors:
            print("Weight validation errors:", file=sys.stderr)
            for e in weight_errors:
                print(f"  - {e}", file=sys.stderr)
            sys.exit(1)

        solutions = []
        for sol_data in data.get("solutions", []):
            sol = SolutionScore(
                name=sol_data["name"],
                scores=sol_data["scores"],
                justifications=sol_data.get("justifications", {}),
            )
            errors = validate_scores(sol)
            if errors:
                print(
                    f"Score validation errors for {sol.name}:",
                    file=sys.stderr,
                )
                for e in errors:
                    print(f"  - {e}", file=sys.stderr)
                sys.exit(1)
            solutions.append(sol)

        print(format_scores_table(solutions, weights))
        print()
        print(format_composite_table(solutions, weights))
    else:
        print("Usage: scoring_calculator.py --example | --json <file>")
        print("Run with --example to see a demonstration.")
        sys.exit(0)


if __name__ == "__main__":
    main()
