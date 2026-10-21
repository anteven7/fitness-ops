# Record observations

Read `docs/COMMANDS.md` and the matching template. Extract only what the user actually reports; ask only for ambiguities that affect meaning (load units, whether a dumbbell load is per hand, whether reps are per side, food quantities, or date). A plan is not evidence of completion.

Choose workout, nutrition, recovery, or measurement. Use local date and canonical units, and preserve conventions in notes. Workout status may be completed, partial, or skipped; missing logs stay missing. Record optional numerical fields only when supplied. A meal alone is not a complete day of nutrition: use `complete_day: false` and give a unique meal ID. Daily totals use `complete_day: true`.

Save a JSON draft under `private/drafts/`, then use `log KIND FILE`. Stable IDs make retrying the same input idempotent. A correction must use a new ID and `supersedes` the active record of the same kind/date. Never silently replace a raw record. Recovery/measurement and complete nutrition-day records allow only one active entry per date.

Summarize what was saved and a directly useful observation, if one exists. No routine praise for low calories, extreme effort, or weight change. Do not change the program from one isolated log.
