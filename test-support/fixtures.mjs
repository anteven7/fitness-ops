// Fictional acceptance-test payloads. Never import these as a real person's records.
export function coachingFixture(plan) {
  const explanation=(id,topic,basis,source_ids,recommendation)=>({id,topic,basis,source_ids,recommendation,
    why_for_user:'Fictional beginner with two short sessions, limited equipment, and a goal of consistent practice.',
    uncertainty:'This is an initial choice for a synthetic case; the exact dose is not proved optimal for an individual.',
    reassess_when:'Review after the first week and earlier if pain, recovery, or feasibility changes.'});
  return {
    microcycle_start_date:plan.start_date,
    success_criteria:'Complete the agreed sessions with tolerable effort and record comparable reps and technique by the first review.',
    measurement_protocol:'Record actual sets/reps, equipment and load conventions. Weight tracking is optional. See docs/MEASUREMENTS.md.',
    recovery_plan:'Space strength sessions to allow recovery; adjust to reported sleep and other activity. Sleep needs differ.',
    stop_rules:'Stop for concerning symptoms; do not train through persistent or worsening pain. Seek appropriate assessment.',
    review_triggers:'Weekly review; earlier for pain, inability to recover, or a material change in available time.',
    explanations:[
      explanation('training-principle','training','research',['ACSM-2026'],'Use progressive resistance training aligned to the goal and available equipment.'),
      explanation('training-dose','training','heuristic',[],'Begin with two sets, a manageable rep range and repetitions in reserve; progress only after repeated comparable success.'),
      explanation('nutrition-principle','nutrition','guideline',['WHO-DIET'],'Build meals from varied foods while respecting preferences, allergies and exclusions.'),
      explanation('recovery-principle','recovery','guideline',['AASM-SLEEP'],'Support regular sufficient sleep; adult consensus recommends at least seven hours, while individual needs differ.'),
      explanation('measurement-principle','measurement','guideline',['WHO-STEPS'],'Use standardized measurement conditions when optional anthropometric tracking is chosen.')
    ],
    training:plan.sessions.map(s=>({session_key:s.key,duration_min:40,warmup:'Five minutes of easy movement plus lighter practice sets before the first loaded movement.',
      shortened_option:'Do the squat and row with the planned rest; omit optional work if time is limited.',
      exercises:[{name:'Goblet squat',sets:2,reps_min:8,reps_max:12,rir_min:2,rir_max:3,rest_seconds:120,
        load_guidance:'Choose a manageable load that permits controlled reps with approximately two to three more possible; start lighter if uncertain.',
        technique:'Use a comfortable stance and controllable range; keep the load close. Ask for in-person help if unsure.',
        progression:'After repeated sessions at the top of the range with the intended effort and consistent technique, add the smallest available increment.',
        alternatives:['Supported bodyweight squat to a comfortable height'],explanation_ids:['training-principle','training-dose']}]})),
    nutrition:{method_explanation:'Habit-based meals chosen for feasibility; no claim that this unquantified menu achieves exact calories or macros.',
      menu_md:'Example structure: oats with a tolerated protein food and fruit; a bean/rice/vegetable lunch; fish or tofu with potatoes and vegetables. Adjust foods to the actual profile.',
      groceries_md:'For this fictional example: oats, fruit, beans, rice, vegetables and a tolerated protein option; quantities require the actual meal schedule.',
      substitutions_md:'Swap rice and potatoes using suitable portions; swap fish and tofu while checking the nutritional role and restrictions.',
      micronutrients_md:'Review sources of calcium, iron, B12, vitamin D and iodine in the actual pattern. Do not infer a deficiency from missing logs.',
      reviewed_allergies:[],reviewed_exclusions:[],allergy_check_notes:'Fictional profile reports none. In real use verify ingredients and current package labels, including substitutions.',
      explanation_ids:['nutrition-principle'],menu_days:[]}
  };
}
