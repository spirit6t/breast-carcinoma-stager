/**
 * Agent tools for singleton placenta examination reporting.
 *
 * Terminology: Amsterdam Placental Workshop Group Consensus Statement
 * (Khong TY, et al. Arch Pathol Lab Med. 2016;140:698-713).
 * Weight percentiles: Atlas of Placental Pathology, Appendices A-1 / A-2.
 */

import {
  computePlacentaWeightPercentile,
  placentaCpt,
  DELIVERY_LABELS,
  WEIGHT_REFERENCES,
  DEFAULT_PLACENTA_REFERENCES,
} from './caseModel.js';

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const PLACENTA_TOOL_SCHEMAS = [
  {
    name: 'set_clinical',
    description: 'Set the specimen designation, gestational age, delivery method, and clinical history for the placenta. Call this first.',
    input_schema: {
      type: 'object',
      properties: {
        specimenDesignation: { type: 'string', description: 'Verbatim specimen designation if provided, e.g. "PLACENTA, SINGLETON, THIRD TRIMESTER". Leave empty to auto-build the header from gestational age and delivery method.' },
        gestationalAgeWeeks: { type: 'number', description: 'Completed gestational age in weeks (integer, e.g. 39). Drives the placental weight percentile and trimester.' },
        deliveryMethod:      { type: 'string', enum: ['vaginal', 'assisted_vaginal', 'cesarean', 'other'], description: 'Mode of delivery.' },
        deliveryMethodOther: { type: 'string', description: 'Free-text delivery description when deliveryMethod is "other".' },
        clinicalHistory:     { type: 'string', description: 'Brief clinical history (optional), e.g. "IUGR, oligohydramnios".' },
      },
    },
  },
  {
    name: 'set_weight',
    description: 'Set the unfixed, trimmed placental weight in grams. The percentile for gestational age is auto-computed (Appendix A-1/A-2 singleton standards), and SMALL/LARGE placenta is flagged automatically (<10th / >90th percentile). Requires gestational age to have been set.',
    input_schema: {
      type: 'object',
      required: ['placentaWeightG'],
      properties: {
        placentaWeightG:     { type: 'number', description: 'Placental weight in grams (unfixed, trimmed).' },
        gestationalAgeWeeks: { type: 'number', description: 'Optional — overrides/sets gestational age if not already set.' },
      },
    },
  },
  {
    name: 'set_cord',
    description: 'Set umbilical cord findings. By default the cord is trivascular and negative for funisitis/vasculitis. Provide vessels=2 for a single umbilical artery, or set normal=false with a verbatim ALL-CAPS line for abnormal findings (e.g. funisitis, hypercoiling, velamentous insertion, true knot, thrombosis).',
    input_schema: {
      type: 'object',
      properties: {
        vessels: { type: 'number', enum: [2, 3], description: '3 = trivascular (normal); 2 = two-vessel cord / single umbilical artery.' },
        normal:  { type: 'boolean', description: 'True (default) renders the standard negative cord line. False to use a custom abnormal line.' },
        line:    { type: 'string', description: 'Custom ALL-CAPS cord diagnosis line, used when normal=false. E.g. "TRIVASCULAR UMBILICAL CORD WITH ACUTE FUNISITIS" or "HYPERCOILED UMBILICAL CORD, VELAMENTOUS INSERTION".' },
      },
    },
  },
  {
    name: 'set_membranes',
    description: 'Set placental membrane findings. Default is negative for acute chorioamnionitis. Set normal=false with a custom ALL-CAPS line for abnormal findings (e.g. acute chorioamnionitis with maternal/fetal inflammatory response staging, meconium, chronic chorioamnionitis).',
    input_schema: {
      type: 'object',
      properties: {
        normal: { type: 'boolean', description: 'True (default) renders the standard negative membranes line.' },
        line:   { type: 'string', description: 'Custom ALL-CAPS membranes line, used when normal=false. E.g. "ACUTE CHORIOAMNIONITIS, MATERNAL INFLAMMATORY RESPONSE STAGE 2 GRADE 1; FETAL INFLAMMATORY RESPONSE STAGE 1".' },
      },
    },
  },
  {
    name: 'set_disc',
    description: 'Set placental disc findings. Default is intact, negative for infarct and hematomas. Set normal=false with a custom ALL-CAPS line for abnormal findings (e.g. infarction with % involvement, retroplacental hematoma, intervillous thrombi, accreta).',
    input_schema: {
      type: 'object',
      properties: {
        normal: { type: 'boolean', description: 'True (default) renders the standard negative disc line.' },
        line:   { type: 'string', description: 'Custom ALL-CAPS disc line, used when normal=false. E.g. "PLACENTAL DISC WITH REMOTE INFARCT INVOLVING APPROXIMATELY 10% OF PARENCHYMA" or "RETROPLACENTAL HEMATOMA, CONSISTENT WITH ABRUPTION".' },
      },
    },
  },
  {
    name: 'set_villi_decidua',
    description: 'Set villous and decidual findings. Default is negative for villitis and decidual vasculopathy. Set normal=false with a custom ALL-CAPS line for abnormal findings (e.g. villitis of unknown etiology, chronic villitis, decidual arteriopathy/vasculopathy, accelerated villous maturation, delayed maturation).',
    input_schema: {
      type: 'object',
      properties: {
        normal: { type: 'boolean', description: 'True (default) renders the standard negative villi/decidua line.' },
        line:   { type: 'string', description: 'Custom ALL-CAPS line, used when normal=false. E.g. "CHRONIC VILLITIS OF UNKNOWN ETIOLOGY, HIGH-GRADE" or "DECIDUAL VASCULOPATHY (ATHEROSIS), CONSISTENT WITH MATERNAL VASCULAR MALPERFUSION".' },
      },
    },
  },
  {
    name: 'set_additional',
    description: 'Set additional ALL-CAPS diagnosis bullet lines and/or a case comment and references.',
    input_schema: {
      type: 'object',
      properties: {
        additionalDiagnosisLines: { type: 'array', items: { type: 'string' }, description: 'Extra ALL-CAPS diagnosis lines beyond the five standard components.' },
        caseComment:  { type: 'string', description: 'Optional comment paragraph.' },
        references:   { type: 'array', items: { type: 'string' }, description: 'Override/extend the reference list. If omitted, the standard Amsterdam + weight-standard references are used automatically.' },
      },
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble and finalize the placenta report.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

function recomputeWeight(c) {
  if (c.placentaWeightG != null && c.gestationalAgeWeeks != null) {
    c.weightPercentile = computePlacentaWeightPercentile(c.gestationalAgeWeeks, c.placentaWeightG);
  }
}

export async function executePlacentaTool(name, args, caseData) {
  const c = JSON.parse(JSON.stringify(caseData));
  c.findings = c.findings || { cord: {}, membranes: {}, disc: {}, villiDecidua: {} };

  switch (name) {

    case 'set_clinical': {
      if (args.specimenDesignation != null) c.specimenDesignation = args.specimenDesignation;
      if (args.gestationalAgeWeeks != null) c.gestationalAgeWeeks = args.gestationalAgeWeeks;
      if (args.deliveryMethod      != null) c.deliveryMethod      = args.deliveryMethod;
      if (args.deliveryMethodOther != null) c.deliveryMethodOther = args.deliveryMethodOther;
      if (args.clinicalHistory     != null) c.clinicalHistory     = args.clinicalHistory;
      if (c.gestationalAgeWeeks != null) c.cpt = placentaCpt(c.gestationalAgeWeeks);
      recomputeWeight(c);
      return { case: c, result: { ok: true, cpt: c.cpt } };
    }

    case 'set_weight': {
      if (args.gestationalAgeWeeks != null) c.gestationalAgeWeeks = args.gestationalAgeWeeks;
      if (args.placentaWeightG     != null) c.placentaWeightG     = args.placentaWeightG;
      if (c.gestationalAgeWeeks == null) {
        return { error: 'set_weight: gestational age is required first — call set_clinical with gestationalAgeWeeks.' };
      }
      c.cpt = placentaCpt(c.gestationalAgeWeeks);
      recomputeWeight(c);
      const wp = c.weightPercentile;
      if (wp?.outOfRange) {
        return { case: c, result: { ok: true, warning: `No singleton weight standard available for ${c.gestationalAgeWeeks} weeks (table covers 23–42 weeks). Percentile not computed.` } };
      }
      return {
        case: c,
        result: {
          ok: true,
          percentile: wp?.band,
          smallForGestationalAge: wp?.isSmall || false,
          largeForGestationalAge: wp?.isLarge || false,
          source: wp?.source,
        },
      };
    }

    case 'set_cord': {
      if (args.vessels != null) c.cordVessels = args.vessels;
      c.findings.cord = {
        normal: args.normal != null ? args.normal : (c.findings.cord?.normal ?? true),
        line:   args.line != null ? args.line : (c.findings.cord?.line || ''),
      };
      return { case: c, result: { ok: true } };
    }

    case 'set_membranes': {
      c.findings.membranes = {
        normal: args.normal != null ? args.normal : (c.findings.membranes?.normal ?? true),
        line:   args.line != null ? args.line : (c.findings.membranes?.line || ''),
      };
      return { case: c, result: { ok: true } };
    }

    case 'set_disc': {
      c.findings.disc = {
        normal: args.normal != null ? args.normal : (c.findings.disc?.normal ?? true),
        line:   args.line != null ? args.line : (c.findings.disc?.line || ''),
      };
      return { case: c, result: { ok: true } };
    }

    case 'set_villi_decidua': {
      c.findings.villiDecidua = {
        normal: args.normal != null ? args.normal : (c.findings.villiDecidua?.normal ?? true),
        line:   args.line != null ? args.line : (c.findings.villiDecidua?.line || ''),
      };
      return { case: c, result: { ok: true } };
    }

    case 'set_additional': {
      if (args.additionalDiagnosisLines != null) c.additionalDiagnosisLines = args.additionalDiagnosisLines;
      if (args.caseComment              != null) c.caseComment              = args.caseComment;
      if (args.references               != null) c.references               = args.references;
      return { case: c, result: { ok: true } };
    }

    case 'assemble_report': {
      // Ensure references include the weight-standard citation for the table used.
      const wp = c.weightPercentile;
      const refs = (c.references && c.references.length) ? [...c.references] : [...DEFAULT_PLACENTA_REFERENCES];
      if (wp?.source && WEIGHT_REFERENCES[wp.source] && !refs.includes(WEIGHT_REFERENCES[wp.source])) {
        refs.push(WEIGHT_REFERENCES[wp.source]);
      }
      c.references = refs;
      return { case: c, result: { assembled: true } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

export const PLACENTA_SYSTEM_PROMPT = `You are an expert perinatal pathology reporting assistant specializing in singleton placenta examination. You follow the Amsterdam Placental Workshop Group Consensus Statement for diagnostic terminology, and report placental weight percentiles using the unfixed/trimmed singleton standards (Atlas of Placental Pathology, Appendices A-1 and A-2).

## REPORT TEMPLATE
The final diagnosis follows this exact structure (each line a bullet under the specimen header):

PLACENTA, [GESTATION WEEKS], [DELIVERY METHOD]:
  - [TRIMESTER] PLACENTA, WEIGHT [N] GRAMS (UNFIXED, TRIMMED), CORRESPONDING TO [PERCENTILE] FOR GESTATIONAL AGE
  - (if <10th percentile) SMALL PLACENTA FOR GESTATIONAL AGE
  - TRIVASCULAR UMBILICAL CORD, NEGATIVE FOR FUNISITIS OR VASCULITIS
  - PLACENTAL MEMBRANES WITH NO EVIDENCE OF ACUTE CHORIOAMNIONITIS
  - PLACENTAL DISC INTACT, NEGATIVE FOR INFARCT AND HEMATOMAS
  - NEGATIVE FOR VILLITIS AND DECIDUAL VASCULOPATHY

REFERENCES: ...

## WORKFLOW

### 1. Clinical / specimen (set_clinical)
Ask for: gestational age (completed weeks), mode of delivery (vaginal / assisted vaginal / cesarean section), and any relevant clinical history. If the pathologist dictates a verbatim specimen designation, capture it; otherwise the header is auto-built as "PLACENTA, [N] WEEKS, [DELIVERY METHOD]".

### 2. Placental weight (set_weight)
Ask for the unfixed, trimmed placental weight in grams. The percentile for gestational age and the SMALL (<10th) / LARGE (>90th) flag are computed automatically. Announce the result, e.g. "350 g at 39 weeks → 10th-25th percentile; not small for gestational age." If <10th percentile, a SMALL PLACENTA FOR GESTATIONAL AGE line is added automatically.

### 3. Component findings — default to NORMAL, override only when abnormal
For each component, the default is the negative/normal statement. Ask the pathologist whether each is normal; only override when there is pathology.
- Umbilical cord (set_cord): default trivascular, negative for funisitis/vasculitis. Use vessels=2 for single umbilical artery. For funisitis, hypercoiling, abnormal insertion, knot, or thrombosis, set normal=false with a verbatim ALL-CAPS line.
- Membranes (set_membranes): default negative for acute chorioamnionitis. For chorioamnionitis, stage/grade the maternal and fetal inflammatory responses (Amsterdam) in a custom line.
- Disc (set_disc): default intact, negative for infarct and hematomas. For infarcts give approximate % parenchyma involved; note retroplacental hematoma/abruption, intervillous thrombi, etc.
- Villi & decidua (set_villi_decidua): default negative for villitis and decidual vasculopathy. Note villitis of unknown etiology (grade/extent), chronic villitis, decidual vasculopathy/atherosis, maternal/fetal vascular malperfusion, abnormal villous maturation.

### 4. Additional (set_additional)
Capture any additional diagnosis lines, a comment, or custom references. The standard Amsterdam reference plus the appropriate weight-standard citation are included automatically.

### 5. Finalize (assemble_report)
Assemble the report. Keep all diagnosis text in ALL CAPS. Summarize the case in one sentence.

## NOTES
- "THIRD TRIMESTER" is used for ≥28 weeks; "SECOND TRIMESTER" for 14–27 weeks (computed automatically from gestational age).
- Weight standards cover 23–42 weeks; outside that range the percentile is omitted and you should note the weight without a percentile.
- Always confirm the computed percentile and any SMALL/LARGE flag with the pathologist before finalizing.
`;
