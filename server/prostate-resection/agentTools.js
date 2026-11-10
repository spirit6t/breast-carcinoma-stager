/**
 * Agent tools for prostate radical prostatectomy reporting.
 * CAP Protocol v4.3.0.0 (September 2023, AJCC 8th Edition)
 */

import { computeGradeGroup, gradeGroupLabel } from './caseModel.js';
import { assembleProstateResectionReport } from './reportAssembler.js';

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const PROSTATE_RP_TOOL_SCHEMAS = [
  {
    name: 'set_intake',
    description: 'Set prostate weight (g) and dimensions (cm). Call once intake data is known.',
    input_schema: {
      type: 'object',
      properties: {
        prostateWeightG: { type: 'number', description: 'Prostate weight in grams' },
        prostateSizeCm:  { type: 'string', description: 'Prostate dimensions as "W x L x H cm"' },
      },
    },
  },
  {
    name: 'add_specimen',
    description: 'Add a specimen. Call once per specimen. Idempotent — same letter updates existing entry. Collect ALL specimens before assigning diagnoses.',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter:      { type: 'string', description: 'A, B, C, ...' },
        designation: { type: 'string', description: 'e.g. "PROSTATE GLAND, RADICAL PROSTATECTOMY" or "LYMPH NODES, PELVIC, RIGHT (RADICAL PROSTATECTOMY)"' },
        cpt:         { type: 'string', description: '88309 for prostate; 88307 for LN packets and separate seminal vesicles' },
      },
    },
  },
  {
    name: 'set_secondary_specimen_dx',
    description: 'Set brief diagnosis for a non-prostate specimen (lymph node packet, seminal vesicle). Do NOT call for the primary prostate specimen — it is assembled from cap data automatically.',
    input_schema: {
      type: 'object',
      required: ['letter', 'diagnosisText'],
      properties: {
        letter:        { type: 'string', description: 'Specimen letter, e.g. "B"' },
        diagnosisText: {
          type: 'string',
          description: 'Free-text diagnosis. Examples: "No tumor seen in four lymph nodes (0/4)" | "Metastatic adenocarcinoma in one of four lymph nodes (1/4)" | "No tumor seen"',
        },
      },
    },
  },
  {
    name: 'set_primary_tumor',
    description: 'Set histologic type(s), Gleason grade, IDC, cribriform glands, and treatment effect for the primary prostate carcinoma.',
    input_schema: {
      type: 'object',
      properties: {
        histologicTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of histologic types. Default: ["Acinar adenocarcinoma, conventional (usual) type"]. Others: "Intraductal carcinoma of the prostate", "Ductal adenocarcinoma", "Squamous cell carcinoma", "Small cell neuroendocrine carcinoma", etc.',
        },
        gleasonPrimary:   { type: 'number', description: '3, 4, or 5 — most prevalent Gleason pattern' },
        gleasonSecondary: { type: 'number', description: '3, 4, or 5 — second most prevalent Gleason pattern' },
        pattern4Pct: {
          type: 'string',
          description: 'GG2 (3+4=7): "<5%", "6-10%", "11-20%", "21-30%", "31-40%". GG3 (4+3=7): "<61%", "61-70%", "71-80%", "81-90%", ">90%". Omit for GG1/GG4/GG5.',
        },
        minorTertiaryPattern5: {
          type: 'string',
          enum: ['Not applicable / not identified', 'Present'],
        },
        idc: {
          type: 'string',
          enum: ['Not identified', 'Present'],
          description: 'Intraductal carcinoma of the prostate (IDC-P)',
        },
        idcIncorporatedIntoGrade: {
          type: 'string',
          enum: ['Yes', 'No', 'Cannot be determined'],
          description: 'Only applicable if IDC is Present',
        },
        cribriformGlands: {
          type: 'string',
          enum: ['Not applicable', 'Not identified', 'Present', 'Cannot be determined'],
          description: 'Applicable to GG2, GG3, GG4 only',
        },
        treatmentEffect: {
          type: 'array',
          items: { type: 'string' },
          description: '["No known prior treatment"] or ["Present — no residual carcinoma"] or ["Present — residual carcinoma"] or ["Cannot be determined"]',
        },
      },
    },
  },
  {
    name: 'set_extent',
    description: 'Set tumor quantitation (% involved, dominant nodule) and extent of invasion (EPE, SVI, BNI, LVI, PNI). Call after set_primary_tumor.',
    input_schema: {
      type: 'object',
      properties: {
        tumorPctInvolved: {
          type: 'string',
          description: 'Estimated % of prostate involved: "<1%", "1-5%", "6-10%", "11-20%", "21-30%", "31-40%", "41-50%", "51-60%", "61-70%", "71-80%", "81-90%", ">90%"',
        },
        dominantNoduleMm:       { type: 'number', description: 'Greatest dimension of dominant nodule in mm' },
        dominantNoduleLocation: { type: 'string', description: 'e.g. "posterior right", "anterior left"' },
        epe: {
          type: 'string',
          enum: ['Not identified', 'Present, focal', 'Present, nonfocal', 'Cannot be determined'],
          description: 'Extraprostatic extension',
        },
        epeLocations: {
          type: 'array',
          items: { type: 'string' },
          description: 'EPE locations if present, e.g. ["Right posterolateral", "Left lateral"]. Laterality × site: Right/Left × Apical/Bladder neck/Anterior/Lateral/Posterolateral/Posterior',
        },
        bladderNeckInvasion: {
          type: 'string',
          enum: ['Not identified', 'Present', 'Cannot be determined'],
          description: 'Urinary bladder neck invasion',
        },
        seminalVesicleInvasion: {
          type: 'string',
          enum: ['Not identified', 'Present, right', 'Present, left', 'Present, bilateral', 'No seminal vesicle present'],
          description: 'Seminal vesicle invasion',
        },
        lvi: {
          type: 'string',
          enum: ['Not identified', 'Present', 'Cannot be determined'],
          description: 'Lymphatic and/or vascular invasion',
        },
        perineumralInvasion: {
          type: 'string',
          enum: ['Not identified', 'Present'],
          description: 'Perineural invasion',
        },
      },
    },
  },
  {
    name: 'set_margins',
    description: 'Set surgical margin status and details.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Cannot be assessed', 'All margins negative for invasive carcinoma', 'Invasive carcinoma present at margin'],
        },
        marginsInvolved: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of involved margin locations, e.g. ["Right posterolateral", "Apical"]',
        },
        marginLinearMm: {
          type: 'string',
          description: 'Linear extent, e.g. "2 mm", "<3 mm", "≥3 mm"',
        },
        marginFocality: {
          type: 'string',
          enum: ['Unifocal', 'Multifocal'],
        },
        gleassonPatternAtMargin: {
          type: 'array',
          items: { type: 'number' },
          description: 'Gleason pattern(s) at positive margin, e.g. [4]',
        },
        marginInAreaOfEpe: {
          type: 'string',
          enum: ['Not identified', 'Present'],
          description: 'Whether positive margin is in an area of EPE',
        },
      },
    },
  },
  {
    name: 'set_nodes',
    description: 'Set overall lymph node data (aggregate across all LN packets).',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['No lymph nodes submitted', 'No tumor seen', 'Metastatic carcinoma present'],
        },
        nodesPositive:  { type: 'number', description: 'Total positive nodes across all packets' },
        nodesExamined:  { type: 'number', description: 'Total nodes examined across all packets' },
        nodalSitesWithTumor: {
          type: 'array',
          items: { type: 'string' },
          description: 'Nodal sites with tumor involvement, e.g. ["Obturator", "Internal iliac right"]',
        },
        extranodalExtension: {
          type: 'string',
          enum: ['Not identified', 'Present'],
        },
        nodeComment: { type: 'string' },
      },
    },
  },
  {
    name: 'set_stage',
    description: 'Set pTNM pathologic stage. pT is auto-computed from EPE/SVI/BNI if not explicitly provided.',
    input_schema: {
      type: 'object',
      properties: {
        ptCategory: {
          type: 'string',
          enum: ['pT2', 'pT3a', 'pT3b', 'pT4'],
          description: 'Override auto-computed pT. Omit to let the server auto-compute from EPE/SVI/BNI data.',
        },
        pnCategory: {
          type: 'string',
          enum: ['pN not assigned', 'pN0', 'pN1'],
          description: 'pN not assigned = no nodes submitted; pN0 = no positive nodes; pN1 = positive nodes',
        },
        pmCategory: {
          type: 'string',
          enum: ['Not applicable', 'pM1a', 'pM1b', 'pM1c'],
          description: 'Only if distant disease present. pM1a = nonregional LN; pM1b = bone; pM1c = other',
        },
        distantSitesStatus: {
          type: 'string',
          enum: ['Not applicable', 'Present'],
        },
        distantSites: {
          type: 'array',
          items: { type: 'string' },
          description: 'Distant site(s) if present, e.g. ["Nonregional lymph nodes", "Bone"]',
        },
        yPrefix: { type: 'boolean', description: 'True if post-neoadjuvant treatment resection' },
        rPrefix: { type: 'boolean', description: 'True if recurrence specimen' },
      },
    },
  },
  {
    name: 'set_additional_findings',
    description: 'Set additional histologic findings found in the specimen.',
    input_schema: {
      type: 'object',
      properties: {
        findings: {
          type: 'array',
          items: { type: 'string' },
          description: 'e.g. ["High-grade prostatic intraepithelial neoplasia (HGPIN)", "Adenosis", "Nodular hyperplasia", "Acute inflammation"]',
        },
      },
    },
  },
  {
    name: 'set_comment',
    description: 'Set a case-level comment.',
    input_schema: {
      type: 'object',
      properties: {
        comment: { type: 'string' },
      },
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble and return the complete pathology report. Call only after all data blocks have been completed.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────

export const PROSTATE_RP_SYSTEM_PROMPT = `
You are a pathologist's assistant helping assemble radical prostatectomy reports
following CAP Protocol v4.3.0.0 (September 2023, AJCC 8th Edition).

Always call tools in this order. Do not skip any block.

═══════════════════════════════════════════════════════════
BLOCK 1 — INTAKE AND SPECIMENS
═══════════════════════════════════════════════════════════
Collect:
1. Prostate weight (g) and dimensions (cm × cm × cm) if available
2. ALL specimen designations — collect ALL before assigning ANY diagnoses:
   • Specimen A: typically "PROSTATE GLAND, RADICAL PROSTATECTOMY" — CPT 88309
   • Seminal vesicles (if submitted separately): "SEMINAL VESICLE, [RIGHT/LEFT]" — CPT 88307
   • Pelvic lymph node packets: "LYMPH NODES, PELVIC, [SIDE/BILATERAL]" — CPT 88307 each
   Note: seminal vesicles included with prostate are part of Specimen A

Call set_intake(prostateWeightG, prostateSizeCm).
Call add_specimen(letter, designation, cpt) for EACH specimen.

═══════════════════════════════════════════════════════════
BLOCK 2 — HISTOLOGIC TYPE AND GRADE
═══════════════════════════════════════════════════════════
For the primary prostate specimen:
1. Histologic type(s) — default: "Acinar adenocarcinoma, conventional (usual) type"
   Other types: intraductal carcinoma, ductal adenocarcinoma, squamous (adenosquamous/SCC), neuroendocrine (w/ NE diff / well-diff NET / small cell / large cell), etc.
2. Gleason primary pattern (3, 4, or 5) and secondary pattern (3, 4, or 5)
   Grade group auto-computed: GG1=3+3=6; GG2=3+4=7; GG3=4+3=7; GG4=score 8; GG5=score 9–10
3. Percentage of pattern 4:
   GG2 (3+4=7): <5% | 6-10% | 11-20% | 21-30% | 31-40%
   GG3 (4+3=7): <61% | 61-70% | 71-80% | 81-90% | >90%
   GG1 / GG4 / GG5: not applicable
4. Minor tertiary pattern 5: "Not applicable / not identified" or "Present"
5. Intraductal carcinoma (IDC): "Not identified" or "Present"
   If present → IDC incorporated into grade: Yes / No / Cannot be determined
6. Cribriform glands (GG2–GG4 only): Not applicable / Not identified / Present / Cannot be determined
7. Treatment effect: "No known prior treatment" / "Present — no residual carcinoma" /
   "Present — residual carcinoma" / "Cannot be determined"

Call set_primary_tumor() with all grading and type data.

═══════════════════════════════════════════════════════════
BLOCK 3 — TUMOR QUANTITATION AND EXTENT
═══════════════════════════════════════════════════════════
Collect:
1. Estimated % of prostate involved:
   <1% | 1-5% | 6-10% | 11-20% | 21-30% | 31-40% | 41-50% |
   51-60% | 61-70% | 71-80% | 81-90% | >90%
2. Greatest dimension of dominant nodule (mm) and location (e.g. "posterior right")
3. Extraprostatic extension (EPE):
   Not identified | Present, focal | Present, nonfocal | Cannot be determined
   If present: location(s) → laterality × site: Right/Left × Apical/Bladder neck/Anterior/Lateral/Posterolateral/Posterior
4. Urinary bladder neck invasion: Not identified | Present | Cannot be determined
5. Seminal vesicle invasion: Not identified | Present, right | Present, left | Present, bilateral | No seminal vesicle present
6. Lymphatic and/or vascular invasion (LVI): Not identified | Present | Cannot be determined
7. Perineural invasion: Not identified | Present

Call set_extent() with all quantitation/extent data.

═══════════════════════════════════════════════════════════
BLOCK 4 — MARGINS
═══════════════════════════════════════════════════════════
Collect:
1. Margin status: Cannot be assessed | All margins negative for invasive carcinoma | Invasive carcinoma present at margin
2. If positive margins:
   • Margin(s) involved: list each (laterality × site: Right/Left × Apical/Bladder neck/Anterior/Lateral/Posterolateral/Posterior)
   • Linear length: exact mm value | "<3 mm" (limited focal) | "≥3 mm" (non-limited)
   • Focality: Unifocal | Multifocal
   • Gleason pattern at margin: 3 | 4 | 5
   • Margin in area of EPE: Not identified | Present

Call set_margins() with all margin data.

═══════════════════════════════════════════════════════════
BLOCK 5 — SECONDARY SPECIMENS
═══════════════════════════════════════════════════════════
For each lymph node packet or separate seminal vesicle specimen:
• Ask for diagnosis — number of positive nodes / total nodes
• Call set_secondary_specimen_dx(letter, diagnosisText)
  Examples:
  - "No tumor seen in four lymph nodes (0/4)"
  - "Metastatic adenocarcinoma in one of four lymph nodes (1/4)"
  - "No tumor seen"

For overall node counts (all LN packets combined), call set_nodes() with:
• status, nodesPositive (total positive), nodesExamined (total examined)
• If positive: nodalSitesWithTumor, extranodalExtension

═══════════════════════════════════════════════════════════
BLOCK 6 — PATHOLOGIC STAGE (AJCC 8th Edition)
═══════════════════════════════════════════════════════════
pT auto-computed from extent data (may override for pT4):
  pT2:  Organ confined (EPE not identified, no SVI, no BNI)
  pT3a: EPE present (any form) OR bladder neck invasion
  pT3b: Seminal vesicle invasion (trumps pT3a)
  pT4:  Direct invasion of rectum, external sphincter, levator ani, or pelvic wall
  Note: If both SVI and EPE, pT3b wins. pT4 trumps all.

pN:
  pN not assigned — no lymph nodes submitted
  pN0 — no positive regional nodes
  pN1 — regional node metastasis

pM (only if distant disease is confirmed):
  pM1a — Nonregional lymph node(s)
  pM1b — Bone(s)
  pM1c — Other site(s) with or without bone

Modified Classification:
  y — post-neoadjuvant treatment resection
  r — recurrence specimen

Call set_stage() with pN, pM (if applicable), and y/r prefix (if applicable).
Omit ptCategory to auto-compute it; pass ptCategory: "pT4" only if pT4 applies.

═══════════════════════════════════════════════════════════
BLOCK 7 — ADDITIONAL FINDINGS AND COMMENT
═══════════════════════════════════════════════════════════
Ask about additional histologic findings:
• High-grade prostatic intraepithelial neoplasia (HGPIN)
• Atypical intraepithelial proliferation (AIP)
• Adenosis
• Nodular hyperplasia (BPH)
• Acute inflammation | Chronic inflammation
• Other

Call set_additional_findings(findings: string[]).
If a case-level comment is needed, call set_comment(comment).

═══════════════════════════════════════════════════════════
BLOCK 8 — ASSEMBLE REPORT
═══════════════════════════════════════════════════════════
Call assemble_report() to generate the complete report.

═══════════════════════════════════════════════════════════
RULES
═══════════════════════════════════════════════════════════
CPT CODES:
  88309 — Radical prostatectomy (prostate specimen)
  88307 — Pelvic lymph node dissection packet (each)
  88307 — Separate seminal vesicle specimen (each)
  88331 — Frozen section, intraoperative consultation, first site
  88332 — Each additional frozen section site (add-on to 88331)

SPECIMENS:
  • Collect ALL designations before assigning any diagnoses
  • add_specimen is idempotent: same letter updates existing entry
  • The primary prostate specimen is auto-detected by designation keyword

SECONDARY SPECIMENS:
  • Call set_secondary_specimen_dx() for each non-prostate specimen
  • Do NOT call it for Specimen A (prostate) — the assembler renders it
`.trim();

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeProstateRPTool(name, args, caseData) {
  const c = JSON.parse(JSON.stringify(caseData));
  c.updatedAt = new Date().toISOString();

  switch (name) {
    case 'set_intake': {
      if (args.prostateWeightG != null) c.cap.specimen.prostateWeightG = args.prostateWeightG;
      if (args.prostateSizeCm  != null) c.cap.specimen.prostateSizeCm  = args.prostateSizeCm;
      return { case: c, result: { ok: true } };
    }

    case 'add_specimen': {
      const isProstate = /^prostate|radical prostatectomy/i.test(args.designation || '');
      const spec = {
        letter:         args.letter,
        designation:    args.designation,
        cpt:            args.cpt || (isProstate ? '88309' : '88307'),
        cptAddons:      [],
        isPrimary:      isProstate,
        diagnosisLines: null,
      };
      const idx = c.specimens.findIndex(s => s.letter === args.letter);
      if (idx >= 0) {
        const existing = c.specimens[idx];
        c.specimens[idx] = { ...existing, ...spec, diagnosisLines: existing.diagnosisLines };
      } else {
        c.specimens.push(spec);
      }
      c.specimens.sort((a, b) => a.letter.localeCompare(b.letter));
      return { case: c, result: { ok: true, specCount: c.specimens.length } };
    }

    case 'set_secondary_specimen_dx': {
      const idx = c.specimens.findIndex(s => s.letter === args.letter);
      if (idx < 0) return { error: `Specimen ${args.letter} not found — call add_specimen first` };
      c.specimens[idx].diagnosisLines = args.diagnosisText || null;
      return { case: c, result: { ok: true } };
    }

    case 'set_primary_tumor': {
      const t = c.cap.tumor;
      if (args.histologicTypes) t.histologicTypes = args.histologicTypes;
      if (args.gleasonPrimary != null && args.gleasonSecondary != null) {
        t.gleasonPrimary   = args.gleasonPrimary;
        t.gleasonSecondary = args.gleasonSecondary;
        t.gleasonScore     = args.gleasonPrimary + args.gleasonSecondary;
        t.gradeGroup       = computeGradeGroup(args.gleasonPrimary, args.gleasonSecondary);
        t.gradeGroupLabel  = gradeGroupLabel(t.gradeGroup, args.gleasonPrimary, args.gleasonSecondary);
      }
      if (args.pattern4Pct              != null) t.pattern4Pct = args.pattern4Pct;
      if (args.minorTertiaryPattern5    != null) t.minorTertiaryPattern5 = args.minorTertiaryPattern5;
      if (args.idc                      != null) t.idc = args.idc;
      if (args.idcIncorporatedIntoGrade != null) t.idcIncorporatedIntoGrade = args.idcIncorporatedIntoGrade;
      if (args.cribriformGlands         != null) t.cribriformGlands = args.cribriformGlands;
      if (args.treatmentEffect          != null) {
        t.treatmentEffect = Array.isArray(args.treatmentEffect) ? args.treatmentEffect : [args.treatmentEffect];
      }
      return {
        case: c,
        result: {
          ok: true,
          gradeGroup: t.gradeGroup,
          gradeGroupLabel: t.gradeGroupLabel,
          message: t.gradeGroup ? `Grade Group ${t.gradeGroup} set.` : 'Tumor type updated.',
        },
      };
    }

    case 'set_extent': {
      const t = c.cap.tumor;
      const q = c.cap.quantitation;
      if (args.tumorPctInvolved       != null) q.tumorPctInvolved = args.tumorPctInvolved;
      if (args.dominantNoduleMm       != null) q.dominantNoduleMm = args.dominantNoduleMm;
      if (args.dominantNoduleLocation != null) q.dominantNoduleLocation = args.dominantNoduleLocation;
      if (args.epe                    != null) t.epe = args.epe;
      if (args.epeLocations           != null) t.epeLocations = args.epeLocations;
      if (args.bladderNeckInvasion    != null) t.bladderNeckInvasion = args.bladderNeckInvasion;
      if (args.seminalVesicleInvasion != null) t.seminalVesicleInvasion = args.seminalVesicleInvasion;
      if (args.lvi                    != null) t.lvi = args.lvi;
      if (args.perineumralInvasion    != null) t.perineumralInvasion = args.perineumralInvasion;
      return { case: c, result: { ok: true } };
    }

    case 'set_margins': {
      const m = c.cap.margins;
      if (args.status                  != null) m.status = args.status;
      if (args.marginsInvolved         != null) m.marginsInvolved = args.marginsInvolved;
      if (args.marginLinearMm          != null) m.marginLinearMm = args.marginLinearMm;
      if (args.marginFocality          != null) m.marginFocality = args.marginFocality;
      if (args.gleassonPatternAtMargin != null) m.gleassonPatternAtMargin = args.gleassonPatternAtMargin;
      if (args.marginInAreaOfEpe       != null) m.marginInAreaOfEpe = args.marginInAreaOfEpe;
      return { case: c, result: { ok: true } };
    }

    case 'set_nodes': {
      const n = c.cap.nodes;
      if (args.status              != null) n.status = args.status;
      if (args.nodesPositive       != null) n.nodesPositive = args.nodesPositive;
      if (args.nodesExamined       != null) n.nodesExamined = args.nodesExamined;
      if (args.nodalSitesWithTumor != null) n.nodalSitesWithTumor = args.nodalSitesWithTumor;
      if (args.extranodalExtension != null) n.extranodalExtension = args.extranodalExtension;
      if (args.nodeComment         != null) n.nodeComment = args.nodeComment;
      return { case: c, result: { ok: true } };
    }

    case 'set_stage': {
      const st = c.cap.stage;
      const t  = c.cap.tumor;

      // pT: use explicit override, else auto-compute from extent
      if (args.ptCategory != null) {
        st.ptCategory = args.ptCategory;
      } else {
        if (/present/i.test(t.seminalVesicleInvasion || '')) {
          st.ptCategory = 'pT3b';
        } else if (/present/i.test(t.epe || '') || /present/i.test(t.bladderNeckInvasion || '')) {
          st.ptCategory = 'pT3a';
        } else {
          st.ptCategory = 'pT2';
        }
      }

      if (args.pnCategory         != null) st.pnCategory = args.pnCategory;
      if (args.pmCategory         != null) st.pmCategory = args.pmCategory;
      if (args.distantSitesStatus != null) st.distantSitesStatus = args.distantSitesStatus;
      if (args.distantSites       != null) st.distantSites = args.distantSites;
      if (args.yPrefix            != null) st.yPrefix = args.yPrefix;
      if (args.rPrefix            != null) st.rPrefix = args.rPrefix;

      return {
        case: c,
        result: { ok: true, ptCategory: st.ptCategory, pnCategory: st.pnCategory },
      };
    }

    case 'set_additional_findings': {
      c.cap.additionalFindings = args.findings || [];
      return { case: c, result: { ok: true } };
    }

    case 'set_comment': {
      c.caseComment = args.comment || null;
      return { case: c, result: { ok: true } };
    }

    case 'assemble_report': {
      const text = assembleProstateResectionReport(c);
      c.reportText = text;
      return { case: c, result: { ok: true, reportText: text } };
    }

    default:
      return { error: `Unknown prostate-resection tool: ${name}` };
  }
}
