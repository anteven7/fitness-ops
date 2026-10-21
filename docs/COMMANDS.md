# Command guide

Your assistant normally runs these for you. All commands use Node.js 22+ and built-in modules; there is no dependency installation or network access. Run from the repository root unless using the absolute path to `fitness.mjs`.

## First run

```sh
node fitness.mjs init Europe/Madrid
node fitness.mjs status
```

Choose your actual IANA timezone. If omitted on first initialization, UTC is used. Later `init` calls preserve the existing timezone and every user file. Change the timezone through a profile import.

Start a conversation with: “Read AGENTS.md and onboard me for fitness-ops.” You can stop and resume the interview; the profile supports partial answers.

## Profile

```sh
node fitness.mjs profile show
```

Have the assistant read `private/profile.json`, preserve its existing fields and `revision`, and save an updated copy to `private/drafts/profile.json`. Then:

```sh
node fitness.mjs profile import private/drafts/profile.json
```

The importer validates the complete object, checks that its revision is current, saves an immutable snapshot, and increments the revision. An identical import is a no-op. It does not merge patches or silently discard unknown fields. This prevents one conversation from overwriting a newer profile accidentally.

## Logs

Copy the appropriate `templates/{workout,nutrition,recovery,measurement}.json` into `private/drafts/`. Replace the ID/date and fill only reported observations. Placeholders are intentionally not runnable records.

```sh
node fitness.mjs log workout private/drafts/workout.json
node fitness.mjs log nutrition private/drafts/nutrition.json
node fitness.mjs log recovery private/drafts/recovery.json
node fitness.mjs log measurement private/drafts/measurement.json
node fitness.mjs logs workout
```

Use a stable descriptive ID such as `2026-10-21-session-a`. Retrying identical content with the same ID is safe. If omitted, the toolkit generates a UUID; use stable IDs when a call may be retried. To correct an entry, use a new ID and `"supersedes": "old-id"`. Corrections must refer to the active entry of the same kind/date. To correct a wrong date, preserve the original, explain the error in context, and ask for a deliberate data repair; the normal correction command intentionally does not rewrite dates or raw history.

There is one effective measurement and recovery entry per date. Nutrition can contain multiple partial meal entries plus one complete-day summary. Complete-day averages ignore partial meal entries rather than double counting them. A complete-day log may contain habit notes with no calorie data; each numerical average reports its own observation count.

A workout can link `plan_id` and `session_key`. This makes planned-versus-recorded reporting possible. A workout with no plan link is still counted as activity but cannot prove completion of a scheduled session. Record an actual skipped session explicitly; absence of a log is unknown.

## Plans

The assistant creates the full individualized plan in `body_md` of a draft based on `templates/plan.json`. Metadata holds the cycle dates, blocks, first detailed microcycle, sessions, targets and evidence. Read [the data contract](DATA_CONTRACT.md) for exact rules.

```sh
node fitness.mjs plan save private/drafts/plan.json
node fitness.mjs plan audit cycle-1-v1
node fitness.mjs plan activate cycle-1-v1
node fitness.mjs plan show
node fitness.mjs plan show cycle-1-v1
```

`save` creates a draft and does not change the active plan. `activate` records the selected plan. Activation checks planning prerequisites, profile revision, expiry, declared energy-strategy constraints, and the coaching package. Run `plan audit ID` to see missing details and computed menu totals. The checks do not assess the exercise or meal prescriptions for medical suitability. A future-start plan may be activated; its start date remains visible in status and it is not today's workout before then.

For a revision use a new `id` and `parent_id` pointing to the earlier plan. Keep session keys stable only for the same intended dated session. Outcomes from an ancestor carry forward only when both key and scheduled date are unchanged. A new block should use new session keys. Old versions stay on disk.

`microcycle_end_date` marks the last day of the detailed schedule. After it passes, status prompts the assistant to write the next microcycle; it does not pretend that a high-level 12-week outline is a full 12-week workout calendar.

## Reviews

```sh
node fitness.mjs summary 2026-10-21
node fitness.mjs review save private/drafts/review.json
node fitness.mjs reviews
node fitness.mjs status
```

Use your actual review date. Omitting the summary date uses today in the profile timezone. The summary uses two adjacent seven-day windows ending on the chosen day. It reports coverage, not a verdict on what should change. The schedule comparison uses the currently active version, which is explicitly labelled; it is not a reconstruction of every historical schedule.

The latest dated review of the active plan supplies the next review date. Saving a review does not edit the plan or apply its proposed changes. A review of an older version does not postpone the current version's review. For a block review, the assistant should also inspect all relevant raw logs, because the built-in summary covers only two weeks.

## Optional arithmetic and integrity checks

```sh
node fitness.mjs estimate
node fitness.mjs doctor
npm test
```

`estimate` requires adult age, height and body mass. It reports resting energy using Mifflin–St Jeor, not maintenance calories or a recommended intake. You can skip this method entirely.

`doctor` checks structure and references. A blank but valid profile can pass while status still lists missing planning information. Review actual coaching content separately. `npm test` uses isolated temporary records and never modifies your personal data.

## Storage, backup and recovery

Data always lives under this checkout's `private/`, regardless of the command's current working directory. Explicit JSON input filenames resolve relative to the caller's working directory. No environment variable silently redirects your records.

Back up `private/` to a destination you control. It contains sensitive information and is not encrypted. Source-only archives should exclude `private/`, `.git/`, `.env*`, and temporary files. Copying the entire repository with a file manager includes personal data unless you exclude it.

Writes take a single `private/.write-lock` directory and replace complete JSON files atomically. A crash can leave the lock. If the CLI reports an interrupted writer, first ensure no fitness-ops write is running, back up the folder, then remove only the empty lock directory:

```sh
rmdir private/.write-lock
node fitness.mjs doctor
```

Do not delete data files to clear a lock. Corrupt JSON is reported as an error, never replaced with an empty record. If interruption leaves a profile snapshot that is newer than `profile.json`, inspect both before repair; the next normal import preserves the orphan snapshot and chooses a fresh revision number. The toolkit does not auto-delete historical snapshots.

## Explain, inspect evidence, and check menu arithmetic

```sh
node fitness.mjs explain formulas
node fitness.mjs explain measurements
node fitness.mjs explain evidence
node fitness.mjs explain coaching
node fitness.mjs evidence
node fitness.mjs evidence MIFFLIN
node fitness.mjs menu private/drafts/menu-days.json
node fitness.mjs plan audit cycle-1-v1
```

`menu-days.json` is an array with the same shape as `coaching.nutrition.menu_days` in a plan. The calculator shows ingredient-derived meal/day sums; it does not fetch food data, validate a source's truth, detect every allergen or determine dietary adequacy. `evidence` prints the maintained source register, including population, access scope and limitations. `plan audit` exits with a failure status on incomplete or inconsistent content; activation uses the same checks.
