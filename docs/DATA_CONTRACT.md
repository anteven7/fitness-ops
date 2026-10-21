# Data contract

Schema version: 1. Unknown fields are rejected in the core structured records so misspellings do not silently drop information. The coaching package is checked separately for required content and relationships. User-facing prose stays in the profile notes, log notes, plan/review `body_md`, context and preferences. Schema validation is not a medical assessment.

## System and personal layers

| System, suitable for source control | Personal, excluded from source control |
| --- | --- |
| `AGENTS.md`, `.agents/skills/`, `modes/` | `private/profile.json` and `private/profile-history/` |
| `fitness.mjs`, `lib/`, `test/` | `private/logs/{workout,nutrition,recovery,measurement}/` |
| `templates/`, `docs/`, `evidence/` | `private/plans/`, `private/reviews/`, `private/active.json` |
| `README.md`, runtime/CI metadata | `private/preferences.md`, `private/context.md`, `private/drafts/` |

No personal information belongs in the system layer. System changes must preserve the personal layer. Git ignores are a useful default, not encryption or protection from an explicit forced add. Tests use fictional data in temporary directories.

## Shared conventions

- Local calendar dates: real `YYYY-MM-DD` dates in the profile timezone. Generated `created_at`/`activated_at` timestamps are UTC. Observations and reviews cannot be future-dated. Plans may be future-dated.
- Units: kg, cm, minutes, kcal and grams. Preserve per-hand/per-side and equipment conventions in notes. Convert display units explicitly rather than storing pounds in a kg field.
- IDs: 1–80 lowercase letters, digits, underscores or hyphens; the first character is a letter or digit. Plan/review IDs are required. A log ID may be generated, but stable IDs support safe retries.
- `null` is unknown/not supplied. An explicit zero remains a value. An empty allergy/exclusion array means the user has confirmed none, not that the interview skipped the question.
- `schema_version` is 1. Writers generate timestamps. The plan writer stamps the current `profile_revision` and the profile importer increments `revision`.
- JSON templates describe the supported fields and are deliberately incomplete. They are not demo profiles or prescriptions.

## Profile

The complete profile shape is in `templates/profile.json`. `profile import` takes a complete edited copy with the current revision. It never merges arbitrary keys. Retain earlier facts and provenance when adding answers.

Important fields:

| Group | Meaning |
| --- | --- |
| `goal` | Primary objective, motivation, optional deadline, success metrics. |
| `training` | Experience, available days/session time, equipment, current routine and preferences. |
| `nutrition` | Habit/target preference, dietary pattern, allergies, exclusions, preferences, budget and cooking context. |
| `recovery` | Reported usual sleep, stress and other activity. |
| `safety` | Date of relevant screening, current concerning symptoms, restrictions, whether professional guidance is needed, suitability for energy restriction, and applicable notes. |
| `provenance` | Map of field/group to source and date, e.g. `"training": "User stated in chat, 2026-10-21"`. |

Age may remain unknown during onboarding; activation of a personalized adult program requires it. Body mass/height are optional except for resting-energy estimates. `energy_equation` is `male`, `female`, or null and only selects the original Mifflin coefficient; it is not inferred identity. `display_units` is metric or imperial; CLI JSON remains canonical metric regardless of display preference.

The activation gate requires adult age, a goal, experience, availability, equipment, allergy/exclusion information and relevant screening. It blocks unresolved concerning symptoms. If professional guidance is needed, applicable guidance must be described; notes alone are not medical clearance, and the assistant must inspect them. A declared deficit is blocked when restriction suitability is false/unknown or professional guidance is needed. The assistant must also check the actual prose, which a structural validator cannot interpret.

## Logs

All logs use `id`, `date`, optional `notes` and optional `supersedes`. Stored records add `schema_version`, `kind` and `created_at`.

- **Workout:** status `completed`, `partial` or `skipped`; optional plan/session link and duration; exercise names with actual sets (`reps`, optional `load_kg`, optional `rir`) and notes. Unloaded work may use `load_kg: null`; zero may represent zero external load. Skipped sessions have no performed exercises. Conditioning can be recorded with duration/notes and an empty exercise list.
- **Nutrition:** `complete_day` is required. Optional kcal/protein/carbohydrate/fat values and notes. Multiple meal entries are allowed. Only one effective complete-day record per date is allowed; complete-day numerical summaries exclude partial entries.
- **Measurement:** optional `weight_kg`, `waist_cm`; at least one is required. One effective record per date.
- **Recovery:** optional sleep hours, energy 1–5 (higher is better), soreness/stress/pain 0–10 (higher is worse), notes. At least one value or note. One effective record per date. These are subjective observations, not diagnostic scales.

Corrections form a single chain. A new record may supersede only an active record of the same kind and date. Old files stay intact and readers use the unreplaced records. Retries with an existing ID must have the same content. A second outcome for the same plan/session must be a correction. Missing logs are unknown, never automatically skipped.

## Plans

