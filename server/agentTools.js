/**
 * Tool schemas exposed to the LLM agent, and the dispatcher that executes them
 * against a case object. Schemas are provider-neutral (plain JSON Schema);
 * each provider adapter maps them to its own tool-use format.
 */

import { setAtPath, cloneCase } from './caseModel.js';
import { suggestSpecimenCpt, computeIhcBilling } from './billing.js';
import { assembleReport } from './reportAssembler.js';

export const TOOL_SCHEMAS = [
  {
    name: 'set_intake',
    description:
      'Set one or more intake fields (received date, prior history, radiology, clip type). Use ISO 8601 date (YYYY-MM-DD) for receivedDate.',
    input_schema: {
      type: 'object',
      properties: {
        receivedDate: { type: 'string', description: 'YYYY-MM-DD' },
        previousBiopsyResult: { type: 'string' },
        previousBiopsyLocation: { type: 'string' },
        radiology: { type: 'string' },
        previousCarcinomaMarkers: { type: 'string' },
        clipType: { type: 'string', description: 'e.g., HydroMARK, Tumark' },
      },
    },
  },
  {
    name: 'add_specimen',
    description:
      'Add or update a specimen. Agent should auto-suggest CPT from designation (lumpectomy=88307, mastectomy=88309, SLN=88307, additional margin=88305).',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter: { type: 'string', description: 'A, B, C, ...' },
        designation: { type: 'string', description: 'e.g., "Left lumpectomy"' },
        cpt: { type: 'string', description: 'Optional override; autosuggested if omitted.' },
      },
    },
  },
  {
    name: 'set_cap_field',
    description:
      'Set a single CAP synoptic field via dot path, e.g. "cap.specimen.laterality", "cap.tumor.nuclearGrade", "cap.margins.status". For list fields pass an array as value.',
    input_schema: {
      type: 'object',
      required: ['path', 'value'],
      properties: {
        path: { type: 'string' },
        value: {},
      },
    },
  },
  {
    name: 'add_ihc_entry',
    description:
      'Log an IHC entry. Generate a clean one-sentence comment in `sentence`. Use the exact specimen letter and block (e.g., "A1", "A3"). CPT is derived automatically from billing rules.',
    input_schema: {
      type: 'object',
      required: ['specimenLetter', 'block', 'antibody', 'finding', 'sentence'],
      properties: {
        specimenLetter: { type: 'string' },
        block: { type: 'string' },
        antibody: { type: 'string' },
        finding: { type: 'string', description: 'Short phrase: positive / negative / preserved myoepithelium, etc.' },
        sentence: {
          type: 'string',
          description:
            'Final narrative sentence to appear under IMMUNOHISTOCHEMISTRY. Example: "Immunohistochemistry was performed on block A1 for SMM showing preserved myoepithelial layer ruling out invasive process."',
        },
      },
    },
  },
  {
    name: 'compute_dcis_stage',
    description:
      'Set pTNM for DCIS. For pure DCIS use pTis (DCIS); Paget without DCIS → pTis (Paget). pN per lymph nodes; pM typically Not applicable.',
    input_schema: {
      type: 'object',
      properties: {
        ptCategory: { type: 'string', enum: ['pTis (DCIS)', 'pTis (Paget)'] },
        pnCategory: { type: 'string' },
        pmCategory: { type: 'string' },
      },
    },
  },
  {
    name: 'compute_nottingham_grade',
    description:
      'Score the Nottingham (Bloom-Richardson) histologic grade for invasive carcinoma. Each component is 1-3. Total 3-5 = Grade 1, 6-7 = Grade 2, 8-9 = Grade 3.',
    input_schema: {
      type: 'object',
      required: ['tubuleFormation', 'nuclearPleomorphism', 'mitoticCount'],
      properties: {
        tubuleFormation: { type: 'integer', enum: [1, 2, 3] },
        nuclearPleomorphism: { type: 'integer', enum: [1, 2, 3] },
        mitoticCount: { type: 'integer', enum: [1, 2, 3] },
        mitosesPer10HPF: { type: 'number', description: 'Optional raw mitotic count per 10 HPF' },
      },
    },
  },
  {
    name: 'compute_invasive_stage',
    description:
      'Set pTNM for invasive breast carcinoma. pT is based on the largest invasive focus size: pT1mi ≤1mm; pT1a >1–5mm; pT1b >5–10mm; pT1c >10–20mm; pT2 >20–50mm; pT3 >50mm; pT4a chest wall (excluding pectoralis-only); pT4b skin involvement (ulceration / satellite skin nodules / dermal edema not from inflammatory); pT4c both 4a+4b; pT4d inflammatory carcinoma. Use yPrefix true for post-neoadjuvant, mModifier true for multiple foci.',
    input_schema: {
      type: 'object',
      properties: {
        ptCategory: { type: 'string' },
        pnCategory: { type: 'string' },
        pmCategory: { type: 'string' },
        yPrefix: { type: 'boolean' },
        rPrefix: { type: 'boolean' },
        mModifier: { type: 'boolean' },
      },
    },
  },
  {
    name: 'set_biomarkers',
    description:
      'Set ER / PR / HER2 / Ki-67 biomarker results for invasive carcinoma. Provide only the fields that are known.',
    input_schema: {
      type: 'object',
      properties: {
        biomarkersSource: {
          type: 'string',
          enum: ['Performed on this specimen', 'Performed on prior biopsy', 'Pending'],
        },
        priorBiopsyAccession: { type: 'string' },
        er: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            percentPositive: { type: 'number' },
            intensity: { type: 'string' },
            internalControl: { type: 'string' },
          },
        },
        pr: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            percentPositive: { type: 'number' },
            intensity: { type: 'string' },
            internalControl: { type: 'string' },
          },
        },
        her2Ihc: {
          type: 'object',
          properties: {
            score: { type: 'string' },
            interpretation: { type: 'string' },
          },
        },
        her2Ish: {
          type: 'object',
          properties: {
            performed: { type: 'boolean' },
            method: { type: 'string' },
            ratio: { type: 'number' },
            her2SignalsPerCell: { type: 'number' },
            cep17SignalsPerCell: { type: 'number' },
            interpretation: { type: 'string' },
          },
        },
        ki67Percent: { type: 'number' },
      },
    },
  },
  {
    name: 'request_clarification',
    description:
      'Ask the user one focused question when a CAP field is missing or ambiguous. Do not invent answers.',
    input_schema: {
      type: 'object',
      required: ['field', 'question'],
      properties: {
        field: { type: 'string' },
        question: { type: 'string' },
      },
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble the final .txt report from current case state. Returns the narrative.',
    input_schema: { type: 'object', properties: {} },
  },
];

