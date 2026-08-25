import { createEmptyKidneyCase, computeKidneyPT, setAtPathKidney } from './caseModel.js';
import { assembleKidneyReport } from './reportAssembler.js';

export const KIDNEY_SYSTEM_PROMPT = `You are a pathology assistant helping a pathologist complete a kidney renal cell carcinoma nephrectomy report (AJCC 8th Edition, WHO 5th Edition).

Workflow:
1. Call set_specimen to record procedure and laterality.
2. Call set_tumor with histologic type, WHO/ISUP grade, tumor size, focality, extent, and features.
3. Call set_margins with margin status.
4. Call set_lymph_nodes if nodes are submitted.
5. Call set_stage — or omit if pT/pN can be auto-computed (you may let auto-compute run).
6. Call add_secondary_specimen for each separately submitted specimen (lymph nodes, etc.).
7. Call assemble_report when all data is collected.

Key rules:
- Histologic type must use exact WHO 5th Ed terminology (e.g., "Clear cell renal cell carcinoma", "Papillary renal cell carcinoma").
- WHO/ISUP grading applies to clear cell and papillary RCC. Mark "Not applicable" for chromophobe, collecting duct, SMARCB1-deficient medullary carcinoma.
- Tumor extent is multi-select: always ask about renal sinus, perinephric fat, renal vein, IVC, and adrenal involvement.
- Rhabdoid and sarcomatoid features are reported separately; both escalate to G4.
- Necrosis is an independent prognostic factor — always record presence/absence.
- pT auto-computes from extent + size; only call set_stage if you need to override or add prefix/suffix.
- pM1 applies when adrenal is involved non-contiguously (separate nodule).`;

