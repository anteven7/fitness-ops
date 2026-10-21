import { assert, object, string, number, date } from './validate.mjs';
import { sources } from './evidence.mjs';

const nutrients = ['kcal','protein_g','carbs_g','fat_g'];
const round = n => Math.round(n * 100) / 100;
function array(value, name, min = 0) { assert(Array.isArray(value) && value.length >= min, `${name} must contain at least ${min} item(s)`); }
function texts(o, fields, label) { object(o,label); for (const field of fields) string(o[field], `${label}.${field}`); }
function sameStrings(a,b) { return Array.isArray(a) && Array.isArray(b) && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()); }

export function menuTotals(days) {
  array(days,'menu days',1);
  const labels = new Set();
  return days.map(day => {
    string(day.label,'day.label'); assert(!labels.has(day.label),'Menu day labels must be unique'); labels.add(day.label);
    array(day.meals,'meals',1);
    const meals = day.meals.map(meal => {
      string(meal.name,'meal.name'); array(meal.items,'meal.items',1);
      const total = Object.fromEntries(nutrients.map(key => [key,0]));
      for (const item of meal.items) {
        texts(item,['food','state','source_ref'],'food item');
        assert(['raw','cooked','drained','as-packaged'].includes(item.state),'Food state must be raw, cooked, drained, or as-packaged');
        number(item.amount_g,'amount_g',0.1,10000,false); object(item.per_100g,'per_100g');
        number(item.per_100g.kcal,'per_100g.kcal',0,1000,false);
        for (const key of nutrients.slice(1)) number(item.per_100g[key],`per_100g.${key}`,0,100,false);
        for (const key of nutrients) total[key] += item.amount_g / 100 * item.per_100g[key];
      }
      return {name:meal.name,unrounded:total,totals:Object.fromEntries(nutrients.map(key=>[key,round(total[key])]))};
    });
    const totals = Object.fromEntries(nutrients.map(key=>[key,round(meals.reduce((sum,m)=>sum+m.unrounded[key],0))]));
    return {label:day.label,meals:meals.map(({unrounded,...m})=>m),totals};
  });
}

