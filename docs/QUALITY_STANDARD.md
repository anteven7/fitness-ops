# Coaching quality standard

The goal is consistent, understandable, evidence-informed support. **Professional equivalence or superiority has not been established.** Software tests cannot assess technique in person, diagnose a condition, establish nutrient needs clinically, or demonstrate improved health/performance outcomes. A qualified coach or registered dietitian can contribute these judgments and the assistant should work within their supplied limits.

## Explain every important recommendation

For each consequential training, nutrition, recovery or measurement recommendation, provide:

1. The action and intended benefit in plain language.
2. Why it fits this user's actual goal, history, preferences and constraints.
3. The basis: research, guideline, coaching heuristic, or user preference.
4. A directly relevant source for scientific claims, with population/applicability limits. Distinguish a source's finding from your application of it.
5. For numbers: units, inputs, calculation, assumptions, rounding and uncertainty. For measurements: method, meaning and limits.
6. What observations would justify continuing/changing it, and when it will be reviewed.

Do not pad a plan with unrelated citations. A source that supports progressive training does not automatically prove a chosen split, rep range, deload schedule or load increment. Do not call a general recommendation “optimal” for an individual without evidence. Avoid invented precision and claims that more detail means more certainty.

## Before activating a plan

The assistant performs a substantive review; then `plan audit ID` checks the parts that are possible to check mechanically. The plan must:

- Match the goal and current profile; have achievable success criteria and flexible macro/meso/microcycle logic.
- Give every scheduled strength session actual exercises, work sets, reps, effort, rest, load selection, technique cues, progression and alternatives; fit available time/days. Explain conditioning separately when it is not a structured strength session.
- Provide meals/portions, a feasible grocery list, substitutions, preparation context and micronutrient considerations. Review current allergies/exclusions and package labels; matching the list in metadata does not verify ingredients.
- Link material recommendations to explanations and real evidence records, while labelling unsupported exact choices as heuristics.
- Show food-source values and calculated meal/day totals for numeric target plans; preserve a fully usable habit-based route.
- Explain measurement protocol, recovery, stop rules, review triggers and uncertainty. Read the actual prose and ensure it agrees with the structured data.

`coaching` is the structured explanation/prescription package. See `templates/plan.json`. Incomplete/legacy drafts can still be saved and inspected, but cannot be newly activated until they meet the checks. No stored historical record is overwritten by this change. Existing active legacy plans are flagged by `status`.

## What automated checks establish

They can reject absent explanations, unresolved evidence IDs, incomplete exercise prescriptions, time/frequency mismatches, missing restriction reviews, invalid portions and inconsistent menu arithmetic. They cannot prove that a source supports an arbitrary sentence, that a food source was transcribed correctly, that all allergens were identified, that technique is safe, or that advice is clinically appropriate. A bad plan could still satisfy a structured form. Do not market a passing audit as scientific or medical certification.

Numeric menu checks currently cover representative complete menu days against uniform plan targets. They do not validate every future meal, micronutrient adequacy, or periodized daily energy targets. If using rotating menus, map the days clearly in the prose and preserve realistic flexibility.

## Revision logic

First establish the observation window and data quality. Check symptoms, feasibility and adherence before treating a plateau as insufficient stimulus or too much food. Compare like-for-like performance. For nutrition, inspect sustained trends and confounders; do not cut intake because one day was higher or a workout was missed. Keep the plan when it is working. Explain exactly what changes, why, and what would reverse it.

For real-world validation, agree on goal-specific outcomes, baseline, review horizon, adherence, user burden, adverse symptoms and escalation criteria. Repeated use can reveal feasibility and within-person improvement; it cannot by itself prove superiority over a professional. Such a claim would require an appropriate comparative evaluation with qualified review and measured outcomes.
