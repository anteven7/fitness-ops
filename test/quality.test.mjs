import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../lib/store.mjs';
import { auditPlan, menuTotals } from '../lib/quality.mjs';
import { sources, validateRegistry } from '../lib/evidence.mjs';
import { estimateRestingEnergy, summarize } from '../lib/summary.mjs';
import { today, shift } from '../lib/validate.mjs';
import { coachingFixture } from '../test-support/fixtures.mjs';
const NOW=today('UTC');
function context(t) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fitness-quality-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=new Store(dir); store.init(); const p=store.profile();
 p.age=30; p.goal.primary='Strength and consistent practice'; p.training={experience:'Beginner',days_per_week:2,minutes_per_session:45,equipment:['Dumbbells'],current_routine:null,preferences:[]};
 p.nutrition.allergies=[]; p.nutrition.exclusions=[]; p.safety={screened_on:NOW,current_symptoms:[],restrictions:[],needs_professional_guidance:false,energy_restriction_appropriate:true,notes:null}; store.importProfile(p);
 const plan={schema_version:1,id:'cycle-1',profile_revision:store.profile().revision,title:'Synthetic acceptance scenario',parent_id:null,start_date:NOW,end_date:shift(NOW,27),microcycle_end_date:shift(NOW,6),review_date:shift(NOW,6),goal:'Consistent practice',rationale:'Synthetic case, not an actual plan',blocks:[{name:'Practice',start_date:NOW,end_date:shift(NOW,27),focus:'Consistency'}],sessions:[{key:'a',date:NOW,title:'Session A'},{key:'b',date:shift(NOW,3),title:'Session B'}],nutrition:{approach:'habits',energy_strategy:'unspecified',kcal:null,protein_g:null,carbs_g:null,fat_g:null},sources:['ACSM-2026','WHO-DIET','AASM-SLEEP','WHO-STEPS'],body_md:'Synthetic test payload; not individualized advice.'};
 plan.coaching=coachingFixture(plan); return {store,plan,p:store.profile()};
}
function menu() {
 // Synthetic numbers allow exact independent arithmetic assertions; these are not food composition claims.
 return [{label:'Synthetic arithmetic day',meals:[{name:'Test meal',items:[{food:'Synthetic fixture A',amount_g:150,state:'as-packaged',source_ref:'synthetic test only',per_100g:{kcal:200,protein_g:10,carbs_g:30,fat_g:4}},{food:'Synthetic fixture B',amount_g:50,state:'raw',source_ref:'synthetic test only',per_100g:{kcal:400,protein_g:20,carbs_g:20,fat_g:26}}]}]}];
}
test('evidence registry contains unique documented primary-source records',()=>{
 assert.equal(validateRegistry().ok,true); assert.equal(sources().length,14);
 assert.match(sources('ACSM-2026').url,/41843416/); assert.match(sources('MIFFLIN').population,/19–78/);
 assert.throws(()=>sources('INVENTED-PAPER'),/Unknown evidence/);
});
test('legacy structural-only plan can be inspected but cannot be activated',t=>{
 const {store,plan}=context(t); delete plan.coaching; store.savePlan(plan);
 assert.equal(store.getPlan('cycle-1').title,plan.title);
 assert.throws(()=>store.activate('cycle-1'),/quality checks incomplete/); assert.equal(store.active(),null);
});
test('complete explanation and prescription package can pass mechanical audit',t=>{
 const {store,plan,p}=context(t); const report=auditPlan(plan,p); assert.equal(report.ok,true,report.issues.join('\n'));
 store.savePlan(plan); store.activate(plan.id); assert.equal(store.status().active_plan_quality_issues.length,0);
 assert.match(report.scope,/not a professional-equivalence score/);
});
test('missing uncertainty and personal rationale block a plan audit',t=>{
 const {plan,p}=context(t);
 for(const field of ['uncertainty','why_for_user','reassess_when']) {
  const bad=structuredClone(plan); delete bad.coaching.explanations[0][field];
  assert.equal(auditPlan(bad,p).ok,false);
 }
});
test('research claims need resolvable sources and cannot use invented evidence IDs',t=>{
 const {plan,p}=context(t);
 let bad=structuredClone(plan); bad.coaching.explanations[0].source_ids=[]; assert.match(auditPlan(bad,p).issues.join(' '),/need source/);
 bad=structuredClone(plan); bad.coaching.explanations[0].source_ids=['INVENTED']; assert.match(auditPlan(bad,p).issues.join(' '),/Unknown evidence/);
 bad=structuredClone(plan); bad.sources=['WHO-DIET']; assert.match(auditPlan(bad,p).issues.join(' '),/also be in plan.sources/);
});
test('exercise advice must reference its actual training explanation',t=>{
 const {plan,p}=context(t); plan.coaching.training[0].exercises[0].explanation_ids=['nutrition-principle'];
 assert.match(auditPlan(plan,p).issues.join(' '),/Missing training explanation/);
});
test('prescriptions need load selection, technique, progression and alternatives',t=>{
 const {plan,p}=context(t);
 for(const field of ['load_guidance','technique','progression','alternatives']) {
  const bad=structuredClone(plan); delete bad.coaching.training[0].exercises[0][field]; assert.equal(auditPlan(bad,p).ok,false,field);
 }
});
test('schedule and prescription must match one-to-one',t=>{
 const {plan,p}=context(t); plan.coaching.training.pop(); assert.match(auditPlan(plan,p).issues.join(' '),/Every scheduled session/);
});
test('prescription rejects contradictory rep and effort ranges',t=>{
 const {plan,p}=context(t);
 let bad=structuredClone(plan); bad.coaching.training[0].exercises[0].reps_max=5; assert.equal(auditPlan(bad,p).ok,false);
 bad=structuredClone(plan); bad.coaching.training[0].exercises[0].rir_max=1; assert.equal(auditPlan(bad,p).ok,false);
});
test('plans that exceed the actual time or weekly availability fail',t=>{
 const {plan,p}=context(t); const bad=structuredClone(plan); bad.coaching.training[0].duration_min=90;
 assert.match(auditPlan(bad,p).issues.join(' '),/available time/);
 p.training.days_per_week=1; assert.match(auditPlan(plan,p).issues.join(' '),/available days/);
});
test('reported allergies and exclusions must be explicitly reviewed after profile changes',t=>{
 const {plan,p}=context(t); p.nutrition.allergies=['peanut']; assert.match(auditPlan(plan,p).issues.join(' '),/Allergy review/);
 plan.coaching.nutrition.reviewed_allergies=['peanut']; p.nutrition.exclusions=['pork']; assert.match(auditPlan(plan,p).issues.join(' '),/Exclusion review/);
});
test('calculated ingredient, meal and day totals use portion mass exactly',()=>{
 const d=menuTotals(menu())[0]; assert.deepEqual(d.totals,{kcal:500,protein_g:25,carbs_g:55,fat_g:19});
 assert.deepEqual(d.meals[0].totals,d.totals);
});
test('menu calculator requires units/state/source and rejects negative or missing nutrients',()=>{
 for(const mutate of [x=>x.amount_g=-1,x=>x.amount_g='150',x=>delete x.source_ref,x=>x.state='unknown',x=>delete x.per_100g.protein_g,x=>x.per_100g.fat_g=101]) {
  const days=menu(); mutate(days[0].meals[0].items[0]); assert.throws(()=>menuTotals(days));
 }
});
test('menu calculator sums before rounding and rejects duplicate days',()=>{
 const days=menu(); days[0].meals[0].items=[1,2,3].map(i=>({food:`Synthetic ${i}`,amount_g:1,state:'raw',source_ref:'test',per_100g:{kcal:0.4,protein_g:0,carbs_g:0,fat_g:0}}));
 assert.equal(menuTotals(days)[0].totals.kcal,0.01);
 days.push(structuredClone(days[0])); assert.throws(()=>menuTotals(days),/unique/);
});
test('numeric plans require real calculated menu coverage, not typed claimed totals',t=>{
 const {plan,p}=context(t); plan.nutrition={approach:'targets',energy_strategy:'maintenance',kcal:2500,protein_g:125,carbs_g:275,fat_g:95};
 let report=auditPlan(plan,p); assert.equal(report.ok,false);
 plan.coaching.nutrition.menu_days=menu(); report=auditPlan(plan,p); assert.match(report.issues.join(' '),/does not match target/);
 const scaled=menu(); for(const item of scaled[0].meals[0].items) item.amount_g*=5;
 plan.coaching.nutrition.menu_days=scaled; report=auditPlan(plan,p); assert.equal(report.ok,true,report.issues.join(' '));
 assert.equal(report.computed_menus[0].totals.kcal,2500);
});
test('habits path remains usable without weight, energy equations or nutrient totals',t=>{
 const {store,plan,p}=context(t); assert.equal(p.weight_kg,null); assert.equal(p.height_cm,null);
 assert.equal(auditPlan(plan,p).ok,true); store.savePlan(plan); store.activate(plan.id);
});
test('formula output explains every input, coefficient, source and calculation term',t=>{
 const {p}=context(t); p.weight_kg=80;p.height_cm=180;p.age=30;
 const result=estimateRestingEnergy(p); assert.equal(result.calculation.base_before_coefficient,1775);
 assert.deepEqual(result.estimate_kcal_per_day,{male:1780,female:1614}); assert.match(result.source,/2305711/);
 assert.match(result.population,/498/); assert.match(result.note,/not maintenance/);
});
test('formula flags unstudied age and refuses bad arithmetic inputs',t=>{
 const {p}=context(t); p.weight_kg=80;p.height_cm=180;p.age=90;
 assert.match(estimateRestingEnergy(p).limitations.join(' '),/outside the original/);
 p.energy_equation='guessed'; assert.throws(()=>estimateRestingEnergy(p),/Unknown/);
 p.energy_equation=null;p.weight_kg='80'; assert.throws(()=>estimateRestingEnergy(p),/weight_kg/);
 p.weight_kg=10;p.height_cm=50;p.age=120; assert.throws(()=>estimateRestingEnergy(p),/nonpositive/);
});
test('summary exposes worst reported pain and measurement limitations instead of only averages',t=>{
 const {store}=context(t); store.saveLog('recovery',{id:'r1',date:NOW,pain:8}); store.saveLog('recovery',{id:'r2',date:shift(NOW,-1),pain:0});
 const result=summarize(store,NOW); assert.equal(result.current.recovery.pain.mean,4); assert.equal(result.current.recovery.pain.maximum,8);
 assert.match(result.explanation.recovery,/not interpret a mean as a diagnosis/);
});
test('a revised plan must preserve explanations and cannot activate after deleting them',t=>{
 const {store,plan}=context(t); store.savePlan(plan); store.activate(plan.id);
 const revision={...plan,id:'cycle-2',parent_id:plan.id}; delete revision.coaching; store.savePlan(revision);
 assert.throws(()=>store.activate(revision.id),/quality checks incomplete/); assert.equal(store.active().plan_id,'cycle-1');
});

test('a source-supported nutrition entry cannot stand in for a missing training evidence basis',t=>{
 const {plan,p}=context(t); const e=plan.coaching.explanations.find(x=>x.id==='training-principle');e.basis='heuristic';e.source_ids=[];
 assert.match(auditPlan(plan,p).issues.join(' '),/guidance for training/);
});
