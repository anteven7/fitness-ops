# Formulas, units, worked examples, and limits

Every numerical recommendation should say what was measured, what was calculated, what was assumed, and why the result fits the current goal. Mathematical correctness does not establish that a prescription is suitable. The examples below are fictional arithmetic demonstrations, not your targets.

## Resting energy expenditure (REE)

**Purpose:** a starting estimate of energy expenditure at rest. It is not daily maintenance, a minimum intake, or a weight-loss target.

The simplified Mifflin–St Jeor equation implemented by `estimate` is:

`REE (kcal/day) = 10 × mass (kg) + 6.25 × height (cm) − 5 × age (years) + coefficient`

The original equation uses +5 for males and −161 for females. The toolkit never infers a coefficient from a name. With no selected coefficient it shows both model outputs; this pair is not a confidence interval. The equation cannot represent every hormonal, body-composition or clinical context. An alternative to estimating is to work with a qualified professional and, when appropriate, measured expenditure.

**Example:** 80 kg, 180 cm, age 30 gives `800 + 1125 − 150 = 1775` before the coefficient: 1780 or 1614 kcal/day. The command prints the inputs, each term, rounding, population limits and source so the arithmetic is inspectable. Rounding to a whole kcal does not make physiology that precise.

The derivation study involved 498 healthy people aged 19–78. Other ages and clinical contexts require caution; being inside this range does not guarantee accuracy. [Mifflin et al., original study](https://pubmed.ncbi.nlm.nih.gov/2305711/)

## Total daily expenditure and an intake target

An optional estimate is `TDEE ≈ REE × an explicitly chosen activity factor`. The factor is an assumption that should account for the whole day, not just gym frequency. This repo deliberately does not assign a multiplier automatically. If an assistant uses one, it must show the selected value, rationale, uncertainty, and how observed intake, weight trends and performance will inform revision. Do not add exercise calories again if already included.

An intended deficit/surplus is an adjustment to estimated maintenance, not to REE. A calculation alone cannot establish the right adjustment, suitability, or a promised rate of progress. Check feasibility, hunger, recovery and any clinical limits. A sustained intake/weight pattern can help calibrate an estimate, but under-reporting, fluid changes and changing expenditure remain confounders. Do not convert one week's scale change into an exact calorie correction: long-term energy-balance responses are dynamic. [Hall et al.](https://pubmed.ncbi.nlm.nih.gov/21872751/)

## Protein arithmetic

`Protein (g/day) = chosen reference mass (kg) × selected protein factor (g/kg/day)`.

For example, 80 kg × 1.6 g/kg/day = 128 g/day. This is a demonstration, not a default imposed on the user. Explain the choice of reference mass and factor; do not silently switch to “ideal weight.” Medical context and unusual body composition may require professional interpretation.

ISSN's 1.4–2.0 g/kg/day range concerns exercising adults. A separate resistance-training meta-analysis estimated a breakpoint around 1.6 g/kg/day, with uncertainty; this is a group-level result, not a precise personal requirement or a universal ceiling. Protein food can meet a target without a supplement. [ISSN position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/), [Morton et al.](https://pubmed.ncbi.nlm.nih.gov/28698222/)

## Macro energy and food quantities

The general Atwater approximation is `energy ≈ 4 × protein_g + 4 × carbohydrate_g + 9 × fat_g` (kcal). For 150 g protein, 285 g carbohydrate and 73 g fat: `600 + 1140 + 657 = 2397 kcal`. Specific food factors, fibre conventions and label rounding can produce differences; 4/4/9 is not an exact assay of metabolizable energy. [USDA methodology](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/)

For a weighed ingredient: `nutrient amount = edible portion_g ÷ 100 × source nutrient per 100 g`. A fictional food with 20 g protein/100 g yields 30 g protein in 150 g. Use the source that matches the actual food and state: raw, cooked, drained, or as packaged. Do not multiply raw-food values by cooked-food mass. Water changes weight without creating macronutrients.

The `menu` command sums ingredients into meals and days, rounding only the displayed totals. Record a precise food record or package-label reference. Check ingredient/allergen labels separately: nutrient arithmetic cannot establish allergy safety. For oils, sauces and drinks, include the actual amount rather than treating them as zero.

Plan macro reconciliation allows the larger of 50 kcal or 5%. Menu-versus-target checks allow the larger of 50 kcal/5 g or 10% for each nutrient. **These are software planning/rounding tolerances, not biological safety limits or evidence that eating outside them is harmful.** Explain larger discrepancies and revise the data rather than inventing values to pass a check.

## Progress arithmetic

A window mean is `sum of reported values ÷ number of reported values`. Missing values are excluded. Nutrition averages use complete-day records and each nutrient has its own denominator. A day with a protein value but no calories contributes to protein, not calorie, averages.

The weight comparison is `current seven-day mean − previous seven-day mean`. For 80.2 and 80.6 kg the difference is −0.4 kg. This does not reveal fat loss or prove a 0.4 kg/week rate, because measurement timing and fluid balance matter. Four unique measurement days in each window is the app's coverage convention, not a scientific certainty threshold. Choose lower-burden tracking if frequent weighing is unwanted; use longer raw-data reviews or non-weight outcomes instead.

If discussing a percentage change manually, show the denominator: `100 × change ÷ baseline`. Do not conflate percentage points, percent body mass, and body-fat percentage. The repo does not calculate body-fat percentage from scale or waist observations.

## Loading, volume, and effort

A **set** is a series of repetitions; **work sets** are distinct from warm-up sets. A **rep range** is a useful target interval, not a proof that one count is optimal. **RIR** estimates how many additional repetitions could have been completed with comparable technique before failure. RIR is subjective and can be inaccurate, especially when estimating far from failure. [RIR accuracy review](https://pubmed.ncbi.nlm.nih.gov/34542869/)

The repo logs RIR, not a general RPE scale. If the user reports RPE, establish which scale they mean before interpreting it; do not silently convert a cardio rating into repetitions remaining. Do not infer starting kilograms from RIR alone. Choose a manageable load, observe controlled repetitions and technique, then refine.

`Volume load = sum of repetitions × external load` is optional arithmetic, not a direct hypertrophy measurement. It is misleading across changed machines, exercises, ranges of motion or load conventions. The repo preserves actual sets rather than turning all work into a single “stimulus” score. It does not prescribe true 1RM testing or infer reliable 1RM from every set.

Exact rep ranges, rest durations, RIR targets, load increments and deload timing must have a person-specific rationale. When a precise value is a practical starting choice rather than a result directly established by a source, label it a **coaching heuristic**. Progressive resistance training is supported in adults; that does not make every numerical detail of a particular program experimentally proven. [ACSM 2026 overview](https://pubmed.ncbi.nlm.nih.gov/41843416/)

## Validation ranges are not recommendations

Input limits such as 0–10 for a symptom rating or wide mass/load/calorie bounds detect impossible formats and obvious unit errors. They are not target ranges, recommended intakes, exercise-clearance rules or proof of safety. The code explicitly separates structural validity, plan completeness, scientific applicability and professional clinical judgment.