export const KIDNEY_TOOL_SCHEMAS = [
  {
    name: 'set_specimen',
    description: 'Set procedure type and laterality',
    input_schema: {
      type: 'object',
      properties: {
        procedure: { type: 'string', enum: ['Partial nephrectomy', 'Total (simple) nephrectomy', 'Radical nephrectomy', 'Other', 'Not specified'] },
        procedureOther: { type: 'string' },
        laterality: { type: 'string', enum: ['Right', 'Left', 'Not specified'] },
      },
      required: ['procedure'],
    },
  },
  {
    name: 'set_tumor',
    description: 'Set tumor characteristics: histologic type, grade, size, focality, extent, and special features',
    input_schema: {
      type: 'object',
      properties: {
        focality: { type: 'string', enum: ['Unifocal', 'Multifocal'] },
        multifocalCount: { type: 'number' },
        site: { type: 'array', items: { type: 'string', enum: ['Upper pole', 'Middle', 'Lower pole', 'Other', 'Not specified'] } },
        siteOther: { type: 'string' },
        sizeCm: { type: 'number', description: 'Greatest dimension in cm' },
        otherSizesCm: { type: 'array', items: { type: 'number' }, description: 'Sizes of additional tumors in multifocal cases' },
        histologicType: {
          type: 'string',
          description: 'Use exact WHO 5th Ed terminology',
          enum: [
            'Clear cell renal cell carcinoma',
            'Multilocular cystic renal neoplasm of low malignant potential',
            'Papillary renal cell carcinoma',
            'Chromophobe renal cell carcinoma',
            'Other oncocytic tumors of the kidney',
            'Collecting duct carcinoma',
            'Clear cell papillary renal cell tumor',
            'Mucinous tubular and spindle cell renal cell carcinoma',
            'Tubulocystic renal cell carcinoma',
            'Acquired cystic disease-associated renal cell carcinoma',
            'Eosinophilic solid and cystic renal cell carcinoma',
            'Renal cell carcinoma, NOS',
            'TFE3-rearranged renal cell carcinoma',
            'TFEB-altered renal cell carcinoma',
            'ELOC-mutated renal cell carcinoma',
            'Fumarate hydratase-deficient renal cell carcinoma',
            'Succinate dehydrogenase-deficient renal cell carcinoma',
            'ALK-rearranged renal cell carcinoma',
            'SMARCB1-deficient renal medullary carcinoma',
            'Renal cell carcinoma, subtype pending additional studies',
            'Other',
          ],
        },
        histologicTypeOther: { type: 'string' },
        histologicGrade: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'GX', 'Not applicable'],
          description: 'WHO/ISUP nuclear grade',
        },
        tumorExtent: {
          type: 'array',
          description: 'Select all that apply',
          items: {
            type: 'string',
            enum: [
              'Limited to kidney',
              'Extends into perinephric tissue (beyond renal capsule)',
              'Extends into renal sinus',
              'Extends into pelvicalyceal system',
              'Extends into renal vein or its segmental branches',
              'Extends into inferior vena cava below the diaphragm',
              'Extends into inferior vena cava above the diaphragm or invades IVC wall',
              'Extends beyond Gerota\'s fascia',
              'Directly invades adrenal gland (T4)',
              'Involves adrenal gland non-contiguously (M1)',
              'Extends into other organ(s)',
              'Cannot be determined',
            ],
          },
        },
        rhabdoidFeatures: { type: 'string', enum: ['Not identified', 'Present', 'Cannot be determined'] },
        rhabdoidPct: { type: 'number' },
        sarcomatoidFeatures: { type: 'string', enum: ['Not identified', 'Present', 'Cannot be determined'] },
        sarcomatoidPct: { type: 'number' },
        necrosis: { type: 'string', enum: ['Not identified', 'Present', 'Cannot be determined'] },
        necrosisPct: { type: 'number' },
        lvi: { type: 'string', enum: ['Not identified', 'Present', 'Cannot be determined'] },
        tumorComment: { type: 'string' },
      },
    },
  },
  {
    name: 'set_margins',
    description: 'Set surgical margin status',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['All margins negative', 'Carcinoma present at margin', 'Cannot be determined', 'Not applicable'],
        },
        involvedLocations: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['Renal parenchymal', 'Renal capsular', 'Renal sinus soft tissue', 'Renal hilar soft tissue', 'Renal vein', 'Ureteral', 'Perinephric fat', "Gerota's fascia", 'Other'],
          },
        },
        involvedOther: { type: 'string' },
        marginComment: { type: 'string' },
      },
      required: ['status'],
    },
  },
  {
    name: 'set_lymph_nodes',
    description: 'Set regional lymph node findings',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Not applicable', 'All negative', 'Tumor present'],
        },
        nodesPositive: { type: 'number' },
        nodesExamined: { type: 'number' },
        sites: {
          type: 'array',
          items: { type: 'string', enum: ['Hilar', 'Precaval', 'Interaortocaval', 'Paracaval', 'Retrocaval', 'Preaortic', 'Paraaortic', 'Retroaortic', 'Other'] },
        },
        largestDepositCm: { type: 'number' },
        extranodalExtension: { type: 'string', enum: ['Not identified', 'Present', 'Cannot be determined'] },
      },
      required: ['status'],
    },
  },
  {
    name: 'set_stage',
    description: 'Override or set pTNM stage (pT auto-computes from extent+size; use this for prefixes, suffix, or manual override)',
    input_schema: {
      type: 'object',
      properties: {
        ptCategory: { type: 'string', description: 'e.g. pT1a, pT3a, pT4' },
        pnCategory: { type: 'string', description: 'pN0 or pN1' },
        pmCategory: { type: 'string', description: 'pM1 if confirmed pathologically' },
        tSuffix: { type: 'string', enum: ['', '(m)'], description: '(m) for multiple synchronous primary tumors' },
        yPrefix: { type: 'boolean' },
        rPrefix: { type: 'boolean' },
      },
    },
  },
  {
    name: 'set_additional_findings',
    description: 'Set non-neoplastic kidney findings (glomerular disease, vascular disease, cysts, papillary adenomas, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        findings: { type: 'string' },
      },
      required: ['findings'],
    },
  },
  {
    name: 'set_special_studies',
    description: 'Set IHC markers or molecular studies',
    input_schema: {
      type: 'object',
      properties: {
        ihcPerformed: { type: 'boolean' },
        ihcDescription: { type: 'string' },
        molecularPending: { type: 'boolean' },
        molecularMarkers: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'set_case_comment',
    description: 'Set a case-level comment',
    input_schema: {
      type: 'object',
      properties: { comment: { type: 'string' } },
      required: ['comment'],
    },
  },
  {
    name: 'add_secondary_specimen',
    description: 'Add a separately submitted specimen (lymph nodes, adrenal gland, additional margin, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        letter: { type: 'string', description: 'Specimen letter (B, C, …)' },
        designation: { type: 'string', description: 'e.g., "Lymph node, para-aortic, excision"' },
        diagnosisLines: { type: 'array', items: { type: 'string' } },
        cpt: { type: 'string', description: 'Override CPT code if needed' },
      },
      required: ['letter', 'designation'],
    },
  },
  {
    name: 'assemble_report',
    description: 'Compile and return the final formatted report',
    input_schema: { type: 'object', properties: {} },
  },
];

