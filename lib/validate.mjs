export const kinds = ['workout', 'nutrition', 'measurement', 'recovery'];
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function object(value, name) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${name} must be an object`);
}
function keys(value, allowed, name) {
  object(value, name);
  for (const key of Object.keys(value)) assert(allowed.includes(key), `Unknown ${name} field: ${key}`);
}
export function string(value, name, optional = false) {
  if (optional && value == null) return;
  assert(typeof value === 'string' && value.trim().length > 0, `${name} must be nonempty text`);
}
function text(value, name) { assert(typeof value === 'string', `${name} must be text`); }
export function number(value, name, min, max, optional = true, integer = false) {
  if (optional && value == null) return;
  assert(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)), `${name} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}`);
}
function boolean(value, name, optional = false) {
  if (optional && value == null) return;
  assert(typeof value === 'boolean', `${name} must be true or false`);
}
function choice(value, values, name, optional = false) {
  if (optional && value == null) return;
  assert(values.includes(value), `${name} must be one of: ${values.join(', ')}`);
}
function strings(value, name, optional = false) {
  if (optional && value == null) return;
  assert(Array.isArray(value), `${name} must be an array`);
  for (const item of value) string(item, name);
}
export function id(value) {
  assert(typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value), 'IDs must use 1–80 lowercase letters, digits, hyphens, or underscores');
}
export function date(value, name = 'date') {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${name} must be YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, `${name} is not a real calendar date`);
}
function version(value) { assert(value.schema_version === 1, 'Unsupported schema_version; expected 1'); }
export function today(timezone = 'UTC', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key).value).join('-');
}
export function shift(day, amount) {
  date(day);
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function profile(p) {
  keys(p, ['schema_version','revision','name','language','timezone','display_units','age','height_cm','weight_kg','energy_equation','goal','training','nutrition','recovery','safety','provenance'], 'profile');
  version(p); number(p.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, false, true);
  string(p.name, 'name', true); string(p.language, 'language'); string(p.timezone, 'timezone');
  try { today(p.timezone); } catch { throw new Error('timezone must be a valid IANA timezone, for example Europe/Madrid'); }
  choice(p.display_units, ['metric', 'imperial'], 'display_units');
  number(p.age, 'age', 0, 120, true, true); number(p.height_cm, 'height_cm', 50, 260); number(p.weight_kg, 'weight_kg', 10, 500);
  choice(p.energy_equation, ['male', 'female'], 'energy_equation', true);
  keys(p.goal, ['primary','reason','deadline','metrics'], 'goal');
  string(p.goal.primary, 'goal.primary', true); string(p.goal.reason, 'goal.reason', true);
  if (p.goal.deadline != null) date(p.goal.deadline, 'goal.deadline'); strings(p.goal.metrics, 'goal.metrics');
  keys(p.training, ['experience','days_per_week','minutes_per_session','equipment','current_routine','preferences'], 'training');
  for (const key of ['experience','current_routine']) string(p.training[key], `training.${key}`, true);
  number(p.training.days_per_week, 'training.days_per_week', 0, 7, true, true);
  number(p.training.minutes_per_session, 'training.minutes_per_session', 5, 300);
  strings(p.training.equipment, 'training.equipment', true); strings(p.training.preferences, 'training.preferences');
  keys(p.nutrition, ['approach','pattern','allergies','exclusions','likes','dislikes','budget','cooking'], 'nutrition');
  choice(p.nutrition.approach, ['habits','targets'], 'nutrition.approach');
  for (const key of ['pattern','budget','cooking']) string(p.nutrition[key], `nutrition.${key}`, true);
  for (const key of ['allergies','exclusions']) strings(p.nutrition[key], `nutrition.${key}`, true);
  for (const key of ['likes','dislikes']) strings(p.nutrition[key], `nutrition.${key}`);
  keys(p.recovery, ['sleep_hours','stress','other_activity'], 'recovery');
  number(p.recovery.sleep_hours, 'recovery.sleep_hours', 0, 24);
  for (const key of ['stress','other_activity']) string(p.recovery[key], `recovery.${key}`, true);
  keys(p.safety, ['screened_on','current_symptoms','restrictions','needs_professional_guidance','energy_restriction_appropriate','notes'], 'safety');
  if (p.safety.screened_on != null) { date(p.safety.screened_on, 'safety.screened_on'); assert(p.safety.screened_on <= today(p.timezone), 'Safety screening cannot be future-dated'); }
  for (const key of ['current_symptoms','restrictions']) strings(p.safety[key], `safety.${key}`, true);
  for (const key of ['needs_professional_guidance','energy_restriction_appropriate']) boolean(p.safety[key], `safety.${key}`, true);
  string(p.safety.notes, 'safety.notes', true); object(p.provenance, 'provenance');
  for (const note of Object.values(p.provenance)) string(note, 'provenance entry');
  return p;
}
export function planningIssues(p) {
  const issues = [];
  if (p.age == null) issues.push('Establish adult status/age before personalized planning');
  else if (p.age < 18) issues.push('Adult planning toolkit: use age-appropriate professional guidance for minors');
  if (!p.goal.primary) issues.push('Set the primary objective');
  if (!p.training.experience) issues.push('Record training experience');
  if (p.training.days_per_week == null || (p.training.days_per_week > 0 && p.training.minutes_per_session == null)) issues.push('Record available training days and session length');
  if (p.training.equipment == null) issues.push('Record available equipment (empty array means none)');
  if (p.nutrition.allergies == null || p.nutrition.exclusions == null) issues.push('Check food allergies and exclusions');
  if (!p.safety.screened_on || p.safety.current_symptoms == null || p.safety.restrictions == null || p.safety.needs_professional_guidance == null) issues.push('Complete relevant health/constraint screening');
  if (p.safety.current_symptoms?.length) issues.push('Resolve current concerning symptoms with appropriate assessment before activating a new program');
  if (p.safety.needs_professional_guidance && !p.safety.notes) issues.push('Document applicable professional guidance and limits');
  return issues;
}
export function log(kind, r, localToday) {
  assert(kinds.includes(kind), `Unknown log kind: ${kind}`);
  const fields = {
    workout: ['status','plan_id','session_key','duration_min','exercises'],
    nutrition: ['complete_day','kcal','protein_g','carbs_g','fat_g'],
    measurement: ['weight_kg','waist_cm'],
    recovery: ['sleep_hours','energy','soreness','stress','pain'],
  };
  keys(r, ['schema_version','kind','id','date','created_at','supersedes','notes', ...fields[kind]], `${kind} log`);
  version(r); assert(r.kind === kind, 'Log kind mismatch'); id(r.id); date(r.date);
  assert(r.date <= localToday, 'Observations cannot be dated in the future');
  if (r.supersedes != null) { id(r.supersedes); assert(r.id !== r.supersedes, 'A record cannot supersede itself'); }
  if (r.notes != null) text(r.notes, 'notes');
  if (kind === 'measurement') {
    number(r.weight_kg, 'weight_kg', 10, 500); number(r.waist_cm, 'waist_cm', 20, 300);
    assert(r.weight_kg != null || r.waist_cm != null, 'A measurement needs at least one reported value');
  }
  if (kind === 'recovery') {
    number(r.sleep_hours, 'sleep_hours', 0, 24); number(r.energy, 'energy', 1, 5, true, true);
    for (const key of ['soreness','stress','pain']) number(r[key], key, 0, 10);
    assert(['sleep_hours','energy','soreness','stress','pain'].some(key => r[key] != null) || r.notes?.trim(), 'Recovery needs a value or observation');
  }
  if (kind === 'nutrition') {
    boolean(r.complete_day, 'complete_day');
    number(r.kcal, 'kcal', 0, 15000);
    for (const key of ['protein_g','carbs_g','fat_g']) number(r[key], key, 0, 2000);
    assert(['kcal','protein_g','carbs_g','fat_g'].some(key => r[key] != null) || r.notes?.trim(), 'Nutrition needs a value or observation');
  }
  if (kind === 'workout') {
    choice(r.status, ['completed','partial','skipped'], 'status'); number(r.duration_min, 'duration_min', 0, 600);
    if (r.plan_id != null) id(r.plan_id);
    if (r.session_key != null) { id(r.session_key); assert(r.plan_id != null, 'session_key requires plan_id'); }
    assert(Array.isArray(r.exercises), 'exercises must be an array');
    if (r.status === 'skipped') assert(r.exercises.length === 0, 'Skipped sessions cannot contain performed exercises');
    for (const exercise of r.exercises) {
      keys(exercise, ['name','sets','notes'], 'exercise'); string(exercise.name, 'exercise.name');
      if (exercise.notes != null) text(exercise.notes, 'exercise.notes');
      assert(Array.isArray(exercise.sets) && exercise.sets.length > 0, 'Each exercise needs performed sets');
      for (const set of exercise.sets) {
        keys(set, ['reps','load_kg','rir'], 'set'); number(set.reps, 'reps', 1, 1000, false, true);
        number(set.load_kg, 'load_kg', 0, 1500); number(set.rir, 'rir', 0, 10);
      }
    }
    assert(r.status === 'skipped' || r.exercises.length || r.duration_min > 0 || r.notes?.trim(), 'Completed/partial workouts need reported work');
  }
  return r;
}
export function plan(p) {
  keys(p, ['schema_version','id','created_at','profile_revision','title','parent_id','start_date','end_date','review_date','microcycle_end_date','goal','rationale','blocks','sessions','nutrition','sources','body_md','coaching'], 'plan');
  version(p); id(p.id); if (p.parent_id != null) { id(p.parent_id); assert(p.id !== p.parent_id, 'Plan cannot be its own parent'); }
  for (const key of ['title','goal','rationale','body_md']) string(p[key], key);
  for (const key of ['start_date','end_date','review_date','microcycle_end_date']) date(p[key], key);
  assert(p.start_date <= p.microcycle_end_date && p.microcycle_end_date <= p.end_date, 'Microcycle must lie within the plan');
  assert(p.review_date >= p.start_date && p.review_date <= shift(p.end_date, 7), 'Review date must be within the plan or its following week');
  number(p.profile_revision, 'profile_revision', 1, Number.MAX_SAFE_INTEGER, false, true);
  assert(Array.isArray(p.blocks) && p.blocks.length > 0, 'Plan needs at least one block');
  let next = p.start_date;
  for (const block of p.blocks) {
    keys(block, ['name','start_date','end_date','focus'], 'block'); string(block.name, 'block.name'); string(block.focus, 'block.focus');
    date(block.start_date); date(block.end_date);
    assert(block.start_date === next && block.end_date >= block.start_date && block.end_date <= p.end_date, 'Blocks must be contiguous, chronological, and within the plan');
    next = shift(block.end_date, 1);
  }
  assert(next === shift(p.end_date, 1), 'Blocks must cover the complete plan horizon');
  assert(Array.isArray(p.sessions), 'sessions must be an array');
  const unique = new Set();
  for (const session of p.sessions) {
    keys(session, ['date','key','title'], 'session'); date(session.date); id(session.key); string(session.title, 'session.title');
    assert(session.date >= p.start_date && session.date <= p.microcycle_end_date, 'Scheduled sessions must be within the authored microcycle');
    assert(!unique.has(session.key), 'Session keys must be unique within a plan'); unique.add(session.key);
  }
  keys(p.nutrition, ['approach','energy_strategy','kcal','protein_g','carbs_g','fat_g'], 'plan.nutrition');
  choice(p.nutrition.approach, ['habits','targets'], 'nutrition.approach');
  choice(p.nutrition.energy_strategy, ['unspecified','maintenance','deficit','surplus'], 'nutrition.energy_strategy');
  number(p.nutrition.kcal, 'kcal', 1, 15000); for (const key of ['protein_g','carbs_g','fat_g']) number(p.nutrition[key], key, 0, 2000);
  if (p.nutrition.approach === 'targets') {
    for (const key of ['kcal','protein_g','carbs_g','fat_g']) assert(p.nutrition[key] != null, `Target approach requires ${key}`);
    const macroKcal = 4 * (p.nutrition.protein_g + p.nutrition.carbs_g) + 9 * p.nutrition.fat_g;
    assert(Math.abs(macroKcal - p.nutrition.kcal) <= Math.max(50, p.nutrition.kcal * 0.05), 'Macro calories must agree with kcal within 5% or 50 kcal (rounding allowance)');
  } else assert(['kcal','protein_g','carbs_g','fat_g'].every(key => p.nutrition[key] == null), 'Habit plans keep numerical targets null');
  strings(p.sources, 'sources'); assert(p.sources.length > 0, 'Record at least one relevant evidence source');
  if(p.coaching!=null) object(p.coaching,'coaching');
  return p;
}
export function review(r) {
  keys(r, ['schema_version','id','created_at','plan_id','date','window_start','next_review_date','decision','confidence','observations','changes','body_md'], 'review');
  version(r); id(r.id); id(r.plan_id);
  for (const key of ['date','window_start','next_review_date']) date(r[key], key);
  assert(r.window_start <= r.date && r.next_review_date > r.date, 'Review window/order is invalid');
  choice(r.decision, ['continue','simplify','progress','deload','investigate','revise','professional-input'], 'decision');
  choice(r.confidence, ['low','moderate','high'], 'confidence');
  strings(r.observations, 'observations'); strings(r.changes, 'changes'); string(r.body_md, 'body_md');
  return r;
}
