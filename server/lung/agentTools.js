/**
 * Agent tools for lung carcinoma resection reporting.
 * CAP Protocol: Lung.Resection v5.1.0.0 — AJCC 9th Edition
 */

import { computeStageGroup, RESECTION_CPT } from './caseModel.js';
import { suggestMipsMeasures, MIPS_MEASURES } from '../pathology/mipsBilling.js';

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const LUNG_TOOL_SCHEMAS = [
  {
    name: 'set_procedure',
    description: 'Set procedure type, treatment status, laterality, and lobe.',
    input_schema: {
      type: 'object',
      properties: {
        resectionType:   { type: 'string', enum: ['wedge', 'segmentectomy', 'lobectomy', 'completion_lobectomy', 'sleeve_lobectomy', 'bilobectomy', 'pneumonectomy'] },
        treatmentStatus: { type: 'string', enum: ['p', 'yp', 'r'], description: 'p = primary, yp = post-neoadjuvant, r = recurrence' },
        laterality:      { type: 'string', enum: ['left', 'right'] },
        lobe:            { type: 'string', enum: ['RUL', 'RML', 'RLL', 'LUL', 'LLL', 'main_bronchus', 'bilateral'], description: 'Lobe resected' },
      },
    },
  },
  {
    name: 'set_tumor',
    description: 'Set all tumor characteristics: histologic type/grade, sizes, pleural invasion, STAS, LVI, adjacent structures, treatment effect.',
    input_schema: {
      type: 'object',
      properties: {
        histologicType: {
          type: 'string',
          enum: ['adenocarcinoma', 'squamous_cell_carcinoma', 'large_cell_carcinoma', 'small_cell_carcinoma', 'pleomorphic_carcinoma', 'typical_carcinoid', 'atypical_carcinoid', 'squamous_cell_carcinoma_in_situ', 'other'],
        },
        histologicTypeOther: { type: 'string' },
        mucinous:    { type: 'boolean', description: 'Adenocarcinoma only: mucinous subtype?' },
        lepidic:     { type: 'boolean', description: 'Non-mucinous adenocarcinoma: lepidic component present?' },
        lepidic_predominant: { type: 'boolean', description: 'True if lepidic growth is the predominant pattern (≥50%)' },
        histologicPatterns: { type: 'string', description: 'e.g. "Acinar 60%, lepidic 30%, micropapillary 10%"' },
        histologicGrade: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'GX', 'not_applicable'] },
        invasiveSizeCm: { type: 'number', description: 'Invasive component size in cm (T-determining for non-mucinous adeno with lepidic; total size for others)' },
        totalSizeCm:    { type: 'number', description: 'Total tumor size including lepidic component (cm). Only required for non-mucinous adenocarcinoma with lepidic component.' },
        pleuralInvasion: { type: 'string', enum: ['PL0', 'PL1', 'PL2'] },
        stas: { type: 'string', enum: ['not_identified', 'present', 'cannot_be_determined', 'not_applicable'] },
        lvi:  { type: 'string', enum: ['not_identified', 'present', 'cannot_be_determined'] },
        lviSubtypes: { type: 'array', items: { type: 'string' }, description: 'When lvi=present: ["lymphatic"] and/or ["arterial"] and/or ["venous"]' },
        adjacentStructureInvasion: { type: 'boolean' },
        adjacentStructures: {
          type: 'array',
          items: { type: 'string' },
          description: 'T2a: hilar fat, main bronchus (≥2cm from carina), adjacent lobe. T3: parietal pleura, chest wall, superior sulcus, phrenic nerve, parietal pericardium, azygos vein. T4: mediastinum, heart, great vessels, trachea, carina, esophagus, vertebral body, diaphragm, recurrent laryngeal nerve.',
        },
        multifocal: { type: 'boolean' },
        multifocalNodules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              location:  { type: 'string', description: 'e.g. "RUL" or "RLL"' },
              sizeCm:    { type: 'number' },
              sameLobe:  { type: 'boolean', description: 'True if in same lobe as primary → T3; different lobe ipsilateral → T4' },
            },
          },
        },
        treatmentEffect: { type: 'string', description: 'e.g. "No known presurgical therapy", "Radiation therapy effect present", "Hormonal therapy effect present", or describe % viable tumor' },
      },
    },
  },
  {
    name: 'set_margins',
    description: 'Set margin status for the resection specimen.',
    input_schema: {
      type: 'object',
      properties: {
        invasiveStatus:   { type: 'string', enum: ['all_negative', 'involved'] },
        involvedMargins:  { type: 'array', items: { type: 'string' }, description: 'e.g. ["bronchial", "vascular", "parenchymal"]' },
        closestMargin:    { type: 'string', description: 'Name of closest negative margin, e.g. "bronchial"' },
        closestDistanceCm: { type: 'number', description: 'Distance to closest negative margin in cm' },
        nonInvasiveStatus: { type: 'string', enum: ['all_negative', 'cis_bronchial', 'lepidic_parenchymal', 'not_applicable'] },
      },
    },
  },
  {
    name: 'set_nodes',
    description: 'Set regional lymph node findings.',
    input_schema: {
      type: 'object',
      properties: {
        pnCategory:       { type: 'string', enum: ['NX', 'N0', 'N1', 'N2a', 'N2b', 'N3'], description: 'AJCC 9th edition pN category (without p prefix — agent determines this)' },
        positiveStations: { type: 'array', items: { type: 'string' }, description: 'IASLC stations with tumor, e.g. ["Station 4R", "Station 7"]' },
        examinedStations: { type: 'array', items: { type: 'string' }, description: 'All IASLC stations examined, e.g. ["Station 4R", "Station 7", "Station 10R", "Station 11R"]' },
        nodesPositive:    { type: 'number' },
        nodesExamined:    { type: 'number' },
        extranodalExtension: { type: 'string', enum: ['not_identified', 'present', 'cannot_be_determined'] },
        largestDepositMm: { type: 'number' },
      },
    },
  },
  {
    name: 'set_metastasis',
    description: 'Set distant metastasis findings (pM category). Only call if metastasis is present.',
    input_schema: {
      type: 'object',
      properties: {
        pmCategory: { type: 'string', enum: ['M1a', 'M1b', 'M1c1', 'M1c2'], description: 'M1a: contralateral nodule/pleural/pericardial nodules/malignant effusion. M1b: single extrathoracic met. M1c1: multiple mets same organ. M1c2: multiple mets different organs.' },
        sites: { type: 'array', items: { type: 'string' }, description: 'Descriptions of involved sites' },
      },
    },
  },
  {
    name: 'set_stage',
    description: 'Set the computed pT, pN, pM categories and stage group. Call after all tumor, node, and metastasis data is collected. The stage group is auto-computed from pT + pN + pM.',
    input_schema: {
      type: 'object',
      required: ['ptCategory', 'pnCategory'],
      properties: {
        ptCategory:  { type: 'string', enum: ['pTis', 'pT1mi', 'pT1a', 'pT1b', 'pT1c', 'pT2a', 'pT2b', 'pT3', 'pT4'] },
        pnCategory:  { type: 'string', enum: ['pNX', 'pN0', 'pN1', 'pN2a', 'pN2b', 'pN3'] },
        pmCategory:  { type: 'string', enum: ['pM0', 'pM1a', 'pM1b', 'pM1c1', 'pM1c2', 'not_applicable'], description: 'Use pM0 when no distant metastasis' },
        yPrefix:     { type: 'boolean', description: 'True for post-neoadjuvant (yp) staging' },
        rPrefix:     { type: 'boolean', description: 'True for recurrence (r) staging' },
        ptRationale: { type: 'string', description: 'Brief rationale, e.g. "Invasive size 2.3 cm, no pleural invasion or T2a qualifiers"' },
        pnRationale: { type: 'string', description: 'Brief rationale, e.g. "1 of 12 nodes positive: station 10R (ipsilateral hilar)"' },
      },
    },
  },
  {
    name: 'set_additional_findings',
    description: 'Set additional pathologic findings.',
    input_schema: {
      type: 'object',
      properties: {
        additionalFindings: { type: 'array', items: { type: 'string' }, description: 'e.g. ["Atypical adenomatous hyperplasia", "Emphysema", "Fibrosis"]' },
        caseComment: { type: 'string' },
      },
    },
  },
  {
    name: 'set_special_studies',
    description: 'Set molecular testing and IHC information.',
    input_schema: {
      type: 'object',
      properties: {
        molecularPending: { type: 'boolean' },
        molecularMarkers: { type: 'array', items: { type: 'string' }, description: 'e.g. ["PD-L1", "EGFR", "ALK", "ROS1", "KRAS", "MET", "RET", "BRAF", "NTRK"]' },
        ihcPerformed:     { type: 'boolean' },
        ihcDescription:   { type: 'string' },
      },
    },
  },
  {
    name: 'set_mips_code',
    description: 'Record the confirmed MIPS quality code for this case.',
    input_schema: {
      type: 'object',
      required: ['measureNumber', 'code'],
      properties: {
        measureNumber: { type: 'string' },
        code:          { type: 'string' },
        codeLabel:     { type: 'string' },
      },
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble and finalize the lung carcinoma report.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeLungTool(name, args, caseData) {
  const c = JSON.parse(JSON.stringify(caseData));

  switch (name) {

    case 'set_procedure': {
      if (args.resectionType   != null) { c.resectionType   = args.resectionType;   c.cpt = RESECTION_CPT[args.resectionType] || '88309'; }
      if (args.treatmentStatus != null)   c.treatmentStatus = args.treatmentStatus;
      if (args.laterality      != null)   c.laterality      = args.laterality;
      if (args.lobe            != null)   c.lobe            = args.lobe;
      return { case: c, result: { ok: true, cpt: c.cpt } };
    }

    case 'set_tumor': {
      const fields = ['histologicType','histologicTypeOther','mucinous','lepidic','lepidic_predominant',
                      'histologicPatterns','histologicGrade','invasiveSizeCm','totalSizeCm',
                      'pleuralInvasion','stas','lvi','lviSubtypes','adjacentStructureInvasion',
                      'adjacentStructures','multifocal','multifocalNodules','treatmentEffect'];
      for (const f of fields) { if (args[f] != null) c[f] = args[f]; }
      return { case: c, result: { ok: true } };
    }

    case 'set_margins': {
      c.margins = c.margins || {};
      const fields = ['invasiveStatus','involvedMargins','closestMargin','closestDistanceCm','nonInvasiveStatus'];
      for (const f of fields) { if (args[f] != null) c.margins[f] = args[f]; }
      return { case: c, result: { ok: true } };
    }

    case 'set_nodes': {
      c.nodes = c.nodes || {};
      const fields = ['pnCategory','positiveStations','examinedStations','nodesPositive','nodesExamined','extranodalExtension','largestDepositMm'];
      for (const f of fields) { if (args[f] != null) c.nodes[f] = args[f]; }
      return { case: c, result: { ok: true } };
    }

    case 'set_metastasis': {
      c.metastasis = c.metastasis || {};
      if (args.pmCategory != null) c.metastasis.pmCategory = args.pmCategory;
      if (args.sites      != null) c.metastasis.sites      = args.sites;
      return { case: c, result: { ok: true } };
    }

    case 'set_stage': {
      c.stage = c.stage || {};
      if (args.ptCategory  != null) c.stage.ptCategory  = args.ptCategory;
      if (args.pnCategory  != null) c.stage.pnCategory  = args.pnCategory;
      if (args.pmCategory  != null) c.stage.pmCategory  = args.pmCategory;
      if (args.yPrefix     != null) c.stage.yPrefix     = args.yPrefix;
      if (args.rPrefix     != null) c.stage.rPrefix     = args.rPrefix;
      if (args.ptRationale != null) c.stage.ptRationale = args.ptRationale;
      if (args.pnRationale != null) c.stage.pnRationale = args.pnRationale;

      // Auto-compute stage group
      const pm = args.pmCategory === 'pM0' || args.pmCategory === 'not_applicable'
        ? null : args.pmCategory;
      c.stage.stageGroup = computeStageGroup(args.ptCategory, args.pnCategory, pm);

      // Check MIPS
      const mipsSuggestions = buildMipsSuggestions(c);
      return { case: c, result: { ok: true, stageGroup: c.stage.stageGroup, mipsSuggestions } };
    }

    case 'set_additional_findings': {
      if (args.additionalFindings != null) c.additionalFindings = args.additionalFindings;
      if (args.caseComment        != null) c.caseComment        = args.caseComment;
      return { case: c, result: { ok: true } };
    }

    case 'set_special_studies': {
      c.specialStudies = c.specialStudies || {};
      const fields = ['molecularPending','molecularMarkers','ihcPerformed','ihcDescription'];
      for (const f of fields) { if (args[f] != null) c.specialStudies[f] = args[f]; }
      return { case: c, result: { ok: true } };
    }

    case 'set_mips_code': {
      const existing = (c.mips || []).filter(m => m.measureNumber !== args.measureNumber);
      c.mips = [...existing, { measureNumber: args.measureNumber, code: args.code, codeLabel: args.codeLabel || '' }];
      return { case: c, result: { ok: true } };
    }

    case 'assemble_report': {
      return { case: c, result: { assembled: true } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── MIPS helper ───────────────────────────────────────────────────────────────

function buildMipsSuggestions(c) {
  const cpt = c.cpt || RESECTION_CPT[c.resectionType] || '88309';
  const type = c.histologicType || '';
  const isNSCLC = !['small_cell_carcinoma', 'typical_carcinoid', 'atypical_carcinoid'].includes(type);

  if (cpt !== '88309' || !isNSCLC) {
    return [{ measureNumber: 'NONE', note: cpt === '88307' ? 'Wedge/segmentectomy (88307) is explicitly exempt from MIPS Measure #396.' : 'Small cell/carcinoid: use G9423 (exception) or G9424 (exclusion) for Measure #396.' }];
  }

  // Measure #396 applies
  const m = MIPS_MEASURES['396'];
  return [{
    measureNumber: '396',
    title: m.title,
    defaultCode: 'G9418',
    defaultCodeLabel: m.codes.met.label,
    allCodes: m.codes,
  }];
}

// ── System prompt ─────────────────────────────────────────────────────────────

export const LUNG_SYSTEM_PROMPT = `You are an expert thoracic pathology reporting assistant specializing in lung carcinoma resection reporting. You follow CAP Protocol Lung.Resection v5.1.0.0 and AJCC 9th Edition staging.

## WORKFLOW:

### 1. Procedure
Ask: procedure type, laterality, lobe resected, treatment status (primary/post-neoadjuvant/recurrence).
Call set_procedure.

### 2. Histologic Type and Grade
Ask for histologic type. Key types:
- Adenocarcinoma (most common) — ask: mucinous? If non-mucinous: lepidic component? If lepidic: is it the predominant pattern (≥50%)?
- Squamous cell carcinoma
- Large cell carcinoma
- Small cell carcinoma
- Pleomorphic carcinoma
- Typical / Atypical carcinoid
- Squamous cell carcinoma in situ (SCIS)

Ask for histologic grade (G1/G2/G3/G4). Not applicable for small cell, carcinoids.
Ask for histologic patterns if applicable (e.g. "acinar 60%, lepidic 40%").

### 3. Tumor Size
**Critical AJCC 9th rule:** For non-mucinous adenocarcinoma WITH a lepidic component:
- Use the INVASIVE component size for pT staging (not total size)
- Ask for BOTH invasive size AND total tumor size

For all other histologic types:
- Ask for the single tumor size (total invasive size)

### 4. Invasion and Spread
Ask about:
a) **Visceral pleural invasion:**
   - PL0: tumor within parenchyma, elastic layer intact
   - PL1: invasion beyond elastic layer, not reaching pleural surface
   - PL2: tumor at or beyond the pleural surface
   → PL1/PL2 both upgrade to at least pT2a regardless of size

b) **STAS** (Spread Through Air Spaces): present / not identified / cannot be determined

c) **LVI** (Lymphovascular invasion): present / not identified / cannot be determined
   If present: ask subtypes — lymphatic? arterial? venous?

d) **Adjacent structure invasion** (if applicable): ask which structures are invaded.
   Structures by T tier:
   - T2a: hilar fat, main bronchus (≥2 cm from carina), adjacent lobe, atelectasis to hilum
   - T3: parietal pleura, chest wall, superior sulcus, phrenic nerve, parietal pericardium, azygos vein
   - T4: mediastinum, heart, great vessels, aorta, SVC/IVC, trachea, carina, esophagus, vertebral body, diaphragm, recurrent laryngeal nerve, brachial plexus

e) **Multifocal tumors** (if present): for each additional nodule: location, size, same lobe?
   → Same lobe satellite: T3. Different lobe ipsilateral: T4.

f) **Treatment effect** (if yp): describe residual tumor, necrosis, etc.

### 5. Margins
Ask: all margins negative or involved?
- If negative: closest margin type and distance (cm)
- If involved: which margin(s)? bronchial / vascular / parenchymal / other
- Non-invasive tumor margins (CIS at bronchial, lepidic at parenchymal)

### 6. Lymph Nodes
Ask:
- Number of nodes examined and positive
- IASLC station(s) where nodes are positive (stations 1–14)
- Extranodal extension?

**pN rules (AJCC 9th):**
- pNX: no nodes submitted
- pN0: all nodes negative
- pN1: positive ipsilateral peribronchial/hilar/intrapulmonary nodes (stations 10–14)
- pN2a: single ipsilateral/central mediastinal station (stations 1–9)
- pN2b: multiple ipsilateral/central mediastinal stations
- pN3: contralateral nodes or scalene/supraclavicular nodes (station 1R, 1L)

Call set_nodes with the pN determination.

### 7. Metastasis
Ask: any distant metastasis?
- M1a: contralateral lung nodule, pleural/pericardial nodules, malignant pleural/pericardial effusion
- M1b: single extrathoracic metastasis
- M1c1: multiple extrathoracic metastases, single organ
- M1c2: multiple extrathoracic metastases, multiple organs

Call set_metastasis only if M1 is present.

### 8. Compute Stage
After collecting all data, determine pT, pN, pM:

**pT RULES (AJCC 9th):**
- pTis: SCIS; OR mucinous adeno ≤3 cm all lepidic; OR non-mucinous lepidic adeno with NO invasion
- pT1mi: non-mucinous lepidic-predominant ≤3 cm total + invasive focus >0 and ≤0.5 cm
- pT1a: invasive ≤1 cm; OR superficial-spreading bronchial wall
- pT1b: invasive >1–2 cm
- pT1c: invasive >2–3 cm
- pT2a: invasive >3–4 cm; OR PL1/PL2; OR hilar fat/main bronchus/adjacent lobe/atelectasis to hilum
- pT2b: invasive >4–5 cm
- pT3: invasive >5–7 cm; OR same-lobe satellite nodule; OR T3 structure invasion
- pT4: invasive >7 cm; OR different-lobe ipsilateral nodule; OR T4 structure invasion

Note: Size qualifiers for pT2a apply independently — even a 1 cm tumor is pT2a if PL1/PL2 is present.

Announce the computed stage group to the pathologist for confirmation, then call set_stage.

### 9. Additional Findings
Ask about additional pathologic findings (atypical adenomatous hyperplasia, emphysema, fibrosis, etc.).

### 10. Special Studies
Ask:
- "Are molecular studies being ordered?" → which markers? (PD-L1, EGFR, ALK, ROS1, KRAS, MET, RET, BRAF, NTRK)
- "Was IHC performed?" → describe results

Call set_special_studies.

### 11. MIPS Quality Measures
After set_stage, check the mipsSuggestions in the result:

**Measure #396 — Lung Cancer Resection** (applies to 88309 + primary NSCLC):
- Ask: "Is the pT category AND pN category documented, along with the histologic type?"
  • All three present → G9418 (Performance Met) → call set_mips_code
  • Missing pT/pN or histologic type, no reason → G9422 (Not Met)
  • Medical reason (metastatic, carcinoid, inadequate specimen, no residual carcinoma) → G9423
  • Not primary NSCLC, small cell, or non-lung site → G9424 (Exclusion)
- Wedge/segmentectomy (88307): "No MIPS required — wedge/segmentectomy (CPT 88307) is explicitly exempt from Measure #396."
- Small cell / carcinoid: "Measure #396 exclusion applies — use G9424."

### 12. Finalize
Call assemble_report.
Present the report. Summarize key findings in one sentence.
`;