function detectSecondaryCpt(designation) {
  const d = (designation || '').toLowerCase();
  if (/frozen|\bfs\b|intraoperative/i.test(designation)) {
    const siteMatch = designation.match(/[×x]\s*(\d+)|(\d+)\s*(?:sites?|blocks?|sections?)/i);
    const siteCount = siteMatch ? parseInt(siteMatch[1] || siteMatch[2], 10) : 1;
    const cptAddons = [];
    for (let i = 1; i < siteCount; i++) cptAddons.push('88332');
    return { cpt: '88331', cptLabel: 'Frozen section consultation', cptAddons };
  }
  if (/lymph\s*node|nodal|hilar|para.?aortic|paracaval/i.test(d))
    return { cpt: '88307', cptLabel: 'Lymph node excision', cptAddons: [] };
  if (/adrenal/i.test(d))
    return { cpt: '88307', cptLabel: 'Adrenal gland', cptAddons: [] };
  return { cpt: '88305', cptLabel: 'Tissue biopsy/margin', cptAddons: [] };
}

function primaryCpt(procedure) {
  const p = (procedure || '').toLowerCase();
  if (/radical|total|simple/i.test(p)) return { cpt: '88309', cptLabel: 'Radical/total nephrectomy' };
  if (/partial/i.test(p)) return { cpt: '88307', cptLabel: 'Partial nephrectomy' };
  return { cpt: '88309', cptLabel: 'Nephrectomy' };
}

