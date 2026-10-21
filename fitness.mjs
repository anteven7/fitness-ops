#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { Store, read, REPO } from './lib/store.mjs';
import { summarize, estimateRestingEnergy } from './lib/summary.mjs';
import { assert } from './lib/validate.mjs';
import { auditPlan, menuTotals } from './lib/quality.mjs';
import { sources, validateRegistry } from './lib/evidence.mjs';

const help = `fitness-ops — your assistant reasons; this toolkit keeps the records.

  init [IANA-timezone]         Initialize private records without overwriting
  status                      Show active plan, prerequisites, and review due date
  profile show                Read the current profile
  profile import FILE         Validate/version a full profile (keep its revision)
  log KIND FILE               Store workout, nutrition, recovery, or measurement
  logs KIND                   Read effective records after corrections
  summary [YYYY-MM-DD]         Two-week descriptive summary ending on this date
  plan save FILE              Save an immutable plan draft
  plan activate ID            Make a reviewed plan the active program
  plan audit ID               Check explanations, source references and prescriptions
  plan show [ID]              Read a plan (defaults to active)
  review save FILE            Save an immutable check-in or block review
  reviews                     List reviews
  estimate                    Optional resting-energy estimate, never a diet target
  menu FILE                   Calculate menu totals from grams and food-source values
  evidence [ID]               Show evidence records and applicability limits
  explain TOPIC               Read formulas, measurements, evidence, or coaching
  doctor                      Validate records and references
  help                        Show this guide

Data: private/ under this repository; independent of your current directory.
JSON templates: templates/. Commands and workflows: docs/COMMANDS.md.
No background process or AI provider is started by this program.`;

function take(args, min, max = min) { assert(args.length >= min && args.length <= max, 'Wrong number of arguments; run node fitness.mjs help'); }
function input(file) {
  assert(file, 'A JSON input file is required');
  // Resolve explicit user input files against the calling directory, not the data root.
  return read(path.resolve(file));
}
function main(args) {
  const store = new Store();
  const [command = 'help', ...rest] = args;
  switch (command) {
    case 'help': case '--help': case '-h': take(rest, 0); return help;
    case 'init': take(rest,0,1); store.init(rest[0]); return store.status();
    case 'status': take(rest,0); return store.status();
    case 'profile': {
      const [action, ...params] = rest;
      if (action === 'show') { take(params,0); return store.profile(); }
      if (action === 'import') { take(params,1); return store.importProfile(input(params[0])); }
      throw new Error('Use profile show or profile import FILE');
    }
    case 'log': take(rest,2); return store.saveLog(rest[0], input(rest[1]));
    case 'logs': take(rest,1); store.profile(); return store.logs(rest[0]);
    case 'summary': take(rest,0,1); return summarize(store,rest[0]);
    case 'plan': {
      const [action,...params] = rest;
      if (action === 'save') { take(params,1); return store.savePlan(input(params[0])); }
      if (action === 'activate') { take(params,1); return store.activate(params[0]); }
      if (action === 'audit') { take(params,1); const report=auditPlan(store.getPlan(params[0]),store.profile()); if(!report.ok) process.exitCode=1; return report; }
      if (action === 'show') {
        take(params,0,1); const plan = params[0] ? store.getPlan(params[0]) : store.active()?.plan;
        assert(plan, 'No active plan'); return plan;
      }
      throw new Error('Use plan save FILE, plan activate ID, plan audit ID, or plan show [ID]');
    }
    case 'review': take(rest,2); assert(rest[0] === 'save', 'Use review save FILE'); return store.saveReview(input(rest[1]));
    case 'reviews': take(rest,0); store.profile(); return store.list('reviews').sort((a,b)=>a.date.localeCompare(b.date));
    case 'estimate': take(rest,0); return estimateRestingEnergy(store.profile());
    case 'menu': take(rest,1); return {days:menuTotals(input(rest[0])),formula:'Nutrient amount = edible grams / 100 × source nutrient per 100 g; sum ingredients, meals, then days.',limits:'Checks arithmetic only. Source values, raw/cooked state and allergen suitability require verification.'};
    case 'evidence': take(rest,0,1); validateRegistry(); return sources(rest[0]);
    case 'explain': {
      take(rest,1); const topics={formulas:'FORMULAS.md',measurements:'MEASUREMENTS.md',evidence:'EVIDENCE.md',coaching:'COACHING.md'};
      assert(topics[rest[0]],'Topic must be formulas, measurements, evidence, or coaching');
      return fs.readFileSync(path.join(REPO,'docs',topics[rest[0]]),'utf8');
    }
    case 'doctor': {
      take(rest,0); const report = store.doctor(); if (!report.ok) process.exitCode = 1; return report;
    }
    default: throw new Error(`Unknown command: ${command}. Run node fitness.mjs help.`);
  }
}
try {
  const result = main(process.argv.slice(2));
  process.stdout.write(typeof result === 'string' ? result + '\n' : JSON.stringify(result,null,2) + '\n');
} catch (error) {
  process.stderr.write(`fitness-ops: ${error.message}\n`); process.exitCode = 1;
}
