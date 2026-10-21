# Weekly review

Read the active plan, profile, last review, and `docs/COACHING.md`. Run `summary` for the user's review date, then inspect the underlying logs that matter. Script flags are prompts to investigate, not coaching decisions.

Cover: planned versus recorded sessions (missing ≠ skipped), goal-specific performance, recovery/sleep, hunger/digestion if reported, nutrition habits or complete-day logs, weight trend only if wanted, life constraints, and confidence. Ask briefly about missing context that would change the decision. Compare like-for-like exercise conditions; do not call a changed machine/rep range a strength regression.

Explain the observation method and denominator before interpreting a trend. Inspect individual values/notes and maxima, not just recovery averages; an acceptable average cannot erase a concerning event. Tell the user what the data cannot establish (for example, fat versus fluid change). Explain the scientific basis and uncertainty of any changed advice and update the plan's explanation package. Use `docs/MEASUREMENTS.md` and `docs/FORMULAS.md` for the user-facing interpretation.

Choose an explicit decision: continue, simplify, progress, deload, investigate, revise, or seek professional input. If adherence is low, address time/food feasibility before escalating volume or tightening intake. For a plateau, establish comparable execution, sufficient duration, and recovery before adding work or reducing energy. Nutrition trend decisions ordinarily need multiple weeks and enough consistent observations. A week with no measurements is not zero weight change.

Write a review with observation window, data coverage, goal metrics, uncertainty/confounders, decision and rationale, exact proposed changes (or none), next review date, and reversal/stop criteria. Use `templates/review.json` and `review save`. If requested to adjust, save and activate a new plan referencing the old plan; never silently edit its numbers. If doing review only, separate the proposal from an active change.

Finish with a short keep/change explanation and the next week's priorities. Update the continuity note. `status` should reflect the next review date.