export async function executeKidneyTool(name, args, caseData) {
  if (!caseData || caseData.organ !== 'kidney') {
    caseData = createEmptyKidneyCase();
  }
  const cap = caseData.cap;

  switch (name) {
    case 'set_specimen': {
      cap.specimen.procedure = args.procedure || null;
      cap.specimen.procedureOther = args.procedureOther || '';
      cap.specimen.laterality = args.laterality || null;
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_tumor': {
      const t = cap.tumor;
      if (args.focality != null) t.focality = args.focality;
      if (args.multifocalCount != null) t.multifocalCount = args.multifocalCount;
      if (args.site != null) t.site = args.site;
      if (args.siteOther != null) t.siteOther = args.siteOther;
      if (args.sizeCm != null) t.sizeCm = args.sizeCm;
      if (args.otherSizesCm != null) t.otherSizesCm = args.otherSizesCm;
      if (args.histologicType != null) t.histologicType = args.histologicType;
      if (args.histologicTypeOther != null) t.histologicTypeOther = args.histologicTypeOther;
      if (args.histologicGrade != null) t.histologicGrade = args.histologicGrade;
      if (args.tumorExtent != null) t.tumorExtent = args.tumorExtent;
      if (args.rhabdoidFeatures != null) t.rhabdoidFeatures = args.rhabdoidFeatures;
      if (args.rhabdoidPct != null) t.rhabdoidPct = args.rhabdoidPct;
      if (args.sarcomatoidFeatures != null) t.sarcomatoidFeatures = args.sarcomatoidFeatures;
      if (args.sarcomatoidPct != null) t.sarcomatoidPct = args.sarcomatoidPct;
      if (args.necrosis != null) t.necrosis = args.necrosis;
      if (args.necrosisPct != null) t.necrosisPct = args.necrosisPct;
      if (args.lvi != null) t.lvi = args.lvi;
      if (args.tumorComment != null) t.tumorComment = args.tumorComment;

      // Auto-compute pT if not already manually set
      const autoPT = computeKidneyPT(t.tumorExtent || [], t.sizeCm);
      if (autoPT && !cap.stage.ptCategory) cap.stage.ptCategory = autoPT;

      // Non-contiguous adrenal → pM1
      const hasNonContiguous = (t.tumorExtent || []).some(e => /non.?contiguous|adrenal.*m1/i.test(e));
      if (hasNonContiguous && !cap.stage.pmCategory) cap.stage.pmCategory = 'pM1';

      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_margins': {
      cap.margins.status = args.status || null;
      if (args.involvedLocations != null) cap.margins.involvedLocations = args.involvedLocations;
      if (args.involvedOther != null) cap.margins.involvedOther = args.involvedOther;
      if (args.marginComment != null) cap.margins.marginComment = args.marginComment;
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_lymph_nodes': {
      const n = cap.nodes;
      n.status = args.status || null;
      if (args.nodesPositive != null) n.nodesPositive = args.nodesPositive;
      if (args.nodesExamined != null) n.nodesExamined = args.nodesExamined;
      if (args.sites != null) n.sites = args.sites;
      if (args.largestDepositCm != null) n.largestDepositCm = args.largestDepositCm;
      if (args.extranodalExtension != null) n.extranodalExtension = args.extranodalExtension;

      // Auto-set pN
      if (!cap.stage.pnCategory) {
        if (/not applicable/i.test(args.status)) {
          cap.stage.pnCategory = 'pN not assigned';
        } else if (/all negative/i.test(args.status)) {
          cap.stage.pnCategory = 'pN0';
        } else if (/tumor present/i.test(args.status)) {
          cap.stage.pnCategory = 'pN1';
        }
      }
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_stage': {
      if (args.ptCategory != null) cap.stage.ptCategory = args.ptCategory;
      if (args.pnCategory != null) cap.stage.pnCategory = args.pnCategory;
      if (args.pmCategory != null) cap.stage.pmCategory = args.pmCategory;
      if (args.tSuffix != null) cap.stage.tSuffix = args.tSuffix;
      if (args.yPrefix != null) cap.stage.yPrefix = args.yPrefix;
      if (args.rPrefix != null) cap.stage.rPrefix = args.rPrefix;
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_additional_findings': {
      cap.additionalFindings = args.findings || '';
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_special_studies': {
      const ss = cap.specialStudies;
      if (args.ihcPerformed != null) ss.ihcPerformed = args.ihcPerformed;
      if (args.ihcDescription != null) ss.ihcDescription = args.ihcDescription;
      if (args.molecularPending != null) ss.molecularPending = args.molecularPending;
      if (args.molecularMarkers != null) ss.molecularMarkers = args.molecularMarkers;
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'set_case_comment': {
      caseData.caseComment = args.comment || '';
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'add_secondary_specimen': {
      const letter = (args.letter || '').toUpperCase();
      const existing = caseData.specimens.findIndex(s => s.letter === letter);
      const { cpt, cptLabel, cptAddons } = detectSecondaryCpt(args.designation);
      const entry = {
        letter,
        designation: args.designation || '',
        diagnosisLines: args.diagnosisLines || [],
        cpt: args.cpt || cpt,
        cptLabel: args.cpt ? '' : cptLabel,
        cptAddons: cptAddons,
      };
      if (existing >= 0) {
        caseData.specimens[existing] = entry;
      } else {
        caseData.specimens.push(entry);
        caseData.specimens.sort((a, b) => a.letter.localeCompare(b.letter));
      }
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    case 'assemble_report': {
      // Ensure primary specimen CPT is stored
      if (!caseData._primaryCpt) {
        const billing = primaryCpt(cap.specimen.procedure);
        caseData._primaryCpt = billing.cpt;
        caseData._primaryCptLabel = billing.cptLabel;
      }
      caseData.reportText = assembleKidneyReport(caseData);
      caseData.updatedAt = new Date().toISOString();
      break;
    }

    default:
      throw new Error(`Unknown kidney tool: ${name}`);
  }

  return caseData;
}
