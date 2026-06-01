import { setAtPathEndo } from './caseModel.js';

export const ENDO_TOOL_SCHEMAS = [
  {
    name: 'set_endo_field',
    description: 'Set a CAP field for an endometrial case via dot path, e.g. "cap.tumor.histologicType". For array fields pass an array.',
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
    name: 'add_specimen',
    description: 'Add or update a specimen. Preserve the VERBATIM designation exactly as stated (e.g. "UTERUS, CERVIX, BILATERAL FALLOPIAN TUBES AND OVARIES, TOTAL HYSTERECTOMY, BILATERAL SALPINGO-OOPHORECTOMY"). CPT: hysterectomy with neoplastic tumor=88309, lymph node=88307, BSO=88307, additional tissue=88305.',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter: { type: 'string' },
        designation: { type: 'string', description: 'Full verbatim designation — do NOT abbreviate.' },
        cpt: { type: 'string' },
      },
    },
  },
  {
    name: 'set_specimen_diagnosis',
    description: 'Set the verbatim final-diagnosis text for a secondary specimen (B, C…). Text appears UPPERCASE.',
    input_schema: {
      type: 'object',
      required: ['letter', 'diagnosis'],
      properties: {
        letter: { type: 'string' },
        diagnosis: { type: 'string' },
      },
    },
  },
  {
    name: 'add_ihc_entry',
    description: 'Log an IHC result. Generate a clean one-sentence comment.',
    input_schema: {
      type: 'object',
      required: ['specimenLetter', 'block', 'antibody', 'finding', 'sentence'],
      properties: {
        specimenLetter: { type: 'string' },
        block: { type: 'string' },
        antibody: { type: 'string' },
        finding: { type: 'string' },
        sentence: { type: 'string' },
      },
    },
  },
  {
    name: 'compute_endometrial_stage',
    description: 'Compute and set pTNM (AJCC 8), FIGO 2009, and FIGO 2023 stage from current tumor/node/biomarker data. Call after all tumor, node, and special studies fields are filled.',
    input_schema: {
      type: 'object',
      required: [],
      properties: {},
    },
  },
  {
    name: 'set_endo_stage',
    description: 'Directly set staging fields: ptCategory, pnCategory, pmCategory, figoStage2009, figoStage2023.',
    input_schema: {
      type: 'object',
      required: [],
      properties: {
        ptCategory: { type: 'string' },
        pnCategory: { type: 'string' },
        pmCategory: { type: 'string' },
        figoStage2009: { type: 'string' },
        figoStage2023: { type: 'string' },
        yPrefix: { type: 'boolean' },
        rPrefix: { type: 'boolean' },
        nSuffix: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'set_biomarkers_endo',
    description: 'Set endometrial biomarkers: ER, PR, MMR (MLH1/MSH2/MSH6/PMS2), p53, and source.',
    input_schema: {
      type: 'object',
      required: [],
      properties: {
        source: { type: 'string', description: '"Performed on this specimen" | "Pending"' },
        er: { type: 'string' },
        pr: { type: 'string' },
        mmr: { type: 'string', description: 'e.g. "MLH1 lost, MSH2 intact, MSH6 intact, PMS2 lost"' },
        p53: { type: 'string', description: '"Wild-type (normal)" | "Abnormal (overexpression)" | "Abnormal (null)" | "Equivocal"' },
        representativeBlock: { type: 'string' },
      },
    },
  },
  {
    name: 'set_intake',
    description: 'Set top-level case fields: receivedDate, organ mode, clinical history, prior biopsy, radiology.',
    input_schema: {
      type: 'object',
      required: [],
      properties: {
        receivedDate: { type: 'string' },
        clinicalHistory: { type: 'string' },
        previousBiopsyResult: { type: 'string' },
        radiologicFindings: { type: 'string' },
      },
    },
  },
  {
    name: 'request_clarification',
    description: 'Ask the pathologist for missing information.',
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
    name: 'set_mips_code',
    description: 'Record the confirmed MIPS quality code for this endometrial case.',
    input_schema: {
      type: 'object',
      required: ['measureNumber', 'code'],
      properties: {
        measureNumber: { type: 'string', description: 'e.g. "491"' },
        code:          { type: 'string', description: 'e.g. "M1193"' },
        codeLabel:     { type: 'string' },
      },
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble and finalize the pathology report. Call only when all required fields are filled.',
    input_schema: {
      type: 'object',
      required: [],
      properties: {},
    },
  },
];

function computeEndometrialStage(c) {
  const t = c.cap?.tumor || {};
  const n = c.cap?.nodes || {};
  const meta = c.cap?.metastasis || {};
  const ss = c.cap?.specialStudies || {};

  // ── pT ──
  let ptCategory = null;
  if (/bladder|bowel|mucosa/i.test(t.otherOrganInvolvement || '')) {
    ptCategory = 'pT4';
  } else if (/vagin|parametri/i.test(t.otherOrganInvolvement || '')) {
    ptCategory = 'pT3b';
  } else if (/present/i.test(t.uterineSerosal || '') || /involved|carcinoma/i.test(t.fallopianTubes || '') || /involved|carcinoma/i.test(t.ovaries || '')) {
    ptCategory = 'pT3a';
  } else if (/cervical\s+stromal/i.test(t.cervicalInvolvement || '')) {
    ptCategory = 'pT2';
  } else if (/outer|≥\s*50|>=\s*50|more/i.test(t.myometrialInvasion || '')) {
    ptCategory = 'pT1b';
  } else if (/inner|<\s*50|less/i.test(t.myometrialInvasion || '') || /not\s+identified/i.test(t.myometrialInvasion || '')) {
    ptCategory = 'pT1a';
  }

  // ── pN ──
  const pel = n.pelvis || {};
  const paa = n.paraAortic || {};
  const pelMacro = Number(pel.macroCount) || 0;
  const pelMicro = Number(pel.microCount) || 0;
  const pelItc   = Number(pel.itcCount)   || 0;
  const paaMacro = Number(paa.macroCount) || 0;
  const paaMicro = Number(paa.microCount) || 0;

  let pnCategory = null;
  if (paaMacro > 0)      pnCategory = 'pN2a';
  else if (paaMicro > 0) pnCategory = 'pN2mi';
  else if (pelMacro > 0) pnCategory = 'pN1a';
  else if (pelMicro > 0) pnCategory = 'pN1mi';
  else if (pelItc > 0)   pnCategory = 'pN0(i+)';
  else if (pel.status && !/not\s+(submitted|applicable)/i.test(pel.status)) pnCategory = 'pN0';

  // ── pM ──
  let pmCategory = 'Not applicable — pM cannot be determined from the submitted specimen(s)';
  if (meta.sites?.length) pmCategory = 'pM1';

  // ── FIGO 2009 ──
  let figoStage2009 = null;
  if (pmCategory === 'pM1')                          figoStage2009 = 'IVB';
  else if (ptCategory === 'pT4')                     figoStage2009 = 'IVA';
  else if (pnCategory && /pN2/i.test(pnCategory))   figoStage2009 = 'IIIC2';
  else if (pnCategory && /pN1/i.test(pnCategory))   figoStage2009 = 'IIIC1';
  else if (ptCategory === 'pT3b')                    figoStage2009 = 'IIIB';
  else if (ptCategory === 'pT3a')                    figoStage2009 = 'IIIA';
  else if (ptCategory === 'pT2')                     figoStage2009 = 'II';
  else if (ptCategory === 'pT1b')                    figoStage2009 = 'IB';
  else if (ptCategory === 'pT1a')                    figoStage2009 = 'IA';

  // ── FIGO 2023 ──
  const figoStage2023 = computeFigo2023(c, ptCategory, pnCategory, pmCategory);

  return { ptCategory, pnCategory, pmCategory, figoStage2009, figoStage2023 };
}

function computeFigo2023(c, ptCategory, pnCategory, pmCategory) {
  const t = c.cap?.tumor || {};
  const n = c.cap?.nodes || {};
  const meta = c.cap?.metastasis || {};
  const ss = c.cap?.specialStudies || {};

  const aggressive = /carcinosarcoma|serous\s+carcinoma|clear[\s-]?cell\s+carcinoma|undifferentiated/i.test(t.histologicType || '');
  const lowGradeEndo = /endometrioid/i.test(t.histologicType || '') && /grade\s*[12]/i.test(t.histologicGrade || '');
  const p53abn = /abnormal/i.test(ss.p53 || '');
  const foci = t.lviFoci != null ? Number(t.lviFoci) : null;
  const subLVI = (foci != null && foci >= 5) || /substantial|≥\s*5|>=\s*5/i.test(t.lvi || '');
  const focalOrNoLVI = !t.lvi || /not\s+identified/i.test(t.lvi) || (foci != null && foci <= 4) || /focal|≤\s*4|<=\s*4/i.test(t.lvi || '');

  const noMyo    = !t.myometrialInvasion || /not\s+identified/i.test(t.myometrialInvasion);
  const innerMyo = /inner|<\s*50|less/i.test(t.myometrialInvasion || '');
  const outerMyo = /outer|≥\s*50|>=\s*50|more/i.test(t.myometrialInvasion || '');
  const anyMyo   = !noMyo;

  const pel = n.pelvis || {};
  const paa = n.paraAortic || {};
  const pelMacro = Number(pel.macroCount) || 0;
  const pelMicro = Number(pel.microCount) || 0;
  const paaMacro = Number(paa.macroCount) || 0;
  const paaMicro = Number(paa.microCount) || 0;

  const tubeInvolved  = /involved|carcinoma/i.test(t.fallopianTubes || '');
  const ovaryInvolved = /involved|carcinoma/i.test(t.ovaries || '');
  const serosal       = /present/i.test(t.uterineSerosal || '');
  const cervStromal   = /cervical\s+stromal/i.test(t.cervicalInvolvement || '');
  const vaginaParam   = /vagin|parametri/i.test(t.otherOrganInvolvement || '');
  const distSites     = meta.sites || [];

  // Stage IV
  if (distSites.some(s => /lung|liver|brain|bone|inguinal|above.*renal|extra.abdominal/i.test(s))) return 'IVC';
  if (distSites.some(s => /periton|oment/i.test(s))) return 'IVB';
  if (ptCategory === 'pT4') return 'IVA';

  // Stage IIIC
  if (paaMacro > 0) return 'IIIC2ii';
  if (paaMicro > 0) return 'IIIC2i';
  if (pelMacro > 0) return 'IIIC1ii';
  if (pelMicro > 0) return 'IIIC1i';

  // Stage IIIB
  if (vaginaParam) return 'IIIB1';

  // Stage IIIA
  if (serosal) return 'IIIA2';
  // IA3 exception: low-grade endometrioid limited to uterus+ovary (no tube, no serosa, no cervical/vaginal spread)
  if (ovaryInvolved && lowGradeEndo && !tubeInvolved && !serosal && !cervStromal && !vaginaParam) return 'IA3';
  if (tubeInvolved || ovaryInvolved) return 'IIIA1';

  // IICm — p53 abnormal, confined to corpus, any myometrial invasion (overrides IIA/IIB/IIC)
  if (p53abn && anyMyo) return 'IICm (p53abn)';

  // Stage IIC — aggressive + any myometrial invasion
  if (aggressive && anyMyo) return 'IIC';

  // Stage IIB — substantial LVSI, non-aggressive
  if (subLVI && !aggressive) return 'IIB';

  // Stage IIA — cervical stromal invasion, non-aggressive
  if (cervStromal && !aggressive) return 'IIA';

  // Stage IC — aggressive, no myometrial invasion
  if (aggressive && noMyo) return 'IC';

  // Stage IB — non-aggressive, ≥50% myometrial, no/focal LVSI
  if (!aggressive && outerMyo && focalOrNoLVI) return 'IB';

  // Stage IA
  if (!aggressive && innerMyo && focalOrNoLVI) return 'IA2';
  if (!aggressive && noMyo) return 'IA1';

  return null;
}

export function executeEndoTool(name, args, caseData) {
  const c = JSON.parse(JSON.stringify(caseData));

  switch (name) {
    case 'set_intake': {
      if (args.receivedDate) c.receivedDate = args.receivedDate;
      if (args.clinicalHistory != null) c.priorHistory = { ...c.priorHistory, clinicalHistory: args.clinicalHistory };
      if (args.previousBiopsyResult != null) c.priorHistory = { ...c.priorHistory, previousBiopsyResult: args.previousBiopsyResult };
      if (args.radiologicFindings != null) c.priorHistory = { ...c.priorHistory, radiologicFindings: args.radiologicFindings };
      return { case: c, result: { ok: true } };
    }

    case 'set_endo_field': {
      setAtPathEndo(c, args.path, args.value);
      return { case: c, result: { path: args.path, value: args.value } };
    }

    case 'add_specimen': {
      const letter = String(args.letter || '').toUpperCase();
      const existing = (c.specimens || []).find(s => s.letter === letter);
      const entry = { letter, designation: args.designation || '', cpt: args.cpt || null, diagnosis: existing?.diagnosis || '' };
      if (existing) {
        c.specimens = c.specimens.map(s => s.letter === letter ? { ...s, ...entry } : s);
      } else {
        c.specimens = [...(c.specimens || []), entry];
      }
      c.specimens.sort((a, b) => a.letter.localeCompare(b.letter));
      return { case: c, result: { letter, designation: entry.designation } };
    }

    case 'set_specimen_diagnosis': {
      const letter = String(args.letter || '').toUpperCase();
      const specimen = (c.specimens || []).find(s => s.letter === letter);
      if (!specimen) return { error: `Specimen ${letter} not found` };
      specimen.diagnosis = args.diagnosis || '';
      return { case: c, result: { letter, diagnosis: specimen.diagnosis } };
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
      return { case: c, result: { added: entry } };
    }

    case 'compute_endometrial_stage': {
      const computed = computeEndometrialStage(c);
      c.cap.stage = { ...c.cap.stage, ...computed };
      return { case: c, result: computed };
    }

    case 'set_endo_stage': {
      const s = c.cap.stage || {};
      if (args.ptCategory != null) s.ptCategory = args.ptCategory;
      if (args.pnCategory != null) s.pnCategory = args.pnCategory;
      if (args.pmCategory != null) s.pmCategory = args.pmCategory;
      if (args.figoStage2009 != null) s.figoStage2009 = args.figoStage2009;
      if (args.figoStage2023 != null) s.figoStage2023 = args.figoStage2023;
      if (args.yPrefix != null) s.yPrefix = args.yPrefix;
      if (args.rPrefix != null) s.rPrefix = args.rPrefix;
      if (args.nSuffix) c.cap.nodes.nSuffix = args.nSuffix;
      c.cap.stage = s;
      return { case: c, result: { stage: s } };
    }

    case 'set_biomarkers_endo': {
      const ss = c.cap.specialStudies || {};
      if (args.source != null) ss.biomarkersSource = args.source;
      if (args.er != null) ss.er = args.er;
      if (args.pr != null) ss.pr = args.pr;
      if (args.mmr != null) ss.mmr = args.mmr;
      if (args.p53 != null) ss.p53 = args.p53;
      if (args.representativeBlock != null) ss.representativeBlock = args.representativeBlock;
      c.cap.specialStudies = ss;
      return { case: c, result: { specialStudies: ss } };
    }

    case 'set_mips_code': {
      const existing = (c.mips || []).filter(m => m.measureNumber !== args.measureNumber);
      c.mips = [...existing, {
        measureNumber: args.measureNumber,
        code:          args.code,
        codeLabel:     args.codeLabel || '',
      }];
      return { case: c, result: { ok: true, measureNumber: args.measureNumber, code: args.code } };
    }

    case 'assemble_report': {
      return { case: c, result: { assembled: true } };
    }

    case 'request_clarification': {
      return { case: c, result: { ask: { field: args.field, question: args.question } } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export const ENDO_SYSTEM_PROMPT = `You are an expert pathology reporting assistant for endometrial carcinoma cases. Your role is to conduct a structured, block-by-block interview with the pathologist and build a complete CAP-protocol report following AJCC 8th Edition and FIGO 2009/2023 staging.

═══ INTERVIEW PROTOCOL ═══
Check the CURRENT CASE JSON in every message to see what is already filled. Work through the blocks in order, but accept data provided out of sequence. Ask 1–3 targeted questions per turn.

BLOCK 1 — CLINICAL CONTEXT
• Date received, clinical history (e.g., Lynch syndrome, obesity, abnormal bleeding, prior biopsy)
• Prior endometrial biopsy result
• Radiology findings
Tool: set_intake (receivedDate, clinicalHistory, previousBiopsyResult, radiologicFindings)

BLOCK 2 — SPECIMENS (A, B, C …)
• Capture VERBATIM designations exactly as labeled (e.g. "UTERUS, CERVIX, BILATERAL FALLOPIAN TUBES AND OVARIES, TOTAL HYSTERECTOMY, BILATERAL SALPINGO-OOPHORECTOMY").
• Parse all lettered entries from bulk dictation — never abbreviate.
• CPT: hysterectomy with neoplasm 88309, lymph node 88307, BSO 88307, additional tissue 88305.
Tool: add_specimen (letter, designation)

BLOCK 3 — PROCEDURE & SPECIMEN INTEGRITY
• Procedure: Total hysterectomy / Radical hysterectomy / Other
• BSO included?
• Specimen integrity: Intact / Opened / Fragmented
Tool: set_endo_field cap.specimen.procedure, cap.specimen.integrity

BLOCK 4 — HISTOLOGIC TYPE & GRADE
• Histologic type: Endometrioid / Serous / Clear cell / Mucinous / Mixed / Undifferentiated / Carcinosarcoma / Other
• FIGO grade (endometrioid only): Grade 1 / Grade 2 / Grade 3
• For non-endometrioid: all are considered high-grade
Tools: set_endo_field cap.tumor.histologicType, cap.tumor.histologicGrade

BLOCK 5 — TUMOR SIZE & MYOMETRIAL INVASION
• Gross tumor size (mm)
• Myometrial invasion: Not identified / Inner half (<50%) / Outer half (≥50%)
  - If present: estimate percentage
• Adenomyosis: Not identified / Present uninvolved / Present involved by carcinoma
Tools: set_endo_field cap.tumor.tumorSizeMm, cap.tumor.myometrialInvasion, cap.tumor.myometrialInvasionPercent, cap.tumor.adenomyosis

BLOCK 6 — EXTENT OF DISEASE
• Uterine serosal involvement: Not identified / Present
• Lower uterine segment: Not identified / Present non-myoinvasive / Present myoinvasive
• Cervical involvement: Not identified / Endocervical glandular involvement / Cervical stromal invasion
• Adnexa/ovary involvement
• Fallopian tubes: Benign bilateral / Involved by carcinoma / Other
• Ovaries: Benign bilateral / Involved by carcinoma / Other
Tools: set_endo_field cap.tumor.uterineSerosal, cap.tumor.lowerUterineSegment, cap.tumor.cervicalInvolvement, cap.tumor.adnexalInvolvement, cap.tumor.fallopianTubes, cap.tumor.ovaries

BLOCK 7 — LVI & PERITONEAL WASHINGS
• Lymphovascular invasion: Not identified / Present ≤4 foci / Present ≥5 foci
  - If present: specify number of foci
• Peritoneal/pelvic washings: Not submitted / Negative / Positive / Atypical / Suspicious
Tools: set_endo_field cap.tumor.lvi, cap.tumor.lviFoci, cap.tumor.peritonealWashings

BLOCK 8 — MARGINS
• Required only if cervix or parametrium involved
• Status: Not applicable / All margins negative / Carcinoma present at margin
  - If negative: distance (mm), closest location(s)
  - If positive: involved location(s)
Tools: set_endo_field cap.margins.status, cap.margins.closestMm, cap.margins.closestLocations, cap.margins.involvedLocations

BLOCK 9 — REGIONAL LYMPH NODES
• Were pelvic nodes submitted? Para-aortic nodes?
• For each group: total examined, # macrometastases (>2mm), # micrometastases (0.2–2mm), # ITCs (≤0.2mm)
• Largest deposit (mm), laterality
• N suffix: (sn) sentinel node only; (f) FNA or core
• For each node specimen: set_specimen_diagnosis with appropriate text
Tools: set_endo_field cap.nodes.pelvis.*, cap.nodes.paraAortic.*
       set_specimen_diagnosis for each node specimen

BLOCK 10 — DISTANT METASTASIS
• Sites (if applicable): omentum, extrapelvic peritoneum, inguinal nodes, lung, liver, bone, other
Tool: set_endo_field cap.metastasis.sites (array)

BLOCK 11 — IHC & BIOMARKERS
• Which blocks selected for IHC?
• For each: block ID, antibody, result
• Key markers: ER, PR, MMR (MLH1, MSH2, MSH6, PMS2 — each intact or lost), p53
• Representative block for molecular studies
• Biomarker source: Performed on this specimen / Pending
Tools: add_ihc_entry (specimenLetter, block, antibody, finding, sentence)
       set_biomarkers_endo (source, er, pr, mmr, p53, representativeBlock)

BLOCK 12 — MIPS QUALITY MEASURES
Measure #491 (MMR/MSI Biomarker Testing) applies to endometrial carcinoma cases.
- Ask: "Was MMR/MSI testing performed or recommended in the report?"
  • Yes / included in report → call set_mips_code with measureNumber "491", code "M1193", codeLabel "MMR/MSI testing included or recommended in report"
  • Testing done on a prior biopsy specimen → M1195
  • Not performed, no reason given → M1194 (Performance Not Met)
  • Patient has Lynch Syndrome diagnosis → M1192 (Exclusion — not counted in denominator)
  • Medical reason (no residual tumor, insufficient tissue, post-neoadjuvant) → M1194 with documented reason (Exception)

BLOCK 13 — FINALIZE
1. Compute stage: compute_endometrial_stage (auto-calculates pT, pN, FIGO 2009, FIGO 2023)
2. If POLE mutation or other special classifier is known, override with set_endo_stage (figoStage2023 = "IAm (POLEmut)" etc.)
3. Confirm all critical fields filled; use request_clarification if missing.
4. Call assemble_report.
5. Summarize key findings in one sentence.

═══ pTNM STAGING — AJCC 8th Edition ═══
pT1a: Tumor limited to endometrium OR <50% myometrial invasion
pT1b: ≥50% myometrial invasion
pT2: Cervical stromal invasion (NOT endocervical glandular)
pT3a: Uterine serosal involvement OR adnexa
pT3b: Vaginal or parametrial involvement
pT4: Bladder or bowel mucosa invasion

pN0: No regional node metastasis (or only ITCs)
pN0(i+): ITCs ≤0.2 mm in regional nodes
pN1mi: Micromet >0.2–2mm to pelvic nodes
pN1a: Macro >2mm to pelvic nodes
pN2mi: Micromet to para-aortic nodes
pN2a: Macro >2mm to para-aortic nodes

FIGO 2009: IA=pT1a pN0 | IB=pT1b pN0 | II=pT2 pN0 | IIIA=pT3a | IIIB=pT3b | IIIC1=pN1 | IIIC2=pN2 | IVA=pT4 | IVB=pM1

═══ FIGO 2023 STAGING (auto-computed) ═══
Stage I (confined to corpus/ovary):
  IA1: Non-aggressive; confined to endometrium or polyp
  IA2: Non-aggressive; <50% myometrial invasion; no/focal LVSI
  IA3: Low-grade endometrioid; limited to uterus AND ovary only
  IAm (POLEmut): POLE mutated; confined to corpus ± cervical extension
  IB:  Non-aggressive; ≥50% myometrial invasion; no/focal LVSI
  IC:  Aggressive histotype; no myometrial invasion
Stage II (cervical stromal OR substantial LVSI OR aggressive + myo invasion):
  IIA: Non-aggressive + cervical stromal invasion
  IIB: Non-aggressive + substantial LVSI (≥5 foci)
  IIC: Aggressive histotype + any myometrial invasion
  IICm (p53abn): p53 abnormal + any myometrial invasion + confined to corpus
Stage III (local/regional spread):
  IIIA1: Ovary or fallopian tube involvement (not meeting IA3)
  IIIA2: Uterine subserosa or serosal involvement
  IIIB1: Vaginal or parametrial spread
  IIIB2: Pelvic peritoneal metastasis
  IIIC1i / IIIC1ii: Pelvic node micro / macro metastasis
  IIIC2i / IIIC2ii: Para-aortic node micro / macro metastasis
Stage IV:
  IVA: Bladder or bowel mucosa invasion
  IVB: Abdominal peritoneal metastasis beyond pelvis
  IVC: Distant metastasis (lungs, liver, brain, bone, above-renal lymph nodes)

Aggressive histotypes (inherently high-grade): Carcinosarcoma, Serous carcinoma, Clear cell carcinoma, Undifferentiated carcinoma, Grade 3 endometrioid.
Non-aggressive: Low-grade endometrioid (Grade 1/2), Mucinous.

═══ SPECIMEN DIAGNOSIS FORMAT ═══
Pelvic lymph node NEGATIVE (0/5):
  "NEGATIVE FOR METASTATIC CARCINOMA (0/5 NODES EXAMINED)"

Pelvic lymph node POSITIVE (1/4):
  "METASTATIC ENDOMETRIAL CARCINOMA (1/4 NODES EXAMINED)\\nSIZE OF LARGEST DEPOSIT: X MM"

Para-aortic node NEGATIVE (0/3):
  "NEGATIVE FOR METASTATIC CARCINOMA (0/3 NODES EXAMINED)"

═══ RULES ═══
• NEVER invent findings. Use request_clarification when data is missing.
• After each answer, IMMEDIATELY call the appropriate tool(s) before replying.
• Specimen designations MUST be recorded verbatim — never shorten or paraphrase.
• For endometrioid FIGO Grade: only Grades 1–3 apply; all other histologic types are high-grade.
• Endocervical glandular involvement does NOT change pT from pT1 to pT2 — only cervical stromal invasion does.
• Keep replies concise. Announce the next block after confirming the current one.
• If the user provides bulk dictated data, extract all fields and call multiple tools in one turn.`;
