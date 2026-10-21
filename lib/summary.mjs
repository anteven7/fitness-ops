import { date, shift, today, assert, number } from './validate.mjs';

const mean = values => values.length ? Math.round(values.reduce((a,b) => a+b, 0) / values.length * 100) / 100 : null;
const values = (records, key) => records.map(r => r[key]).filter(v => v != null);
const average = (records, key) => {
  const observed=values(records,key);
  return { mean:mean(observed), observations:observed.length, minimum:observed.length?Math.min(...observed):null, maximum:observed.length?Math.max(...observed):null };
};
const inside = (r, start, end) => r.date >= start && r.date <= end;
function week(store, start, end) {
  const logs = Object.fromEntries(['workout','nutrition','recovery','measurement'].map(kind => [kind, store.logs(kind).filter(r => inside(r,start,end))]));
  const nutritionDays = logs.nutrition.filter(r => r.complete_day);
  const performed = logs.workout.filter(r => r.status !== 'skipped');
  const exerciseMap = new Map();
  for (const workout of performed) for (const exercise of workout.exercises) {
    if (!exerciseMap.has(exercise.name)) exerciseMap.set(exercise.name, []);
    exerciseMap.get(exercise.name).push({ date: workout.date, log_id: workout.id, sets: exercise.sets, notes: exercise.notes ?? null });
  }
  return {
    start, end,
    workouts: {
      completed: logs.workout.filter(r => r.status === 'completed').length,
      partial: logs.workout.filter(r => r.status === 'partial').length,
      explicitly_skipped: logs.workout.filter(r => r.status === 'skipped').length,
      logged_minutes: performed.reduce((sum,r) => sum + (r.duration_min ?? 0), 0),
      sessions_with_duration: performed.filter(r => r.duration_min != null).length,
      exercises: [...exerciseMap].map(([name, observations]) => ({ name, observations })),
    },
    weight_kg: average(logs.measurement, 'weight_kg'),
    waist_cm: average(logs.measurement, 'waist_cm'),
    nutrition: { complete_days: nutritionDays.length, partial_entries: logs.nutrition.length - nutritionDays.length,
      kcal: average(nutritionDays,'kcal'), protein_g: average(nutritionDays,'protein_g'), carbs_g: average(nutritionDays,'carbs_g'), fat_g: average(nutritionDays,'fat_g') },
    recovery: Object.fromEntries(['sleep_hours','energy','stress','soreness','pain'].map(key => [key, average(logs.recovery,key)])),
  };
}
export function summarize(store, onDate) {
  const profile = store.profile(); const end = onDate ?? today(profile.timezone); date(end);
  assert(end <= today(profile.timezone), 'Summary date cannot be in the future');
  const current = week(store, shift(end, -6), end);
  const previous = week(store, shift(end, -13), shift(end, -7));
  const adequate = current.weight_kg.observations >= 4 && previous.weight_kg.observations >= 4;
  const weight = { adequate_coverage: adequate, minimum_observations_per_week: 4,
    delta_kg: adequate ? Math.round((current.weight_kg.mean - previous.weight_kg.mean) * 100) / 100 : null,
    interpretation: adequate ? 'Descriptive difference between two weekly means; assess confounders and longer trends before changing targets.' : 'Insufficient comparable coverage for a weight trend; missing measurements are not stability.' };
  const active = store.active(); let schedule = null;
  if (active) {
    const plans = [active.plan]; const visited = new Set([active.plan.id]);
    while (plans.at(-1).parent_id) {
      const parent = store.getPlan(plans.at(-1).parent_id);
      assert(!visited.has(parent.id), 'Plan ancestry cycle'); visited.add(parent.id); plans.push(parent);
    }
    const logs = store.logs('workout').filter(r => r.date <= end);
    const outcomes = active.plan.sessions.filter(s => inside(s, current.start, end)).map(session => {
      // Carry completion across revisions only for a stable key and unchanged scheduled date.
      const references = plans.filter(p => p.sessions.some(s => s.key === session.key && s.date === session.date)).map(p => p.id);
      const matches = logs.filter(r => r.session_key === session.key && references.includes(r.plan_id));
      const outcome = matches.sort((a,b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))[0];
      return { ...session, outcome: outcome?.status ?? 'unlogged', log_id: outcome?.id ?? null, performed_date: outcome?.date ?? null };
    });
    schedule = { plan_id: active.plan_id, scope: 'Current active schedule only; prior versions are used to carry matching session outcomes, not reconstruct past schedules.',
      due_sessions: outcomes.length, completed: outcomes.filter(s => s.outcome === 'completed').length,
      partial: outcomes.filter(s => s.outcome === 'partial').length, explicitly_skipped: outcomes.filter(s => s.outcome === 'skipped').length,
      unlogged: outcomes.filter(s => s.outcome === 'unlogged').length, outcomes };
  }
  const prompts = [];
  if (!adequate) prompts.push('Do not infer a weight plateau from incomplete measurements. Weight tracking is optional.');
  if (current.nutrition.complete_days < 4) prompts.push('Nutrition coverage is limited; partial meal entries are excluded from daily averages.');
  if (current.recovery.pain.mean > 0) prompts.push('Pain was reported: inspect its context before progression; an average is not a severity assessment.');
  if (schedule?.unlogged) prompts.push('Some scheduled sessions have no recorded outcome; ask before labelling them skipped.');
  if (store.status(end).profile_changed_since_plan) prompts.push('The profile changed after plan creation; check whether the active plan still fits.');
  return { as_of: end, timezone: profile.timezone, current, previous, weight_trend: weight, schedule, review_prompts: prompts,
    explanation: {windows:'Current = as_of minus 6 days through as_of; previous = as_of minus 13 through minus 7, inclusive.',
      averages:'Sum of reported values divided by their observation count, rounded to 2 decimals. Missing values are excluded, not zero.',
      weight_delta:'Current seven-day mean minus previous seven-day mean. This is a descriptive comparison, not a measured change in body fat or a guaranteed kg/week rate.',
      coverage:'Four days per window is a product heuristic. It does not require the user to weigh frequently or establish scientific confidence.',
      recovery:'Subjective ordinal ratings summarized descriptively; do not interpret a mean as a diagnosis.',
      guide:'docs/MEASUREMENTS.md'},
    automatic_prescription_changes: false };
}
export function estimateRestingEnergy(profile) {
  assert(profile.age != null && profile.age >= 18, 'Resting-energy estimate requires an adult age');
  assert(profile.weight_kg != null && profile.height_cm != null, 'Resting-energy estimate requires weight_kg and height_cm');
  number(profile.age,'age',18,120,false,true); number(profile.weight_kg,'weight_kg',10,500,false); number(profile.height_cm,'height_cm',50,260,false);
  assert(profile.energy_equation==null||['male','female'].includes(profile.energy_equation),'Unknown energy equation coefficient');
  const base = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
  const both = { male: Math.round(base + 5), female: Math.round(base - 161) };
  assert(both.male>0&&both.female>0,'Inputs produce nonpositive resting energy; check the inputs and equation applicability');
  const limitations=['Prediction for resting energy, not measurement by indirect calorimetry.','No maintenance/activity factor, food target, deficit, or expected weight-change rate is calculated.','Equation coefficients do not encode all body-composition, hormonal, or clinical contexts.'];
  if(profile.age<19||profile.age>78) limitations.push('Age is outside the original derivation sample (19–78 years); applicability is uncertain.');
  if(profile.safety?.needs_professional_guidance) limitations.push('Professional guidance is recorded as needed. This arithmetic must not be used alone to prescribe intake.');
  return { method: 'Mifflin–St Jeor (1990)', source: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    formula:'REE = 10 × mass_kg + 6.25 × height_cm − 5 × age_years + coefficient',
    inputs:{weight_kg:profile.weight_kg,height_cm:profile.height_cm,age_years:profile.age},
    calculation:{mass_term:10*profile.weight_kg,height_term:6.25*profile.height_cm,age_term:-5*profile.age,base_before_coefficient:base,coefficients:{male:5,female:-161},rounding:'Nearest whole kcal/day; arithmetic precision does not imply biological accuracy.'},
    population:'Derived in 498 healthy adults aged 19–78, including normal-weight and obese participants.',
    limitations,
    estimate_kcal_per_day: profile.energy_equation ? both[profile.energy_equation] : both,
    selected_coefficient: profile.energy_equation,
    note: 'Resting energy only, not maintenance or an intake target. Two outputs are equation alternatives, not a confidence interval. No activity factor or deficit has been applied.' };
}
