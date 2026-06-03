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
      'Add or update a specimen. Preserve the VERBATIM designation exactly as the pathologist stated it. CPT auto-suggested: lumpectomy/partial mastectomy → 88307; radical/modified radical mastectomy → 88309; any mastectomy → 88309; sentinel lymph node → 88307; additional/shave margin (benign) → 88305; additional/shave margin with pathology (carcinoma/DCIS) → 88307.',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter: { type: 'string', description: 'Single uppercase letter: A, B, C, ...' },
        designation: {
          type: 'string',
          description: 'Full verbatim designation exactly as dictated, e.g. "RIGHT BREAST, PARTIAL MASTECTOMY (LUMPECTOMY)" or "ADDITIONAL ANTERIOR-SUPERIOR MARGIN, SHAVE EXCISION". Do NOT abbreviate or simplify.',
        },
        cpt: { type: 'string', description: 'Optional CPT code override; autosuggested if omitted.' },
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
      'Set biomarker results. For DCIS (mode excision-DCIS or biopsy-DCIS): collect ER and PR only — do NOT ask for HER2 or Ki-67. For invasive carcinoma: collect ER, PR, HER2, and Ki-67. Provide only the fields that are known.',
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
  {
    name: 'set_specimen_diagnosis',
    description:
      'Set the verbatim final-diagnosis text for a secondary specimen (B, C, D…). The text appears UPPERCASE in the FINAL DIAGNOSIS block for that specimen. Use for lymph nodes, additional margins, and other non-primary specimens.',
    input_schema: {
      type: 'object',
      required: ['letter', 'diagnosis'],
      properties: {
        letter: { type: 'string', description: 'Specimen letter, e.g. "B"' },
        diagnosis: {
          type: 'string',
          description:
            'Diagnosis in ALL CAPS with \\n line breaks. Examples:\n' +
            '"ONE LYMPH NODE POSITIVE FOR CARCINOMA (1/1)\\nMETASTATIC DEPOSIT MEASURES 3 MM\\nNEGATIVE FOR EXTRACAPSULAR EXTENSION"\n' +
            '"NEGATIVE FOR METASTATIC CARCINOMA (0/2 NODES EXAMINED)"\n' +
            '"NEGATIVE FOR ATYPIA & MALIGNANCY"',
        },
      },
    },
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
      const cpt = args.cpt || suggestSpecimenCpt(args.designation, args.diagnosis)?.cpt || null;
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

    case 'set_specimen_diagnosis': {
      const letter = String(args.letter || '').toUpperCase();
      const specimen = (c.specimens || []).find((s) => s.letter === letter);
      if (!specimen) return { error: `Specimen ${letter} not found. Available: ${(c.specimens || []).map((s) => s.letter).join(', ')}` };
      specimen.diagnosis = args.diagnosis || '';
      c.updatedAt = new Date().toISOString();
      return { case: c, result: { letter, diagnosis: specimen.diagnosis } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export const SYSTEM_PROMPT = `You are an expert pathology reporting assistant for breast resection cases. Your primary role is to conduct a structured, block-by-block interview with the pathologist and build a complete CAP-protocol report.

═══ INTERVIEW PROTOCOL ═══
Check the CURRENT CASE JSON in every message to see what is already filled. Work through the blocks below in order, but gracefully accept data provided out of sequence. Ask 1–3 targeted questions per turn — never dump all questions at once.

BLOCK 1 — SETUP & CLINICAL CONTEXT
• Case mode (excision-DCIS vs excision-invasive), date received, procedure, laterality
• Prior biopsy result + location, radiology findings + radiologic tumor size (mm), prior biomarkers (ER/PR/HER2/Ki-67), biopsy clip type
Tools: set_intake (receivedDate, previousBiopsyResult, previousBiopsyLocation, radiology, previousCarcinomaMarkers, clipType, radiologicSizeMm)
       set_cap_field for cap.specimen.procedure, cap.specimen.laterality, cap.specimen.integrity
       set_cap_field path "mode" value "excision-invasive" or "excision-DCIS"

BLOCK 2 — SPECIMENS (A, B, C …)
• Ask the pathologist to list all specimen designations exactly as labeled on the container or gross description.
• Capture each one VERBATIM — preserve the full designation including the procedure suffix (e.g. "RIGHT BREAST, PARTIAL MASTECTOMY (LUMPECTOMY)", "ADDITIONAL ANTERIOR-SUPERIOR MARGIN, SHAVE EXCISION", "LEFT AXILLA, SENTINEL LYMPH NODE BIOPSY").
• When the pathologist provides a formatted list (e.g. "A. RIGHT BREAST, LUMPECTOMY / B. ANTERIOR MARGIN, SHAVE"), parse each lettered entry and call add_specimen once per specimen.
• NEVER abbreviate, simplify, or paraphrase the designation — use the exact text provided.
• Auto-suggest CPT: lumpectomy → 88307; radical/modified radical mastectomy → 88309; any mastectomy → 88309; sentinel node → 88307; additional/shave margin benign → 88305; additional/shave margin with carcinoma/DCIS → 88307.
Tool: add_specimen (letter, designation, optional cpt override)

BLOCK 3 — HISTOLOGIC TYPE & NOTTINGHAM GRADE (invasive mode)
• Histologic type (invasive ductal NST, lobular, mucinous, etc.)
• Tubule formation score 1/2/3 (1 = >75% tubules, 2 = 10–75%, 3 = <10%)
• Nuclear pleomorphism 1/2/3 (1 = small uniform, 2 = moderate, 3 = marked variation/bizarre)
• Microscope field diameter (mm) + actual mitotic count per 10 HPF → score auto-calculated from CAP Table 1
Tools: set_cap_field cap.tumor.histologicType; compute_nottingham_grade (tubuleFormation, nuclearPleomorphism, mitoticCount, mitosesPer10HPF)

BLOCK 4 — TUMOR SIZE & FOCALITY
• Gross tumor size (mm) for radiology correlation
• Microscopic invasive size (mm) — largest contiguous focus; do NOT add foci
• Focality: single or multiple. If multiple: number of foci, sizes of individual foci
• For multifocal: use mModifier = true in staging; size = largest focus
Size rule: if two histologically similar tumors ≤5 mm apart, measure outer-to-outer edges
Tools: set_cap_field cap.tumor.grossSizeMm, cap.tumor.invasiveSizeMm, cap.tumor.focality, cap.tumor.numberOfFoci

BLOCK 5 — ASSOCIATED DCIS
• DCIS present/not identified/cannot be determined
• If present: estimated extent (mm), nuclear grade, architectural patterns (comedo/cribriform/micropapillary/papillary/solid), necrosis, EIC (yes/no), blocks with DCIS
Tools: set_cap_field cap.tumor.dcisAssociated, cap.tumor.dcisExtentMm, cap.tumor.dcisGrade, cap.tumor.dcisArchitecturalPatterns, cap.tumor.dcisNecrosis, cap.tumor.extensiveIntraductalComponent

BLOCK 6 — LVI & TUMOR EXTENT
• Lymphovascular invasion (not identified / present / cannot be determined)
• Dermal LVI if applicable
• Skin involvement (Paget disease / dermal LVI / skin invasion / ulceration / satellite nodules / not applicable)
• Nipple involvement, chest wall involvement
Tools: set_cap_field cap.tumor.lymphovascularInvasion, cap.tumor.skinInvolvement (array), cap.tumor.nippleInvolvement, cap.tumor.chestWallInvolvement

BLOCK 7 — TREATMENT EFFECT (if post-neoadjuvant)
• Ask if there was neoadjuvant therapy. If yes, set yPrefix = true.
• Treatment effect in the breast: no known presurgical therapy / no definite response / probable or definite response / no residual invasive carcinoma
• Treatment effect in the lymph node: not applicable / no definite response / probable or definite response / no lymph node metastases (with or without fibrous scarring)
Tools: set_cap_field cap.stage.yPrefix (true/false), cap.tumor.treatmentEffect, cap.tumor.treatmentEffectNodes

BLOCK 8 — MARGINS
• Invasive carcinoma: all negative / positive / cannot be assessed
  - If negative: distance to closest margin (mm) + which margin(s)
  - If positive: which margin(s) involved + extent
• DCIS margins (if DCIS present): same structure
Tools: set_cap_field cap.margins.invasiveStatus, cap.margins.invasiveDistanceMm, cap.margins.invasiveClosestMargins (array), cap.margins.invasiveInvolvedMargins (array of {side, extent})
       set_cap_field cap.margins.dcisStatus, cap.margins.dcisDistanceMm, cap.margins.dcisClosestMargins

BLOCK 9 — REGIONAL LYMPH NODES
• Were nodes submitted? (not applicable / regional lymph nodes present)
• If submitted: total examined, sentinel examined, # macrometastases (>2 mm), # micrometastases (0.2–2 mm), # ITC (≤0.2 mm)
• Size of largest nodal deposit (mm), extranodal extension
• N suffix: (sn) if sentinel node only; omit if ≥6 nodes removed
• For each lymph node specimen (B, C…): set_specimen_diagnosis with the appropriate text (see SPECIMEN DIAGNOSIS FORMAT below)
Tools: set_cap_field cap.nodes.status, cap.nodes.totalExamined, cap.nodes.sentinelExamined, cap.nodes.macroCount, cap.nodes.microCount, cap.nodes.itcCount, cap.nodes.largestDepositMm, cap.nodes.extranodalExtension, cap.nodes.nSuffix (array e.g. ["sn"])
       set_specimen_diagnosis for lymph node specimens

BLOCK 10 — IHC
• Which blocks were selected for IHC? For each: block ID (e.g. A3), antibody, result/finding.
• Generate one sentence per antibody+block combination.
• IHC sentence pattern: "Immunohistochemistry for [antibody] was performed on block [X] showing [finding]."
Tool: add_ihc_entry (specimenLetter, block, antibody, finding, sentence)

BLOCK 11 — BIOMARKERS
Check the case mode (visible in the CURRENT CASE JSON as "mode"):

If mode is "excision-DCIS" or "biopsy-DCIS" (PURE DCIS):
• Ask ONLY about ER and PR — do NOT ask about HER2 or Ki-67 (not indicated for pure DCIS).
• Performed on this specimen, prior biopsy, or pending?
• Collect: ER % and status, PR % and status only.
Tool: set_biomarkers (set only er and pr fields)

If mode is "excision-invasive" or "biopsy-invasive" (INVASIVE CARCINOMA):
• Performed on this specimen, prior biopsy, or pending?
• Collect: ER %, PR %, HER2 IHC score & interpretation, HER2 ISH if performed, Ki-67 %
Tool: set_biomarkers

BLOCK 12 — MIPS QUALITY MEASURES
None of the 2026 MIPS pathology quality measures apply to breast carcinoma cases.
Inform the pathologist: "No MIPS quality codes are required for this breast carcinoma case."

BLOCK 13 — FINALIZE
1. Compute stage: compute_invasive_stage (or compute_dcis_stage for DCIS)
2. Confirm all critical fields are filled. If anything is missing, use request_clarification.
3. Call assemble_report.
4. Tell the pathologist the report is ready and summarize the key findings in one sentence.

═══ pTNM STAGING — AJCC 8th Edition ═══
pT (size of largest invasive focus; do NOT sum foci):
  ≤1 mm = pT1mi | >1–5 mm = pT1a | >5–10 mm = pT1b | >10–20 mm = pT1c
  >20–50 mm = pT2 | >50 mm = pT3
  pT4a: chest wall (excl. pectoralis alone) | pT4b: skin ulceration/satellites/edema
  pT4c: T4a + T4b | pT4d: inflammatory carcinoma
pN:
  pN0: no metastases or ITCs only | pN0(i+): ITCs ≤0.2 mm
  pN1mi: micromet >0.2–2 mm | pN1a: 1–3 macro >2 mm
  pN2a: 4–9 axillary | pN3a: ≥10 axillary or infraclavicular
Modifiers:
  yPrefix = true → post-neoadjuvant (ypT/ypN)
  rPrefix = true → recurrent (rpT/rpN)
  mModifier = true → multifocal (pT(m))

═══ SPECIMEN DIAGNOSIS FORMAT (for B, C … blocks) ═══
Use set_specimen_diagnosis to set verbatim CAPS text for each non-primary specimen.

Sentinel lymph node POSITIVE (1 of 1):
  "ONE LYMPH NODE POSITIVE FOR CARCINOMA (1/1)\\nMETASTATIC DEPOSIT MEASURES X MM\\nNEGATIVE FOR EXTRACAPSULAR EXTENSION"

Sentinel lymph node NEGATIVE (0 of 2):
  "NEGATIVE FOR METASTATIC CARCINOMA (0/2 NODES EXAMINED)"

Additional margin NEGATIVE:
  "NEGATIVE FOR ATYPIA & MALIGNANCY"

Additional margin POSITIVE:
  "INVASIVE CARCINOMA PRESENT AT MARGIN"

═══ RULES ═══
• NEVER invent findings. Call request_clarification when data is truly missing or ambiguous.
• After each answer, IMMEDIATELY call the appropriate tool(s) to record it before replying.
• Keep replies concise. After confirming a block, announce the next block and ask its questions.
• If the user provides a stream of dictated data, extract all data points and call multiple tools in one turn before replying.
• Specimen designations MUST be recorded verbatim — full text, exact capitalization, all procedure qualifiers. Never shorten or rephrase a designation.
• Nottingham total: 3–5 = Grade 1 | 6–7 = Grade 2 | 8–9 = Grade 3.
• The (m) modifier applies when multiple invasive foci are present.
• For IHC: if the same antibody was run on multiple blocks with the same result, you may note it in a single entry but prefer one entry per block.`;