Each immutable plan is a complete snapshot with `id`, optional `parent_id`, `title`, `goal`, `rationale`, dates, blocks, sessions, nutrition, sources and `body_md`.

- `start_date` and `end_date`: overall macrocycle horizon in this snapshot.
- `blocks`: ordered mesocycles with name, dates and focus/exit criteria. They must cover the horizon without gaps or overlap.
- `microcycle_end_date`: end of the authored detailed schedule. It must be within the overall horizon. It can advance in a new version without changing macrocycle dates.
- `sessions`: dated scheduled sessions with keys unique within this plan and readable titles. The complete exercise prescription belongs in `body_md`. Rest days do not need a session entry. Do not list a detailed session that has not actually been authored.
- `review_date`: first checkpoint, within the plan or its following week.
- `nutrition.approach`: `habits` or `targets`. Habits keep all numeric target fields null. Targets require kcal, protein_g, carbs_g and fat_g, whose 4/4/9 calorie sum must agree within 5% or 50 kcal (a rounding allowance, not a clinical rule).
- `nutrition.energy_strategy`: `unspecified`, `maintenance`, `deficit`, or `surplus`. This must match the actual prose and intended targets; do not label a deficit as maintenance to bypass checks.
- `sources`: registered evidence IDs actually used. Active plans resolve every ID against `evidence/sources.json`; new primary sources must be verified and registered first.
- `body_md`: full executable training/nutrition plan, progression, alternatives, groceries, recovery, success criteria, assumptions and review triggers. The base schema validates that it exists. The separate coaching audit checks structured prescriptions and menu arithmetic; the assistant must assess clinical correctness, source relevance, and agreement with prose.

Saving does not activate. `active.json` selects a saved plan. No prior plan is overwritten by activation. A changed profile requires a new reviewed plan version before activation. Existing active plans are flagged when the profile changes.

## Reviews

`id`, `plan_id`, review `date`, `window_start`, `next_review_date`, `decision`, `confidence`, `observations`, `changes`, and `body_md`. Decisions: continue, simplify, progress, deload, investigate, revise, professional-input. Confidence: low, moderate, high. The next review must follow the review date.

A review is evidence and reasoning, not an automatic mutation to an exercise or calorie target. `changes` can be proposed; the prose must say whether they were implemented and identify the new plan ID if so. Only reviews associated with the active plan affect its next-review display.

## Summary limits

Two adjacent seven-day windows; all averages show their own observation counts. A numerical weight trend is withheld unless each week has at least four unique measurement days. This cutoff is a conservative product heuristic, not evidence that four measurements prove a plateau. Differences are rounded descriptive values and cannot identify fat/muscle change.

Scheduled adherence uses the current active schedule, plus matching keys/dates in its ancestor plans for recorded outcomes. It does not reconstruct all past active states. For historical or block-level reviews, inspect the saved versions and raw logs, state the observation window, and explain gaps.

## Coaching package (required for new activation, version 0.2.0)

The optional-at-save `coaching` object is required to activate a plan. This preserves readable historical schema-1 drafts while enforcing the new requirements on activation. Existing records are never rewritten automatically.

- `microcycle_start_date`: actual start of the detailed schedule, within the macrocycle and no later than its end. Scheduled sessions must fall inside the authored interval.
- `success_criteria`, `measurement_protocol`, `recovery_plan`, `stop_rules`, `review_triggers`: explanations, not checkbox approvals.
- `explanations[]`: unique `id`, `topic` (training/nutrition/recovery/measurement), `recommendation`, `why_for_user`, `basis` (research/guideline/heuristic/preference), `source_ids`, `uncertainty`, and `reassess_when`. Research/guideline entries need resolvable evidence IDs. A valid ID does not prove the source supports the sentence.
- `training[]`: one per scheduled session, matched by `session_key`; `duration_min`, `warmup`, `shortened_option`, and `exercises[]`. Each exercise has name, sets, reps_min/max, rir_min/max, rest_seconds, load_guidance, technique, progression, alternatives and explanation_ids. The strength-session representation does not model interval cardio; explain conditioning and its rationale in recovery/body prose.
- `nutrition`: method_explanation, menu_md, groceries_md, substitutions_md, micronutrients_md, reviewed_allergies, reviewed_exclusions, allergy_check_notes and explanation_ids. Reviewed arrays must match the current profile; the assistant must still verify actual ingredients and labels.
- For numeric targets, `nutrition.menu_days[]` contains representative complete days: label, meals[{name,items[{food,amount_g,state,source_ref,per_100g:{kcal,protein_g,carbs_g,fat_g}}]}]. State is raw/cooked/drained/as-packaged. Sources must match the actual food and preparation. `source_ref` identifies the exact record or supplied package label; the tool does not fetch or verify it. Each computed menu day is compared with the uniform plan targets using the documented planning tolerances. It is not a clinical nutrient-adequacy assessment.

All recommendation topics need explanations; a plan with scheduled strength sessions also needs training explanations. Each required topic needs at least one applicable research/guideline explanation; exact numeric choices may separately be heuristics. The substantive review remains mandatory even if checks pass.
