# Validation of version 0.2.0

Validated locally on 2026-10-21 with Node.js 24.22.0.

- Automated tests cover persistence, corrections, stale edits, schema/date/unit validation, plan history, review timing, missing-data behavior, summary boundaries and the CLI workflow.
- The expanded suite also covers explanation completeness, evidence references, session feasibility, allergy/exclusion review, ingredient-to-day arithmetic, numeric menu reconciliation, formula workings, applicability warnings and legacy-plan activation behavior.
- The source register records 14 relevant sources, population/context, evidence type, checked date, access scope and limitations. This is a scoped evidence audit, not a systematic review or a formal GRADE assessment.
- Integrity check passes on the initialized empty personal profile. It intentionally remains incomplete for personalized planning. No real-user health or training facts were invented for testing.
- Local documentation links and skill metadata are checked. The bundled Python skill validator lacks PyYAML; equivalent metadata/scaffold checks use an existing JavaScript YAML parser, which is not a dependency of this repo.
- CI is configured for Node.js 22 and 24. Remote CI and Node.js 22 execution have not been verified in this local run.

The current exact test count and results are recorded in [the test report](TEST_RESULTS.txt). See [the audit](AUDIT.md) for findings and limits. No comparative trial, independent clinical review, or real-user outcome validation has been completed.
