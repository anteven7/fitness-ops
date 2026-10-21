# Fitness Ops audit — 21 October 2026

**Verdict:** a more inspectable, tested coaching assistant framework after this revision. It has not been shown to equal or outperform a qualified coach or registered dietitian. The repo runs with an AI assistant; the local scripts organize, check and calculate rather than independently providing clinical judgment.

## Findings and changes

| Finding in version 0.1.0 | Change in version 0.2.0 | Remaining limit |
| --- | --- | --- |
| A structurally valid plan could have vague prose and no executable exercise details. | Activation now requires a structured coaching package with exercises, sets/reps, effort, rest, load selection, technique, progression and alternatives. | Completeness does not prove the exercises or dosage fit the person. |
| A bibliography was not tied to particular recommendations. | Recommendation-level rationale, basis, source IDs, uncertainty and review triggers; IDs resolve against a maintained register. | A real citation can still be misapplied; substantive source review is required. |
| Formula output omitted most workings and applicability context. | Energy estimates show inputs, each arithmetic term, coefficients, source population, rounding and limits. | A prediction is not measured expenditure or an intake prescription. |
| Meal/day totals depended on the assistant's arithmetic. | Ingredient-to-meal-to-day calculator and comparison against numeric plan targets. | Food record accuracy, allergen safety and micronutrient adequacy need review; no food data are fetched automatically. |
| Measuring and interpreting outcomes was underexplained. | Dedicated methods guide, scale anchors, units, denominator explanations, confounders, and numerical minima/maxima. | Self-reports, equipment variation and biological noise remain. |
| Averages could conceal a bad symptom day. | Summary exposes maximum/minimum observations and instructions require review of relevant notes and concerning events. | No automatic diagnostic triage or clearance is performed. |
| Exact practical choices could be mistaken for scientific laws. | Explicit separation of research, guideline, heuristic and preference; formula and tolerance explanations. | The AI must label its reasoning honestly and cannot be guaranteed to do so by a schema. |
| Existing checks only demonstrated recordkeeping reliability. | Additional adversarial completeness, source, schedule, arithmetic and explanation tests. | These are software acceptance tests, not evidence of real-world coaching outcomes. |

## Evidence audit

The register contains 14 research, guideline, measurement and food-data sources with applicability limits and access scope. The training entry now points to the 2026 ACSM position stand's research record, rather than relying only on its press summary. Protein guidance includes both the ISSN position and a meta-analysis, while retaining population and uncertainty caveats. Measurement methods refer to WHO/NHS guidance; food arithmetic refers to USDA methodology. Resting-energy estimates use the original Mifflin equation, with its original age range disclosed. See [the evidence register](EVIDENCE.md).

The review was scoped to the implemented advice and calculations, not a new systematic review of the whole training/nutrition literature. Access was abstract-only or limited for some papers and is recorded. The code does not validate source relevance semantically, check for every newer paper, or provide a clinical risk score.

## Scenario coverage

These are **observed deterministic software tests using fictional inputs**, not independent evaluations of model conversations:

| Scenario | Observed behavior |
| --- | --- |
| Unknown profile or minor | No personalized adult-plan activation. |
| Concerning current symptoms or unsuitable deficit | Activation is blocked under the declared constraints. |
| Habit-based plan without body mass/height/calorie tracking | Supported when other prerequisites are complete. |
| Vague legacy plan without prescriptions/explanations | Saved for inspection, rejected on new activation. |
| Missing source or fabricated source ID | Audit fails. |
| Exercise without progression, technique, load selection or explanation | Audit fails. |
| Workout exceeds available time or weekly training days | Audit fails. |
| Changed allergy/exclusion list without matching plan review | Audit fails; ingredient safety still needs substantive review. |
| Numeric menu missing, inconsistent, or using bad portion data | Audit/calculator fails. |
| Partial food logs or sparse weigh-ins | No fabricated full-day intake or unsupported numerical weight trend. |
| One concerning pain rating among better days | Maximum is visible alongside the descriptive mean. |
| Revision drops required explanations | It cannot replace the active plan. |

A complete fictional payload also passes save → audit → activation → log → summary/review/version checks. This demonstrates the data workflow, not that the fictional exercise/food content is a professionally endorsed plan. Test fixtures are deliberately excluded from the user's personal records and must not be used for onboarding.

## What would establish real coaching quality

A real-user evaluation should assess goal achievement, adherence, feasibility/enjoyment, explanation comprehension, relevant symptoms, and timely referrals over an agreed interval. A qualified reviewer should examine actual prescriptions, ingredient restrictions, scientific applicability, and cases involving pain, medical conditions or nutrition risk. Source checking and test counts alone cannot answer those questions.

To claim superiority over professionals would require an appropriately designed comparative outcome evaluation. No such evaluation has been run. This repo currently supports evidence-informed planning and accountable review, with clear boundaries on what it can establish.