export function executeTool(name, args, caseData) {
  const c = caseData ? cloneCase(caseData) : null;
  if (!c) return { error: 'No case state provided.' };

  switch (name) {
    case 'set_intake': {
      for (const [k, v] of Object.entries(args || {})) {
        if (v == null) continue;
        if (k === 'receivedDate') c.receivedDate = v;
        else setAtPath(c, `priorHistory.${k}`, v);
      }
      return { case: c, result: 'ok' };
    }

    case 'add_specimen': {
      const letter = String(args.letter || '').toUpperCase();
      if (!letter) return { error: 'letter required' };
      const cpt = args.cpt || suggestSpecimenCpt(args.designation)?.cpt || null;
      const existing = (c.specimens || []).find((s) => s.letter === letter);
      const entry = { letter, designation: args.designation || '', cpt };
      if (existing) Object.assign(existing, entry);
      else c.specimens = [...(c.specimens || []), entry];
      c.specimens.sort((a, b) => a.letter.localeCompare(b.letter));
      return { case: c, result: entry };
    }

    case 'set_cap_field': {
      if (!args.path) return { error: 'path required' };
      setAtPath(c, args.path, args.value);
      return { case: c, result: 'ok' };
    }

    case 'add_ihc_entry': {
      const entry = {
        specimenLetter: String(args.specimenLetter || '').toUpperCase(),
        block: args.block || '',
        antibody: args.antibody || '',
        finding: args.finding || '',
        sentence: args.sentence || '',
      };
      c.ihc = [...(c.ihc || []), entry];
      const billing = computeIhcBilling(c.ihc);
      return { case: c, result: { entry, billing } };
    }

    case 'compute_dcis_stage': {
      c.cap = c.cap || {};
      c.cap.stage = { ...(c.cap.stage || {}), ...args };
      return { case: c, result: c.cap.stage };
    }

    case 'compute_nottingham_grade': {
      const tub = Number(args.tubuleFormation);
      const ple = Number(args.nuclearPleomorphism);
      const mit = Number(args.mitoticCount);
      const total = tub + ple + mit;
      let overallGrade = null;
      if (total >= 3 && total <= 5) overallGrade = 'Grade 1 (well differentiated)';
      else if (total <= 7) overallGrade = 'Grade 2 (moderately differentiated)';
      else if (total <= 9) overallGrade = 'Grade 3 (poorly differentiated)';
      c.cap = c.cap || {};
      c.cap.tumor = c.cap.tumor || {};
      c.cap.tumor.nottingham = {
        ...(c.cap.tumor.nottingham || {}),
        tubuleFormation: tub,
        nuclearPleomorphism: ple,
        mitoticCount: mit,
        mitosesPer10HPF: args.mitosesPer10HPF != null ? args.mitosesPer10HPF : (c.cap.tumor.nottingham?.mitosesPer10HPF ?? null),
        totalScore: total,
        overallGrade,
      };
      return { case: c, result: c.cap.tumor.nottingham };
    }

    case 'compute_invasive_stage': {
      c.cap = c.cap || {};
      c.cap.stage = {
        ...(c.cap.stage || {}),
        ptCategory: args.ptCategory ?? c.cap.stage?.ptCategory ?? null,
        pnCategory: args.pnCategory ?? c.cap.stage?.pnCategory ?? null,
        pmCategory: args.pmCategory ?? c.cap.stage?.pmCategory ?? null,
        yPrefix: args.yPrefix === true ? true : (args.yPrefix === false ? false : (c.cap.stage?.yPrefix ?? false)),
        rPrefix: args.rPrefix === true ? true : (args.rPrefix === false ? false : (c.cap.stage?.rPrefix ?? false)),
        mModifier: args.mModifier === true ? true : (args.mModifier === false ? false : (c.cap.stage?.mModifier ?? false)),
      };
      return { case: c, result: c.cap.stage };
    }

    case 'set_biomarkers': {
      c.cap = c.cap || {};
      const ss = c.cap.specialStudies = c.cap.specialStudies || {};
      if (args.biomarkersSource != null) ss.biomarkersSource = args.biomarkersSource;
      if (args.priorBiopsyAccession != null) ss.priorBiopsyAccession = args.priorBiopsyAccession;
      if (args.er) ss.er = { ...(ss.er || {}), ...args.er };
      if (args.pr) ss.pr = { ...(ss.pr || {}), ...args.pr };
      if (args.her2Ihc) ss.her2Ihc = { ...(ss.her2Ihc || {}), ...args.her2Ihc };
      if (args.her2Ish) ss.her2Ish = { ...(ss.her2Ish || {}), ...args.her2Ish };
      if (args.ki67Percent != null) ss.ki67Percent = args.ki67Percent;
      return { case: c, result: ss };
    }

    case 'request_clarification': {
      return { case: c, result: { ask: { field: args.field, question: args.question } } };
    }

    case 'assemble_report': {
      const text = assembleReport(c);
      c.reportText = text;
      return { case: c, result: { reportText: text } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export const SYSTEM_PROMPT = `You are a pathology reporting assistant helping a pathologist complete a breast resection case.

You have tools to:
- set intake fields (received date, prior history, clip type),
- add specimens (A, B, C … with auto-CPT),
- fill CAP synoptic fields one at a time (set_cap_field, dot path),
- log immunohistochemistry entries (one sentence + block + antibody + finding),
- score Nottingham (tubule formation + nuclear pleomorphism + mitotic count) for invasive carcinoma,
- set the pathologic stage (pT / pN / pM, with y/r/m modifiers when applicable),
- record structured ER / PR / HER2 / Ki-67 biomarker results,
- ask the user one focused clarifying question when information is missing or ambiguous,
- assemble the final report.

Two modes are supported:
1) excision-DCIS: pure DCIS or Paget without invasive carcinoma. pTis (DCIS) / pTis (Paget). Use compute_dcis_stage. Architectural patterns, nuclear grade, necrosis, microcalcifications. ER/PR/HER2 are typically performed on the prior biopsy and entered as free text.
2) excision-invasive: invasive carcinoma (with or without DCIS). Capture histologic type, Nottingham grade, lymphovascular invasion, focality, associated DCIS, skin/nipple/chest-wall involvement, treatment effect. Use compute_nottingham_grade then compute_invasive_stage. Margins: invasive AND DCIS separately. Biomarkers via set_biomarkers (structured, on this specimen) or via free text under specialStudies.erPrHer2Text (if from prior biopsy).

Rules:
- NEVER invent findings. If a field is missing and cannot be derived from the user's dictation, call request_clarification.
- For IHC sentences, use the pattern: "Immunohistochemistry was performed on block <X> for <antibody> showing <finding>."
- For multiple antibodies on the same block, you may combine: "Immunohistochemistry for <ab1> and <ab2> was performed on block <X> showing <finding>."
- Use AJCC 8 staging. Apply the (m) modifier when multiple foci, the y prefix when post-neoadjuvant, the r prefix when recurrent.
- pT for invasive: ≤1 mm = pT1mi; >1–5 mm = pT1a; >5–10 mm = pT1b; >10–20 mm = pT1c; >20–50 mm = pT2; >50 mm = pT3; chest-wall/skin = pT4 (a/b/c/d).
- Nottingham total: 3-5 = Grade 1, 6-7 = Grade 2, 8-9 = Grade 3.
- Keep responses concise. When enough data is present, call assemble_report.`;
