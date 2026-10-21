import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store, REPO, read } from '../lib/store.mjs';
import { summarize, estimateRestingEnergy } from '../lib/summary.mjs';
import * as v from '../lib/validate.mjs';
import { coachingFixture } from '../test-support/fixtures.mjs';

const NOW = v.today('UTC');
const ago = n => v.shift(NOW, -n);
function fixture(t, complete = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-ops-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new Store(root); store.init();
  if (complete) {
    const p = store.profile();
    p.age = 30; p.goal.primary = 'Improve strength'; p.goal.metrics = ['Consistent sessions'];
    p.training = { experience: 'Beginner', days_per_week: 3, minutes_per_session: 45, equipment: ['Dumbbells'], current_routine: null, preferences: [] };
    p.nutrition.allergies = []; p.nutrition.exclusions = [];
    p.safety = { screened_on: NOW, current_symptoms: [], restrictions: [], needs_professional_guidance: false, energy_restriction_appropriate: true, notes: null };
    p.provenance = { test: 'Fictional data used only in isolated tests' };
    store.importProfile(p);
  }
  return store;
}
function plan(id = 'block-1', extra = {}) {
  const result = { schema_version: 1, id, title: 'Fictional test plan', parent_id: null,
    start_date: ago(13), end_date: v.shift(NOW,28), review_date: NOW, microcycle_end_date: v.shift(NOW,6),
    goal: 'Practice consistency', rationale: 'Fictional test data',
    blocks: [{ name: 'Foundation', start_date: ago(13), end_date: v.shift(NOW,28), focus: 'Consistent practice' }],
    sessions: [{ date: ago(2), key: 'a', title: 'Session A' }, { date: NOW, key: 'b', title: 'Session B' }],
    nutrition: { approach: 'habits', energy_strategy: 'unspecified', kcal: null, protein_g: null, carbs_g: null, fat_g: null },
    sources: ['ACSM-2026','WHO-DIET','AASM-SLEEP','WHO-STEPS'], body_md: 'Fictional detailed plan for structural tests only.', ...extra };
  result.coaching = coachingFixture(result);
  return result;
}
const measurement = (id, date = NOW, weight = 80) => ({ id, date, weight_kg: weight });
const workout = (id, extra = {}) => ({ id, date: NOW, status: 'completed', exercises: [{ name: 'Goblet squat', sets: [{ reps: 8, load_kg: 16, rir: 3 }] }], ...extra });

