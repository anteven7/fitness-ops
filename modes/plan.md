# Build a training and nutrition cycle

Read `docs/COACHING.md`, `docs/QUALITY_STANDARD.md`, relevant evidence, the profile, current plan/reviews if any, and `templates/plan.json`. Use `node fitness.mjs summary YYYY-MM-DD` for a dated baseline. Do not use example data as the user's baseline.

## Deliver a complete plan

1. **Objective:** primary goal, baseline, success criteria, horizon, realistic tradeoffs, and assumptions. Distinguish a target from a guaranteed outcome.
2. **Macrocycle:** phase dates/objectives over the requested horizon. Avoid committing far-future loads. Include checkpoints and criteria for changing phase.
3. **Mesocycles:** contiguous dated blocks within the macrocycle, specific focus, volume/intensity direction, progression, fatigue strategy, and exit criteria. Explain the purpose of each phase.
4. **First microcycle:** exact dated sessions for the next week (or user's repeat cycle), rest days, conditioning and recovery. Each exercise needs sets, rep range, target RIR, rest, a load-selection method, progression rule, and practical alternatives. Include warm-up/ramp-up, time estimate, and a shortened-session option. Session lengths must fit availability. Do not invent starting kilograms; use recorded performance or conservative effort-based selection.
5. **Nutrition:** calorie/macro estimates only when appropriate and useful, or specific meal/habit structure otherwise. Include portions, meal examples, restrictions, protein distribution, carbohydrate support for training, dietary variety, preparation, and groceries. See `nutrition` for the full meal-plan workflow.
6. **Review:** the first review date, minimum useful tracking, what would trigger an early adjustment, and what would count as success.

Write the full human-readable plan in the plan's `body_md`. Use structured metadata for dates, blocks, scheduled sessions, nutrition targets, provenance, and revisions. The metadata and body must agree. Put the detailed first microcycle in the body; if later microcycles are not yet authored, set `microcycle_end_date` honestly so status shows when the next week is needed. Do not pretend the whole macrocycle has detailed sessions.

Fill `coaching`: authored microcycle start date, executable session prescriptions, practical nutrition, and explanations covering training/nutrition/recovery/measurement. Each explanation states the recommendation, individual rationale, evidence or heuristic basis, sources, uncertainty, and reassessment trigger. Register only verified relevant sources; do not use citations as decoration. For numeric food plans, include representative complete menu days with weighed ingredients and matching source values so totals can be computed. Clearly map rotating menus to the schedule; a representative day is not a fully prescribed future week.

Save through `plan save`, run `plan audit ID`, correct flagged gaps, then review actual scientific relevance and prose/metadata agreement. Activate when fulfilling a request to create/replace the user's plan. If only proposing options, save a draft without activation. Run `doctor`, inspect the saved plan, and give the user the first session, rationale and review date.
