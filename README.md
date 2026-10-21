# fitness-ops

Your training and nutrition assistant, with memory and a review loop.

Inspired by career-ops: talk to your assistant, build a persistent profile, run a focused mode, save the result, and use real outcomes to improve the next decision. The assistant provides the coaching; the small local toolkit validates records, preserves plan history, and computes progress summaries. No API key or package install is needed for the toolkit. An AI assistant supplies conversation and planning.

## Start here

Open this folder in your AI coding assistant and say:

> Start fitness-ops onboarding. Get to know my goals, current training, food preferences, schedule, and constraints. Ask a few questions at a time, then build my first training and nutrition block.

The repository's `AGENTS.md` is the entry point. The reusable skill is in `.agents/skills/fitness-ops/SKILL.md`; if your assistant does not discover it, ask it to read `AGENTS.md`. The assistant can handle all file and command work for you.

For terminal use (Node.js 22 or newer):

```sh
node fitness.mjs init
node fitness.mjs status
npm test
```

There are no dependencies to install. `init` is safe to repeat and never replaces your profile. The included profile starts empty; no example measurements or diet targets are treated as yours.

## What you can ask

| Ask | What happens |
| --- | --- |
| “Profile me” | A short, staged interview; goals, baseline, safety, training, food, lifestyle, and preferences are saved. |
| “Plan the next 12 weeks” | A macrocycle, flexible mesocycles, and a fully detailed first microcycle, tied to measurable objectives. |
| “What do I do today?” | Your actual session and meals, adjusted for time, equipment, recovery, and the latest plan. |
| “Make next week's diet and shopping list” | Practical meals, portions, substitutions, preparation, and groceries that respect your restrictions. |
| “Log this workout” | Exercises, actual sets, repetitions, loads, effort, and relevant notes are stored. |
| “Review my week” | Adherence, performance, weight trend if wanted, recovery, and constraints; a reasoned keep/change decision. |
| “I'm travelling for four days” | A dated adaptation with a minimum viable routine and workable food options. |
| “Review this training block” | Compare results with success criteria, decide the next phase, and preserve what worked. |

## Planning at three scales

- **Macrocycle:** the overall goal and horizon, often 8–24 weeks; phase boundaries stay revisable.
- **Mesocycle:** a focused block, often 3–6 weeks, with progression, an exit criterion, and a recovery strategy.
- **Microcycle:** the coming week or repeated schedule: exercises, sets, reps, effort, rest, progression, conditioning, meals, and recovery.

Those durations are planning conventions, not physiological laws. A beginner may repeat a simple weekly routine. An experienced lifter may need more specific blocks. Diet follows the current objective and workload; it does not require artificial calorie cycling.

## Reviews that lead to a decision

Daily adjustments handle symptoms, short nights, missed sessions, and available time. Weekly reviews look at consistency and recovery. Nutrition changes use sustained trends and sufficient observations, not one weigh-in. Block reviews assess the original objective and determine the next block.

Each review records evidence, uncertainty, the decision, the next review date, and what would reverse it. A revision is a new plan linked to the previous one. The toolkit never automatically cuts calories or increases training from a low-confidence signal.

## Your information

`private/` holds your profile, logs, plans, reviews, preferences, and drafts and is excluded from Git. The source repository contains only reusable instructions, code, and empty templates. The toolkit has no network calls or telemetry. Files are not encrypted; your computer and backups determine access. Your AI host may process whatever files you give it under its own settings.

No background schedule is installed. Reviews run when you ask; `status` shows when one is due. Publishing a source repository should not include `private/` or an archive of your personal data.

## Evidence and explanations

Every consequential recommendation should explain why it fits you, the relevant evidence, its uncertainty, and when to revise it. Exact coaching choices are identified as heuristics when research does not establish a single optimal number.

Plans now undergo a completeness/evidence-reference/arithmetic check before activation. This catches missing exercise detail, unsupported source IDs, schedule conflicts and inconsistent menu totals. The assistant must still judge source relevance, food/allergen suitability, technique and individual context. Professional equivalence or superiority has not been demonstrated.

You can ask “explain this recommendation” or use:

```sh
node fitness.mjs explain formulas
node fitness.mjs explain measurements
node fitness.mjs evidence ACSM-2026
node fitness.mjs plan audit PLAN-ID
```

- [Audit findings and validation limits](docs/AUDIT.md)
- [Formulas with worked examples](docs/FORMULAS.md)
- [Measurement methods and meaning](docs/MEASUREMENTS.md)
- [Coaching quality standard](docs/QUALITY_STANDARD.md)

## Documentation

- [Coaching modes](modes/) and [agent entry point](AGENTS.md)
- [Command guide and examples](docs/COMMANDS.md)
- [Data contract](docs/DATA_CONTRACT.md)
- [Training and nutrition decision rules](docs/COACHING.md)
- [Evidence and limits](docs/EVIDENCE.md)

This is a coaching workflow, not a medical diagnostic or treatment system. It can help organize clinician-provided limits. It does not promise a particular physical outcome.

Built from scratch after inspecting the local career-ops architecture. No career-ops code or personal career records were copied.
