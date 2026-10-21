# Onboard and update the profile

Read `templates/profile.json` and `docs/DATA_CONTRACT.md`. Use short conversational rounds (normally 2–4 related questions), reusing explicit answers already supplied. No long form dump and no forced disclosure.

First round: primary objective and why it matters; current training/experience; available days, session length, and equipment. In the next round establish adult status and relevant safety constraints before personalized prescription. Then gather the remaining information that changes the plan:

- Goal priority, baseline, realistic timeline, success metric, and non-negotiables. Explain tradeoffs if maximizing strength, muscle gain, endurance, and fat loss conflict.
- Recent routine, actual loads/reps if known, likes/dislikes, technique confidence, injuries/pain and practical restrictions, conditioning/steps.
- Dietary pattern, explicitly checked allergies/intolerances, preferred foods/cuisines, dislikes, meals/day, budget/currency, shopping/cooking access and time, social eating.
- Sleep, work/study/travel demands, stress, other sport, recovery and adherence history.
- Optional height, body mass, age, weight trend, food intake data. Do not require body photos or body-fat estimates. Offer a no-weighing/no-calorie route.
- Relevant medical/clinician restrictions and whether energy restriction is appropriate. For formula estimates, explain the original equation's sex-specific coefficients and offer to skip that method.
- Language, timezone, display units, desired tracking burden, preferred review cadence.

Persist partial progress using `profile import`; never replace a filled profile with the template. `null` means unknown/not disclosed, `[]` means the user explicitly reports none for fields such as allergies. `safety.current_symptoms` refers to concerning symptoms requiring assessment; ordinary training soreness belongs in recovery logs. Record fact provenance with the date and source (e.g. `user stated in chat 2026-10-21`). The CLI versions the profile.

Summarize what the plan will optimize and the important unknowns. Once planning prerequisites are met, continue directly into `plan` if that is what the user requested. Optional missing measurements should not block a habit-based plan. Under relevant safety constraints, coordinate within supplied professional guidance rather than presenting a generic prescription as cleared.
