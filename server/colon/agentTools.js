import { createEmptyColonCase, computeColonPT, computeColonPN } from './caseModel.js';

export const COLON_TOOL_SCHEMAS = [
  {
    name: 'set_specimen',
    description: 'Set the primary resection specimen procedure and optional mesorectum evaluation (rectal cases only). CPT auto-set to 88309. procedure options: "Right hemicolectomy" | "Transverse colectomy" | "Left hemicolectomy" | "Sigmoidectomy" | "Low anterior resection" | "Total abdominal colectomy" | "Abdominoperineal resection" | "Other (specify)". mesorectumEval options: "Complete" | "Near complete" | "Incomplete" | "Cannot be determined" | "Not applicable".',
    input_schema: {
      type: 'object',
      properties: {
        receivedDate: { type: 'string' },
        signoutDate: { type: 'string' },
        procedure: { type: 'string' },
        procedureOther: { type: 'string' },
        mesorectumEval: { type: 'string' },
        specimenDesignation: { type: 'string', description: 'Primary specimen letter, default "A"' },
      },
      required: [],
    },
  },
  {
    name: 'set_tumor',
    description: 'Set tumor characteristics. Calling this auto-computes pT from tumorExtent and updates cap.stage.ptCategory. site: array of anatomic locations (e.g. ["Cecum"], ["Sigmoid colon"], ["Rectum"]). tumorExtent drives pT: "Invades lamina propria / muscularis mucosae (intramucosal carcinoma)"→pTis, "Invades submucosa"→pT1, "Invades into muscularis propria"→pT2, "Invades through muscularis propria into the pericolic or perirectal tissue"→pT3, "Invades visceral peritoneum"→pT4a, "Directly invades or adheres to adjacent structure(s)"→pT4b. lvi: array of LVI types (e.g. ["Small vessel"], ["Large vessel (venous), extramural"]). polyp: type of polyp in which carcinoma arose ("None identified" | "Tubular adenoma" | "Villous adenoma" | "Tubulovillous adenoma" | "Traditional serrated adenoma" | "Sessile serrated adenoma / sessile serrated polyp"). tumorBudding: "Low (0-4)" | "Intermediate (5-9)" | "High (10 or more)". treatmentEffect: "No known presurgical therapy" | score 0-3 description.',
    input_schema: {
      type: 'object',
      properties: {
        site: { type: 'array', items: { type: 'string' } },
        rectalLocation: { type: 'string' },
        histologicType: { type: 'string' },
        histologicGrade: { type: 'string' },
        sizeCm: { type: 'number' },
        tumorExtent: { type: 'string' },
        perforation: { type: 'string' },
        lvi: { type: 'array', items: { type: 'string' } },
        pni: { type: 'string' },
        tumorBudding: { type: 'string' },
        polyp: { type: 'string' },
        treatmentEffect: { type: 'string' },
        tumorComment: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'set_margins',
    description: 'Set margin status. invasiveStatus: "All margins negative for invasive carcinoma" | "Invasive carcinoma present at margin" | "Cannot be determined". If negative: closestMargins (array of names e.g. ["Proximal","Distal","Mesenteric"]) and closestDistanceCm. If positive: involvedMargins array. nonInvasiveStatus for dysplasia. Margin names: Proximal, Distal, Radial (circumferential), Mesenteric, Deep, Mucosal. radialMarginCm and distalMarginCm required only for rectal tumors.',
    input_schema: {
      type: 'object',
      properties: {
        invasiveStatus: { type: 'string' },
        closestMargins: { type: 'array', items: { type: 'string' } },
        closestDistanceCm: { type: 'number' },
        involvedMargins: { type: 'array', items: { type: 'string' } },
        nonInvasiveStatus: { type: 'string' },
        nonInvasiveInvolvedMargins: { type: 'array', items: { type: 'string' } },
        radialMarginCm: { type: 'number' },
        distalMarginCm: { type: 'number' },
        marginComment: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'set_lymph_nodes',
    description: 'Set lymph node status and counts. Auto-computes pN: 0→pN0; deposits only→pN1c; 1→pN1a; 2-3→pN1b; 4-6→pN2a; 7+→pN2b. status: "Not applicable" | "All regional lymph nodes negative for tumor" | "Tumor present in regional lymph node(s)". tumorDeposits: "Not identified" | "Present". Set tumorDepositCount if present.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        nodesPositive: { type: 'number' },
        nodesExamined: { type: 'number' },
        tumorDeposits: { type: 'string' },
        tumorDepositCount: { type: 'number' },
        nodeComment: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'set_stage',
    description: 'Override or set pTNM stage. ptCategory: pT0 | pTis | pT1 | pT2 | pT3 | pT4a | pT4b. pnCategory: pN0 | pN1a | pN1b | pN1c | pN2a | pN2b. pmCategory: "Not applicable" | pM1a | pM1b | pM1c. yPrefix true for post-neoadjuvant. mModifier true for synchronous primary tumors.',
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
      required: [],
    },
  },
  {
    name: 'set_special_studies',
    description: 'Set MMR immunohistochemistry and molecular studies. mmrResult options: "Intact (proficient MMR — MLH1, PMS2, MSH2, MSH6 retained)" | "Loss of MLH1 and PMS2" | "Loss of MSH2 and MSH6" | "Loss of MSH6 alone" | "Loss of PMS2 alone" | "Loss of MLH1 alone" | "Other loss (specify)". molecularMarkers: array of completed studies (e.g. ["KRAS wild-type","BRAF V600E mutant"]). Set mmrPending true if ordered but not resulted. Set molecularPending true if molecular panel pending.',
    input_schema: {
      type: 'object',
      properties: {
        mmrPerformed: { type: 'boolean' },
        mmrResult: { type: 'string' },
        mmrPending: { type: 'boolean' },
        molecularPending: { type: 'boolean' },
        molecularMarkers: { type: 'array', items: { type: 'string' } },
      },
      required: [],
    },
  },
  {
    name: 'set_additional_findings',
    description: 'Set additional findings (select all that apply). findings: array from ["None identified","Adenoma(s)","Ulcerative colitis","Crohn disease","Diverticulosis","Dysplasia arising in inflammatory bowel disease","Other (specify)"].',
    input_schema: {
      type: 'object',
      properties: {
        findings: { type: 'array', items: { type: 'string' } },
      },
      required: ['findings'],
    },
  },
  {
    name: 'set_case_comment',
    description: 'Set the free-text case comment that appears after the final diagnosis.',
    input_schema: {
      type: 'object',
      properties: { comment: { type: 'string' } },
      required: ['comment'],
    },
  },
  {
    name: 'add_secondary_specimen',
    description: 'Add or update a secondary specimen (B, C, D…). CPT auto-suggested: lymph node→88307; omentum/peritoneum/liver biopsy→88305; frozen section→88331+88332 add-on; small bowel/other major resection→88309. Set verbatim diagnosis in UPPERCASE.',
    input_schema: {
      type: 'object',
      properties: {
        letter: { type: 'string' },
        designation: { type: 'string' },
        diagnosis: { type: 'string' },
        cpt: { type: 'string' },
        cptAddons: { type: 'array', items: { type: 'string' } },
      },
      required: ['letter', 'designation', 'diagnosis'],
    },
  },
  {
    name: 'assemble_report',
    description: 'Finalize and assemble the complete pathology report. Call this after all data is collected.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

export const COLON_SYSTEM_PROMPT = `You are an expert GI pathology assistant specializing in colorectal carcinoma reports following CAP protocol v4.4.0.1 (AJCC 8th Edition).

Collect data block by block. Ask one block at a time, wait for the answer, then set fields and move to the next block.

BLOCK 1 — SPECIMEN & DATES
• Date received, sign-out date
• Procedure: Right hemicolectomy / Transverse colectomy / Left hemicolectomy / Sigmoidectomy / Low anterior resection / Total abdominal colectomy / Abdominoperineal resection / Other
• For rectal resections (LAR, APR): Macroscopic evaluation of mesorectum (Complete / Near complete / Incomplete)
• Primary specimen designation (usually A) + CPT 88309
• Any secondary specimens (lymph nodes→88307; biopsies→88305; note frozen sections)
Tools: set_specimen, add_secondary_specimen

BLOCK 2 — TUMOR CHARACTERISTICS
• Tumor site (select all that apply): Cecum / Ascending colon / Hepatic flexure / Transverse colon / Splenic flexure / Descending colon / Sigmoid colon / Rectosigmoid / Rectum
• For rectal tumors: Location relative to anterior peritoneal reflection
• Histologic type: Adenocarcinoma (default) / Mucinous adenocarcinoma (>50% mucin) / Poorly cohesive carcinoma / Signet-ring cell carcinoma / Medullary carcinoma / Serrated adenocarcinoma / other
• Histologic grade: G1 well-differentiated / G2 moderately differentiated / G3 poorly differentiated / G4 undifferentiated
• Tumor size: greatest dimension in cm
• Tumor extent (determines pT — select ONE):
  - Invades lamina propria / muscularis mucosae (intramucosal carcinoma) → pTis
  - Invades submucosa → pT1
  - Invades into muscularis propria → pT2
  - Invades through muscularis propria into the pericolic or perirectal tissue → pT3
  - Invades visceral peritoneum → pT4a
  - Directly invades or adheres to adjacent structure(s) → pT4b
• Macroscopic tumor perforation: Not identified / Present
• LVI (select all that apply): Not identified / Small vessel / Large vessel (venous) intramural / Large vessel (venous) extramural
• Perineural invasion: Not identified / Present
• Tumor budding: Low (0-4) / Intermediate (5-9) / High (10 or more)
• Type of polyp in which carcinoma arose (optional): None identified / Tubular adenoma / Villous adenoma / Tubulovillous adenoma / Sessile serrated adenoma / Traditional serrated adenoma
• Treatment effect (if post-neoadjuvant): No known presurgical therapy / Score 0 (complete) / Score 1 (near complete) / Score 2 (partial) / Score 3 (poor/no response)
Tools: set_tumor (auto-computes pT)

BLOCK 3 — MARGINS
• Margin status for invasive carcinoma:
  - All margins negative → which are the closest margins (Proximal / Distal / Radial / Mesenteric / Deep / Mucosal) + distance in cm
  - Positive → which margins involved (Proximal / Distal / Radial / Mesenteric / Deep)
  - For rectal tumors: radial (circumferential) margin distance cm; distal margin distance cm
• Margin status for non-invasive tumor (high-grade dysplasia / low-grade dysplasia)
Tools: set_margins

BLOCK 4 — LYMPH NODES & TUMOR DEPOSITS
• Were regional lymph nodes submitted? (Yes / Not applicable)
• If yes: number positive, total examined — pN auto-computes:
  - 0 positive → pN0; tumor deposits only → pN1c
  - 1 positive → pN1a; 2-3 → pN1b; 4-6 → pN2a; 7+ → pN2b
• Tumor deposits: Not identified / Present — if present, count
• For lymph node specimens (B, C…): use add_secondary_specimen with diagnosis in UPPERCASE
Tools: set_lymph_nodes, add_secondary_specimen

BLOCK 5 — DISTANT METASTASIS (if applicable)
• pM: Not applicable (default) / pM1a (one site) / pM1b (two or more sites) / pM1c (peritoneal)
• If pM confirmed pathologically, note the site
Tools: set_stage (pmCategory)

BLOCK 6 — SPECIAL STUDIES
• MMR immunohistochemistry: performed / pending / not performed
  - If performed: intact (proficient MMR) vs specific protein loss
• Molecular studies: KRAS/RAS/BRAF pending or resulted
Tools: set_special_studies

BLOCK 7 — ADDITIONAL FINDINGS & COMMENT
• Additional findings: None / Adenoma(s) / Ulcerative colitis / Crohn disease / Diverticulosis / Dysplasia in IBD
• Case comment (free text)
Tools: set_additional_findings, set_case_comment

BLOCK 8 — ASSEMBLE REPORT
• Review collected data, confirm stage (pT + pN + pM)
• Call assemble_report to generate the final report
Tool: assemble_report

CPT BILLING REFERENCE
• 88309: Colectomy (right, left, sigmoid, total, LAR, APR) — primary specimen
• 88307: Regional lymph nodes excised separately; separate lymph node specimens
• 88305: Omentum, peritoneal, liver, or other small biopsy
• 88331: Frozen section — first site; 88332: each additional (same specimen)

FINAL DIAGNOSIS FORMAT
Primary line: [HISTOLOGIC TYPE] INVADING [EXTENT PHRASE] ARISING IN THE [POLYP TYPE] AND MEASURING [X] CM.
(omit "ARISING IN THE [POLYP]" if no polyp documented; omit "AND MEASURING" if size unknown)
Bullet lines:
- ALL RESECTION MARGINS ([MARGIN LIST]) NEGATIVE FOR CARCINOMA & DYSPLASIA.   OR:  [MARGIN] MARGIN POSITIVE FOR INVASIVE CARCINOMA.
- [WORD(X)] OUT OF [WORD(Y)] LYMPH NODES POSITIVE FOR CARCINOMA (X/Y).   OR:  ALL [WORD(Y)] LYMPH NODES NEGATIVE FOR CARCINOMA (0/Y).
- SEE CASE SUMMARY FOR TUMOR CHARACTERISTICS.
- PENDING FOR MMR IMMUNOHISTOCHEMISTRY.  (if mmrPending)
- PENDING FOR MOLECULAR STUDIES.  (if molecularPending)`;

export async function executeColonTool(toolName, toolInput, caseData) {
  const cap = caseData.cap;

  switch (toolName) {
    case 'set_specimen': {
      if (toolInput.receivedDate != null) caseData.receivedDate = toolInput.receivedDate;
      if (toolInput.signoutDate != null) caseData.signoutDate = toolInput.signoutDate;
      if (toolInput.procedure != null) cap.specimen.procedure = toolInput.procedure;
      if (toolInput.procedureOther != null) cap.specimen.procedureOther = toolInput.procedureOther;
      if (toolInput.mesorectumEval != null) cap.specimen.mesorectumEval = toolInput.mesorectumEval;
      // Ensure primary specimen exists
      const letter = (toolInput.specimenDesignation || 'A').toUpperCase();
      const existing = caseData.specimens.find(s => s.letter === letter);
      if (!existing) {
        const proc = toolInput.procedure || cap.specimen.procedure || 'Colectomy';
        caseData.specimens.push({ letter, designation: proc, cpt: '88309', cptAddons: [] });
      } else {
        existing.cpt = '88309';
      }
      return { ok: true, updated: 'specimen' };
    }

    case 'set_tumor': {
      const t = cap.tumor;
      const fields = ['site','rectalLocation','histologicType','histologicGrade','sizeCm','tumorExtent',
                      'perforation','lvi','pni','tumorBudding','polyp','treatmentEffect','tumorComment'];
      for (const f of fields) {
        if (toolInput[f] != null) t[f] = toolInput[f];
      }
      // Auto-compute pT
      const pt = computeColonPT(t.tumorExtent);
      if (pt) cap.stage.ptCategory = pt;
      return { ok: true, updated: 'tumor', ptCategory: cap.stage.ptCategory };
    }

    case 'set_margins': {
      const m = cap.margins;
      const fields = ['invasiveStatus','closestMargins','closestDistanceCm','involvedMargins',
                      'nonInvasiveStatus','nonInvasiveInvolvedMargins','radialMarginCm','distalMarginCm','marginComment'];
      for (const f of fields) {
        if (toolInput[f] != null) m[f] = toolInput[f];
      }
      return { ok: true, updated: 'margins' };
    }

    case 'set_lymph_nodes': {
      const n = cap.nodes;
      const fields = ['status','nodesPositive','nodesExamined','tumorDeposits','tumorDepositCount','nodeComment'];
      for (const f of fields) {
        if (toolInput[f] != null) n[f] = toolInput[f];
      }
      // Auto-compute pN
      const pn = computeColonPN(n.nodesPositive, n.tumorDeposits, n.nodesExamined);
      if (pn) cap.stage.pnCategory = pn;
      return { ok: true, updated: 'nodes', pnCategory: cap.stage.pnCategory };
    }

    case 'set_stage': {
      const s = cap.stage;
      const fields = ['ptCategory','pnCategory','pmCategory','yPrefix','rPrefix','mModifier'];
      for (const f of fields) {
        if (toolInput[f] != null) s[f] = toolInput[f];
      }
      return { ok: true, updated: 'stage', stage: cap.stage };
    }

    case 'set_special_studies': {
      const ss = cap.specialStudies;
      const fields = ['mmrPerformed','mmrResult','mmrPending','molecularPending','molecularMarkers'];
      for (const f of fields) {
        if (toolInput[f] != null) ss[f] = toolInput[f];
      }
      return { ok: true, updated: 'specialStudies' };
    }

    case 'set_additional_findings': {
      if (toolInput.findings != null) cap.additionalFindings = toolInput.findings;
      return { ok: true, updated: 'additionalFindings' };
    }

    case 'set_case_comment': {
      caseData.caseComment = toolInput.comment || '';
      return { ok: true };
    }

    case 'add_secondary_specimen': {
      const letter = (toolInput.letter || '').toUpperCase();
      const existing = caseData.specimens.find(s => s.letter === letter);
      const spec = {
        letter,
        designation: toolInput.designation || '',
        diagnosis: toolInput.diagnosis || '',
        cpt: toolInput.cpt || detectSecondaryCpt(toolInput.designation),
        cptAddons: toolInput.cptAddons || [],
      };
      if (existing) {
        Object.assign(existing, spec);
      } else {
        caseData.specimens.push(spec);
        caseData.specimens.sort((a, b) => a.letter.localeCompare(b.letter));
      }
      return { ok: true, updated: `specimen ${letter}` };
    }

    case 'assemble_report':
      return { ok: true, action: 'assemble' };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

function detectSecondaryCpt(designation) {
  if (!designation) return '88305';
  const d = designation.toLowerCase();
  if (/frozen|intraop/i.test(d)) return '88331';
  if (/lymph\s*node|sentinel/i.test(d)) return '88307';
  if (/omentum|periton|liver|gallbladder|spleen|appendix/i.test(d)) return '88305';
  return '88305';
}