export function auditPlan(plan, profile) {
  const issues=[]; const checks=[]; const computedMenus=[];
  const check=(name,fn)=>{try{fn();checks.push({name,passed:true});}catch(e){issues.push(`${name}: ${e.message}`);checks.push({name,passed:false});}};
  const c=plan.coaching;
  check('Explanation package',()=>{
    object(c,'coaching'); date(c.microcycle_start_date,'microcycle_start_date');
    assert(c.microcycle_start_date>=plan.start_date && c.microcycle_start_date<=plan.microcycle_end_date,'Authored microcycle dates must be inside the plan');
    for(const session of plan.sessions) assert(session.date>=c.microcycle_start_date,'A scheduled session precedes the authored microcycle');
    texts(c,['success_criteria','measurement_protocol','recovery_plan','stop_rules','review_triggers'],'coaching');
    array(c.explanations,'explanations',1);
  });
  const explanations = new Map();
  check('Recommendation evidence and uncertainty',()=>{
    array(c?.explanations,'explanations',1);
    for (const e of c.explanations) {
      texts(e,['id','topic','recommendation','why_for_user','basis','uncertainty','reassess_when'],'explanation');
      assert(!explanations.has(e.id),`Duplicate explanation ID: ${e.id}`); explanations.set(e.id,e);
      assert(['training','nutrition','recovery','measurement'].includes(e.topic),'Unknown explanation topic');
      assert(['research','guideline','heuristic','preference'].includes(e.basis),'basis must distinguish research, guideline, heuristic, or preference');
      array(e.source_ids,'source_ids');
      if (['research','guideline'].includes(e.basis)) assert(e.source_ids.length>0,'Research/guideline claims need source IDs');
      for (const ref of e.source_ids) { sources(ref); assert(plan.sources.includes(ref),`Source ${ref} must also be in plan.sources`); }
    }
    for (const ref of plan.sources) sources(ref);
    for (const topic of ['nutrition','recovery','measurement',...(plan.sessions.length?['training']:[])]) {
      const entries=[...explanations.values()].filter(e=>e.topic===topic);
      assert(entries.length,`Explain ${topic} recommendations`);
      assert(entries.some(e=>['research','guideline'].includes(e.basis)&&e.source_ids.length),`Include applicable research/guidance for ${topic}, with exact practical choices separately labelled`);
    }
    assert([...explanations.values()].some(e=>['research','guideline'].includes(e.basis)),'Include applicable research/guidance, not only preferences');
  });
  const refs=(ids,topic)=>{
    array(ids,'explanation_ids',1);
    for(const ref of ids) assert(explanations.get(ref)?.topic===topic,`Missing ${topic} explanation: ${ref}`);
  };
  check('Executable training and schedule fit',()=>{
    array(c?.training,'training');
    assert(c.training.length===plan.sessions.length,'Every scheduled session needs one structured prescription');
    const used=new Set();
    for(const session of c.training) {
      string(session.session_key,'session_key');
      assert(plan.sessions.some(s=>s.key===session.session_key)&&!used.has(session.session_key),'Missing or duplicate session prescription'); used.add(session.session_key);
      texts(session,['warmup','shortened_option'],'session');
      number(session.duration_min,'duration_min',1,300,false);
      assert(profile.training.minutes_per_session==null||session.duration_min<=profile.training.minutes_per_session,'Session exceeds available time');
      array(session.exercises,'exercises',1);
      for(const ex of session.exercises) {
        texts(ex,['name','load_guidance','technique','progression'],'exercise');
        number(ex.sets,'sets',1,20,false,true); number(ex.reps_min,'reps_min',1,100,false,true); number(ex.reps_max,'reps_max',ex.reps_min,100,false,true);
        number(ex.rir_min,'rir_min',0,10,false); number(ex.rir_max,'rir_max',ex.rir_min,10,false); number(ex.rest_seconds,'rest_seconds',0,900,false);
        array(ex.alternatives,'alternatives',1); ex.alternatives.forEach(a=>string(a,'alternative')); refs(ex.explanation_ids,'training');
      }
    }
    if(profile.training.days_per_week!=null) for(const session of plan.sessions) {
      const windowEnd=new Date(session.date+'T00:00:00Z'); windowEnd.setUTCDate(windowEnd.getUTCDate()+6);
      const end=windowEnd.toISOString().slice(0,10);
      const days=new Set(plan.sessions.filter(s=>s.date>=session.date&&s.date<=end).map(s=>s.date));
      assert(days.size<=profile.training.days_per_week,'Training frequency exceeds reported available days in a rolling week');
    }
  });
  check('Practical nutrition and restriction review',()=>{
    texts(c?.nutrition,['method_explanation','menu_md','groceries_md','substitutions_md','micronutrients_md','allergy_check_notes'],'nutrition');
    assert(sameStrings(c.nutrition.reviewed_allergies,profile.nutrition.allergies),'Allergy review must match the current profile');
    assert(sameStrings(c.nutrition.reviewed_exclusions,profile.nutrition.exclusions),'Exclusion review must match the current profile');
    refs(c.nutrition.explanation_ids,'nutrition');
    if(plan.nutrition.approach==='targets') {
      array(c.nutrition.menu_days,'menu_days',1);
      const totals=menuTotals(c.nutrition.menu_days); computedMenus.push(...totals);
      for (const day of totals) for (const key of nutrients) {
        const allowance=Math.max(key==='kcal'?50:5,plan.nutrition[key]*0.10);
        assert(Math.abs(day.totals[key]-plan.nutrition[key])<=allowance,`${day.label}: ${key} menu total ${day.totals[key]} does not match target ${plan.nutrition[key]} within the declared rounding/planning tolerance`);
      }
    }
  });
  return {ok:issues.length===0,issues,checks,computed_menus:computedMenus,
    scope:'Completeness, evidence-reference existence, schedule constraints and arithmetic. Source relevance, food labels/allergens, technique, clinical suitability and prose consistency still require substantive review. This is not a professional-equivalence score.'};
}