test('init is idempotent and preserves edited user preferences and timezone', t => {
  const s = fixture(t,false); const p = s.profile(); p.name = 'Example'; p.timezone = 'Europe/Madrid'; s.importProfile(p);
  fs.writeFileSync(s.file('preferences.md'),'Keep this'); s.init('UTC');
  assert.equal(s.profile().name,'Example'); assert.equal(s.profile().timezone,'Europe/Madrid');
  assert.equal(fs.readFileSync(s.file('preferences.md'),'utf8'),'Keep this');
});
test('profile versions persist and stale edits cannot clobber new facts', t => {
  const s = fixture(t,false); const first = s.profile(); const edit = structuredClone(first); edit.name='Example'; s.importProfile(edit);
  first.height_cm=180; assert.throws(()=>s.importProfile(first),/Stale/);
  assert.equal(read(s.file('profile-history','1.json')).name,null);
  assert.equal(s.profile().revision,2);
});
test('reject invalid profile units, fields, dates and timezone', t => {
  const s=fixture(t,false);
  for (const mutate of [p=>p.weight_kg='80',p=>p.training.days_per_week=8,p=>p.timezone='Mars/Nowhere',p=>p.unrecognized=1,p=>p.goal.deadline='2026-02-30',p=>p.safety.screened_on=v.shift(NOW,1)]) {
    const p=s.profile(); mutate(p); assert.throws(()=>s.importProfile(p));
  }
});
test('unknown profile facts stay unknown and prevent personalized activation', t=>{
  const s=fixture(t,false); s.savePlan(plan());
  assert.throws(()=>s.activate('block-1'),/prerequisites/); assert.equal(s.active(),null);
  assert.ok(s.status().planning_issues.length>=5);
});
test('initialization validates timezone before writing a profile', t=>{
  const s=fixture(t,false); const root=s.file('bad'); const second=new Store(root);
  assert.throws(()=>second.init('Wrong/Zone'),/timezone/); assert.equal(second.initialized(),false);
});
test('date handling rejects rollover and preserves local calendar day',()=>{
  assert.throws(()=>v.date('2025-02-29')); v.date('2024-02-29');
  assert.equal(v.today('Europe/Madrid',new Date('2026-10-21T23:30:00Z')),'2026-10-22');
  assert.equal(v.shift('2024-03-01',-1),'2024-02-29');
});
test('logs reject invalid dates, units, future entries and path traversal',t=>{
  const s=fixture(t);
  for(const record of [measurement('../outside'),measurement('future',v.shift(NOW,1)),measurement('bad-date','2026-02-30'),measurement('bad-units',NOW,'180 lb'),measurement('empty',NOW,null)]) assert.throws(()=>s.saveLog('measurement',record));
  assert.equal(s.logs('measurement').length,0);
});
test('same stable ID is idempotent and changed content is rejected',t=>{
  const s=fixture(t); const first=s.saveLog('measurement',measurement('m1'));
  assert.deepEqual(s.saveLog('measurement',measurement('m1')),first);
  assert.throws(()=>s.saveLog('measurement',measurement('m1',NOW,81)),/different content/);
  assert.equal(s.logs('measurement',true).length,1);
});
test('corrections preserve raw history and forbid branches and cross-date replacement',t=>{
  const s=fixture(t); s.saveLog('measurement',measurement('m1'));
  s.saveLog('measurement',{...measurement('m2',NOW,81),supersedes:'m1'});
  assert.equal(s.logs('measurement').length,1); assert.equal(s.logs('measurement')[0].weight_kg,81);
  assert.equal(s.logs('measurement',true).length,2);
  assert.throws(()=>s.saveLog('measurement',{...measurement('m3',NOW,82),supersedes:'m1'}),/active record/);
  assert.throws(()=>s.saveLog('measurement',{...measurement('m4',ago(1),82),supersedes:'m2'}),/same kind and date/);
  assert.throws(()=>s.saveLog('measurement',measurement('m5')),/daily record/);
});
test('partial meals never masquerade as full days or double count a full-day total',t=>{
  const s=fixture(t);
  s.saveLog('nutrition',{id:'breakfast',date:NOW,complete_day:false,kcal:500});
  s.saveLog('nutrition',{id:'day',date:NOW,complete_day:true,kcal:2200,protein_g:140});
  s.saveLog('nutrition',{id:'yesterday',date:ago(1),complete_day:true,kcal:2400});
  const n=summarize(s,NOW).current.nutrition;
  assert.equal(n.kcal.mean,2300); assert.equal(n.protein_g.observations,1); assert.equal(n.partial_entries,1);
  assert.throws(()=>s.saveLog('nutrition',{id:'extra',date:NOW,complete_day:true,kcal:1000}),/daily record/);
});
test('summary windows have exact boundaries and do not leak later or old data',t=>{
  const s=fixture(t);
  for (let i=0;i<21;i++) s.saveLog('measurement',measurement(`m-${i}`,ago(i),i<7?80:i<14?81:99));
  const r=summarize(s,NOW);
  assert.equal(r.current.weight_kg.mean,80); assert.equal(r.previous.weight_kg.mean,81);
  assert.equal(r.weight_trend.delta_kg,-1); assert.equal(r.current.weight_kg.observations,7);
  assert.equal(summarize(s,ago(7)).current.weight_kg.mean,81);
  assert.throws(()=>summarize(s,v.shift(NOW,1)),/future/);
});
test('sparse and absent data produce unknown trend rather than a false plateau',t=>{
  const s=fixture(t); let r=summarize(s,NOW);
  assert.equal(r.current.weight_kg.mean,null); assert.equal(r.weight_trend.delta_kg,null);
  s.saveLog('measurement',measurement('a')); s.saveLog('measurement',measurement('b',ago(7)));
  r=summarize(s,NOW); assert.equal(r.weight_trend.adequate_coverage,false); assert.equal(r.weight_trend.delta_kg,null);
});
test('explicit zero observations remain observations rather than disappearing',t=>{
  const s=fixture(t); s.saveLog('recovery',{id:'r',date:NOW,pain:0,sleep_hours:0});
  const r=summarize(s,NOW); assert.equal(r.current.recovery.pain.mean,0); assert.equal(r.current.recovery.sleep_hours.observations,1);
});
test('workout status, unit ranges and references are enforced',t=>{
  const s=fixture(t); s.savePlan(plan());
  assert.throws(()=>s.saveLog('workout',workout('bad',{status:'skipped'})),/Skipped/);
  assert.throws(()=>s.saveLog('workout',workout('bad-ref',{plan_id:'block-1',session_key:'missing'})),/does not exist/);
  const w=workout('bad-reps'); w.exercises[0].sets[0].reps=-1; assert.throws(()=>s.saveLog('workout',w),/reps/);
  s.saveLog('workout',workout('valid',{plan_id:'block-1',session_key:'b'}));
  assert.throws(()=>s.saveLog('workout',workout('duplicate',{plan_id:'block-1',session_key:'b'})),/already has an outcome/);
});
test('scheduled unlogged sessions are distinct from explicitly skipped sessions',t=>{
  const s=fixture(t); s.savePlan(plan()); s.activate('block-1');
  s.saveLog('workout',{id:'skip',date:ago(2),status:'skipped',exercises:[],plan_id:'block-1',session_key:'a'});
  const r=summarize(s,NOW); assert.equal(r.schedule.explicitly_skipped,1); assert.equal(r.schedule.unlogged,1); assert.equal(r.schedule.completed,0);
});
test('unchanged session outcomes carry across plan revisions',t=>{
  const s=fixture(t); s.savePlan(plan()); s.activate('block-1');
  s.saveLog('workout',workout('done',{date:ago(2),plan_id:'block-1',session_key:'a'}));
  s.savePlan(plan('block-2',{parent_id:'block-1'})); s.activate('block-2');
  assert.equal(summarize(s,NOW).schedule.completed,1);
  s.savePlan(plan('block-3',{parent_id:'block-2',sessions:[{date:ago(1),key:'a',title:'Rescheduled'}]})); s.activate('block-3');
  assert.equal(summarize(s,NOW).schedule.completed,0);
});
test('block coverage, ordered dates, session bounds and unique IDs are validated',t=>{
  const s=fixture(t);
  for(const mutate of [p=>p.blocks[0].start_date=ago(12),p=>p.blocks[0].end_date=NOW,p=>p.sessions.push({...p.sessions[0]}),p=>p.sessions[0].date=v.shift(NOW,20),p=>p.review_date=ago(20),p=>p.id='../escape']) {
    const p=plan(); mutate(p); assert.throws(()=>s.savePlan(p));
  }
});
test('target macros reconcile and habit plans do not sneak in numbers',t=>{
  const s=fixture(t);
  const n={approach:'targets',energy_strategy:'maintenance',kcal:2400,protein_g:150,carbs_g:285,fat_g:73};
  s.savePlan(plan('valid',{nutrition:n}));
  assert.throws(()=>s.savePlan(plan('bad',{nutrition:{...n,kcal:1500}})),/Macro calories/);
  assert.throws(()=>s.savePlan(plan('bad-habit',{nutrition:{...n,approach:'habits'}})),/keep numerical targets null/);
});
test('deficit activation fails with inappropriate restriction or professional-guidance need',t=>{
  const s=fixture(t); const p=s.profile(); p.safety.energy_restriction_appropriate=false; s.importProfile(p);
  const base=plan(); base.nutrition.energy_strategy='deficit'; s.savePlan(base);
  assert.throws(()=>s.activate('block-1'),/autonomous deficit/);
  p.revision=s.profile().revision; p.safety.energy_restriction_appropriate=true; p.safety.needs_professional_guidance=true; p.safety.notes='Professional review still needed'; s.importProfile(p);
  s.savePlan({...base,id:'block-2'}); assert.throws(()=>s.activate('block-2'),/autonomous deficit/);
});
test('minor and unresolved symptoms cannot activate a general adult program',t=>{
  const s=fixture(t); const p=s.profile(); p.age=16; s.importProfile(p); s.savePlan(plan());
  assert.throws(()=>s.activate('block-1'),/minors/);
  const adult=s.profile(); adult.age=30; adult.safety.current_symptoms=['Exertional chest pain']; s.importProfile(adult); s.savePlan(plan('new'));
  assert.throws(()=>s.activate('new'),/symptoms/);
});
test('profile changes require plan review before activation and appear in status',t=>{
  const s=fixture(t); s.savePlan(plan()); s.activate('block-1');
  const p=s.profile(); p.training.days_per_week=2; s.importProfile(p);
  assert.equal(s.status().profile_changed_since_plan,true);
  assert.throws(()=>s.activate('block-1'),/Profile changed/);
});
test('plan versions are immutable and parent links must exist',t=>{
  const s=fixture(t); const p=s.savePlan(plan()); assert.deepEqual(s.savePlan(plan()),p);
  assert.throws(()=>s.savePlan(plan('block-1',{title:'Different'})),/already exists/);
  assert.throws(()=>s.savePlan(plan('orphan',{parent_id:'nonexistent'})));
});
test('review updates due date without changing the active program',t=>{
  const s=fixture(t); s.savePlan(plan()); s.activate('block-1'); assert.equal(s.status().review_due,true);
  const review={id:'weekly',plan_id:'block-1',date:NOW,window_start:ago(6),next_review_date:v.shift(NOW,7),decision:'continue',confidence:'low',observations:['Sparse data'],changes:[],body_md:'Continue and collect observations.'};
  s.saveReview(review); assert.equal(s.status().review_due,false); assert.equal(s.status().next_review,v.shift(NOW,7)); assert.equal(s.active().plan_id,'block-1');
  assert.throws(()=>s.saveReview({...review,id:'bad',date:v.shift(NOW,1)}),/future/);
  assert.throws(()=>s.saveReview({...review,id:'bad-order',next_review_date:NOW}),/order/);
  assert.deepEqual(s.saveReview(review),s.list('reviews')[0]);
});
test('old review cannot postpone the review of a newly activated revision',t=>{
  const s=fixture(t); s.savePlan(plan());
  s.saveReview({id:'r',plan_id:'block-1',date:NOW,window_start:ago(6),next_review_date:v.shift(NOW,7),decision:'revise',confidence:'moderate',observations:[],changes:['New block'],body_md:'Revision'});
  s.savePlan(plan('block-2',{parent_id:'block-1'})); s.activate('block-2'); assert.equal(s.status().next_review,NOW);
});
test('doctor detects malformed JSON and missing references without a false pass',t=>{
  const s=fixture(t); assert.equal(s.doctor().ok,true); s.savePlan(plan());
  fs.writeFileSync(s.file('logs','measurement','bad.json'),'{broken'); assert.equal(s.doctor().ok,false);
  fs.unlinkSync(s.file('logs','measurement','bad.json'));
  const p=read(s.file('plans','block-1.json')); p.parent_id='missing'; fs.writeFileSync(s.file('plans','block-1.json'),JSON.stringify(p)); assert.equal(s.doctor().ok,false);
});
test('doctor detects correction cycles instead of losing the records silently',t=>{
  const s=fixture(t); s.saveLog('measurement',measurement('a')); s.saveLog('measurement',{...measurement('b'),supersedes:'a'});
  const a=read(s.file('logs','measurement','a.json')); a.supersedes='b'; fs.writeFileSync(s.file('logs','measurement','a.json'),JSON.stringify(a));
  assert.match(s.doctor().errors.join(' '),/cycle/);
});
test('write lock prevents concurrent modifications and is released after errors',t=>{
  const s=fixture(t); fs.mkdirSync(s.file('.write-lock'));
  assert.throws(()=>s.saveLog('measurement',measurement('x')),/Another write/); fs.rmdirSync(s.file('.write-lock'));
  assert.throws(()=>s.saveLog('measurement',measurement('x',NOW,-1))); assert.equal(fs.existsSync(s.file('.write-lock')),false);
  s.saveLog('measurement',measurement('x'));
});
test('resting energy uses requested coefficients and never implies maintenance',t=>{
  const s=fixture(t); const p=s.profile(); p.weight_kg=80; p.height_cm=180; p.age=30;
  const result=estimateRestingEnergy(p); assert.deepEqual(result.estimate_kcal_per_day,{male:1780,female:1614});
  p.energy_equation='male'; assert.equal(estimateRestingEnergy(p).estimate_kcal_per_day,1780);
  p.age=17; assert.throws(()=>estimateRestingEnergy(p),/adult/);
});
test('CLI works from another directory, rejects errors, and keeps data beside its repo',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fitness-cli-test-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const repo=path.join(root,'copy'); fs.mkdirSync(repo);
  for(const name of ['fitness.mjs','lib','templates','package.json','evidence','docs']) fs.cpSync(path.join(REPO,name),path.join(repo,name),{recursive:true});
  const cli=(...args)=>spawnSync(process.execPath,[path.join(repo,'fitness.mjs'),...args],{cwd:root,encoding:'utf8'});
  assert.equal(cli('init','Europe/Madrid').status,0);
  assert.equal(JSON.parse(cli('status').stdout).initialized,true);
  assert.equal(fs.existsSync(path.join(repo,'private','profile.json')),true);
  assert.equal(fs.existsSync(path.join(root,'private')),false);
  assert.equal(cli('doctor').status,0); assert.equal(cli('summary').status,0);
  assert.equal(cli('unknown').status,1); assert.equal(cli('log','measurement').status,1);
  assert.equal(cli('plan','show').status,1); assert.equal(cli('profile','import','missing.json').status,1);
  assert.match(cli('--help').stdout,/No background process/);
  assert.equal(cli('explain','formulas').status,0); assert.match(cli('explain','formulas').stdout,/worked examples/);
  assert.equal(JSON.parse(cli('evidence','MIFFLIN').stdout).id,'MIFFLIN');
  assert.equal(cli('explain','../../outside').status,1); assert.equal(cli('evidence','invented').status,1);
  assert.equal(cli('plan','audit','missing').status,1);
  const menuPath=path.join(root,'menu.json');
  fs.writeFileSync(menuPath,JSON.stringify([{label:'Synthetic test',meals:[{name:'Test',items:[{food:'Synthetic fixture',amount_g:150,state:'raw',source_ref:'test only',per_100g:{kcal:100,protein_g:5,carbs_g:15,fat_g:2}}]}]}]));
  const menuResult=cli('menu',menuPath); assert.equal(menuResult.status,0); assert.equal(JSON.parse(menuResult.stdout).days[0].totals.kcal,150);
});

test('summary fails closed on structurally corrupted logs rather than using them as facts',t=>{
  const s=fixture(t); s.saveLog('measurement',measurement('a'));
  const a=read(s.file('logs','measurement','a.json')); a.weight_kg='80'; fs.writeFileSync(s.file('logs','measurement','a.json'),JSON.stringify(a));
  assert.throws(()=>summarize(s,NOW),/weight_kg/);
});
test('writers reject unsupported schema versions and stale saved plan metadata',t=>{
  const s=fixture(t);
  assert.throws(()=>s.saveLog('measurement',{...measurement('x'),schema_version:999}),/schema_version/);
  assert.throws(()=>s.savePlan({...plan(),schema_version:999}),/schema_version/);
  assert.throws(()=>s.saveReview({schema_version:999}),/schema_version/);
  const saved=s.savePlan(plan()); const p=s.profile(); p.name='Changed'; s.importProfile(p);
  assert.throws(()=>s.savePlan({...saved,id:'stale-new-version'}),/stale profile/);
});
