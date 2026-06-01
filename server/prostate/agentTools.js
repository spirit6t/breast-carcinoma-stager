/**
 * Agent tools for prostate needle core biopsy reporting.
 * CAP Protocol: Prostate.Needle.Case.Bx_1.1.0.0 (Sep 2023, WHO 5th Ed)
 */

import { computeGradeGroup, emptyProstateBiopsySpecimen, PATTERN4_PCT_OPTIONS_GG2, PATTERN4_PCT_OPTIONS_GG3 } from './caseModel.js';

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const PROSTATE_TOOL_SCHEMAS = [
  {
    name: 'set_intake',
    description: 'Set clinical history, PSA level, clinical stage, imaging findings, and procedure type(s).',
    input_schema: {
      type: 'object',
      properties: {
        clinicalHistory: { type: 'string' },
        psaLevel:        { type: 'string', description: 'e.g. "8.5 ng/mL"' },
        procedure:       {
          type: 'array',
          items: { type: 'string' },
          description: 'e.g. ["Systematic biopsy"] or ["Systematic biopsy", "Targeted biopsy"]',
        },
      },
    },
  },
  {
    name: 'add_specimen',
    description: 'Add a specimen with its letter and verbatim designation. Call once per specimen. Collect all specimen designations before asking for diagnoses.',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter:      { type: 'string', description: 'A, B, C, ...' },
        designation: { type: 'string', description: 'e.g. "PROSTATE, LEFT APEX, CORE NEEDLE BIOPSY"' },
        location:    { type: 'string', description: 'Anatomic abbreviation: LA, RA, LM, RM, LB, RB, LBL, LBM, LML, LMM, LAL, LAM, RBL, RBM, RML, RMM, RAL, RAM, LTZ, RTZ' },
      },
    },
  },
  {
    name: 'set_specimen_carcinoma',
    description: 'Set the carcinoma diagnosis for a positive specimen. Returns computed grade group and whether pattern 4 % is needed.',
    input_schema: {
      type: 'object',
      required: ['letter', 'gleasonPrimary', 'gleasonSecondary'],
      properties: {
        letter:            { type: 'string' },
        histologicType:    {
          type: 'string',
          description: 'Default: "Acinar adenocarcinoma, conventional (usual)". Others: signet-ring-like cell, pleomorphic giant cell, sarcomatoid, PIN-like, ductal adenocarcinoma, isolated intraductal carcinoma, small cell neuroendocrine carcinoma, etc.',
        },
        gleasonPrimary:    { type: 'number', description: '3, 4, or 5 — most prevalent pattern' },
        gleasonSecondary:  { type: 'number', description: '3, 4, or 5 — second most prevalent pattern' },
        pattern4Pct:       {
          type: 'string',
          description: 'Required for GG2 (3+4): "<5%", "6-10%", "11-20%", "21-30%", "31-40%". Required for GG3 (4+3): "<61%", "61-70%", "71-80%", "81-90%", ">90%". Omit for GG1/GG4/GG5.',
        },
        pattern4PctNumeric: { type: 'number', description: 'Optional numeric % of pattern 4 for GG4+ cases.' },
        pattern5PctNumeric: { type: 'number', description: 'Optional numeric % of pattern 5 for GG4+ cases.' },
        idc:               { type: 'string', enum: ['Not identified', 'Present'], description: 'Intraductal carcinoma' },
        idcIncorporatedIntoGrade: { type: 'string', enum: ['Yes', 'No', 'Cannot be determined'] },
        cribriformGlands:  { type: 'string', enum: ['Not applicable', 'Not identified', 'Present', 'Equivocal', 'Cannot be determined'], description: 'Applicable to GG2/GG3/GG4 only' },
        coresTotal:        { type: 'number', description: 'Total cores submitted from this site' },
        coresPositive:     { type: 'number', description: 'Cores involved by carcinoma from this site' },
        corePctInvolvement: {
          type: 'array',
          items: { type: 'number' },
          description: 'Percentage of each positive core involved by tumor. One entry per positive core, e.g. [40, 20] for 2 positive cores.',
        },
        perineumralInvasion: { type: 'string', enum: ['Not identified', 'Present'], description: 'Perineural invasion (optional)' },
        lvi:                 { type: 'string', enum: ['Not identified', 'Present'], description: 'Lymphovascular invasion (optional)' },
      },
    },
  },
  {
    name: 'set_specimen_benign',
    description: 'Mark a specimen as benign prostatic tissue. Optionally record additional findings.',
    input_schema: {
      type: 'object',
      required: ['letter'],
      properties: {
        letter: { type: 'string' },
        additionalFindings: {
          type: 'array',
          items: { type: 'string' },
          description: 'e.g. ["High-grade prostatic intraepithelial neoplasia (PIN)", "Atypical small acinar proliferation (ASAP)", "Atypical intraductal proliferation (AIP)", "Inflammation (acute)", "Inflammation (chronic)"]',
        },
      },
    },
  },
  {
    name: 'set_specimen_pin4',
    description: 'Record a PIN4 IHC result for a specimen. Adds CPT add-on code 88344.',
    input_schema: {
      type: 'object',
      required: ['letter', 'pin4Result'],
      properties: {
        letter:     { type: 'string' },
        pin4Block:  { type: 'string', description: 'Block ID where PIN4 was performed, e.g. "A1" or "A". Ask the pathologist.' },
        pin4Result: { type: 'string', enum: ['Positive for carcinoma', 'Negative for carcinoma'], description: 'Whether PIN4 confirms or excludes carcinoma.' },
      },
    },
  },
  {
    name: 'set_case_summary',
    description: 'Set case-level findings: periprostatic fat invasion, seminal vesicle invasion, treatment effect, and any case comment.',
    input_schema: {
      type: 'object',
      properties: {
        periprosataticFatInvasion: {
          type: 'string',
          enum: ['Not identified', 'Present', 'Equivocal', 'Cannot be determined'],
          description: 'Fat is rarely intrinsic to prostate; its presence implies ≥pT3a. Only ask if fat is present in specimen.',
        },
        seminalVesicleInvasion: {
          type: 'string',
          enum: ['Not identified', 'Present', 'Equivocal', 'Cannot be determined'],
          description: 'Only ask if seminal vesicle was submitted.',
        },
        treatmentEffect: {
          type: 'string',
          description: 'e.g. "No known presurgical therapy", "Radiation therapy effect present", "Hormonal therapy effect present"',
        },
        caseComment: { type: 'string', description: 'Optional free-text comment for the report' },
      },
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble and finalize the prostate biopsy report. Call only after all specimens have been processed.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeProstateTool(name, args, caseData) {
  const c = JSON.parse(JSON.stringify(caseData));

  switch (name) {

    case 'set_intake': {
      if (args.clinicalHistory != null) c.priorHistory.clinicalHistory = args.clinicalHistory;
      if (args.psaLevel        != null) c.priorHistory.psaLevel        = args.psaLevel;
      if (args.procedure       != null) c.procedure                    = args.procedure;
      return { case: c, result: { ok: true } };
    }

    case 'add_specimen': {
      const letter = String(args.letter || '').toUpperCase();
      if (!letter) return { error: 'add_specimen: letter is required' };
      const existing = (c.specimens || []).find(s => s.letter === letter);
      if (existing) {
        c.specimens = c.specimens.map(s => s.letter === letter
          ? { ...s, designation: args.designation || s.designation, location: args.location || s.location }
          : s
        );
      } else {
        const spec = emptyProstateBiopsySpecimen();
        spec.letter      = letter;
        spec.designation = args.designation || '';
        spec.location    = args.location    || '';
        c.specimens = [...(c.specimens || []), spec];
      }
      c.specimens.sort((a, b) => a.letter.localeCompare(b.letter));
      return { case: c, result: { ok: true, letter } };
    }

    case 'set_specimen_carcinoma': {
      const letter = String(args.letter || '').toUpperCase();
      const idx = (c.specimens || []).findIndex(s => s.letter === letter);
      if (idx === -1) return { error: `Specimen ${letter} not found — call add_specimen first` };

      const g1 = Number(args.gleasonPrimary);
      const g2 = Number(args.gleasonSecondary);
      const grade = computeGradeGroup(g1, g2);
      if (!grade) return { error: `Invalid Gleason combination: ${g1}+${g2}` };

      const s = c.specimens[idx];
      s.hasCarcinoma  = true;
      s.histologicType = args.histologicType || 'Acinar adenocarcinoma, conventional (usual)';
      s.gleasonPrimary   = g1;
      s.gleasonSecondary = g2;
      s.gleasonScore     = grade.gleasonScore;
      s.gradeGroup       = grade.gradeGroup;
      s.gradeGroupLabel  = grade.label;

      // Pattern 4 %
      if (args.pattern4Pct != null)       s.pattern4Pct        = args.pattern4Pct;
      if (args.pattern4PctNumeric != null) s.pattern4PctNumeric = args.pattern4PctNumeric;
      if (args.pattern5PctNumeric != null) s.pattern5PctNumeric = args.pattern5PctNumeric;

      // IDC / cribriform
      if (args.idc != null)                     s.idc                      = args.idc;
      if (args.idcIncorporatedIntoGrade != null) s.idcIncorporatedIntoGrade = args.idcIncorporatedIntoGrade;
      if (args.cribriformGlands != null)         s.cribriformGlands         = args.cribriformGlands;

      // Quantitation
      if (args.coresTotal        != null) s.coresTotal        = args.coresTotal;
      if (args.coresPositive     != null) s.coresPositive     = args.coresPositive;
      if (args.corePctInvolvement != null) s.corePctInvolvement = args.corePctInvolvement;

      // Ancillary
      if (args.perineumralInvasion != null) s.perineumralInvasion = args.perineumralInvasion;
      if (args.lvi                 != null) s.lvi                 = args.lvi;

      return {
        case: c,
        result: {
          letter,
          gradeGroup:      grade.gradeGroup,
          gleasonScore:    grade.gleasonScore,
          gradeGroupLabel: grade.label,
          showPattern4:    grade.showPattern4,
          pattern4Options: grade.gradeGroup === 2
            ? PATTERN4_PCT_OPTIONS_GG2
            : grade.gradeGroup === 3
            ? PATTERN4_PCT_OPTIONS_GG3
            : null,
        },
      };
    }

    case 'set_specimen_benign': {
      const letter = String(args.letter || '').toUpperCase();
      const idx = (c.specimens || []).findIndex(s => s.letter === letter);
      if (idx === -1) return { error: `Specimen ${letter} not found — call add_specimen first` };
      c.specimens[idx].hasCarcinoma       = false;
      c.specimens[idx].additionalFindings = args.additionalFindings || [];
      return { case: c, result: { ok: true, letter } };
    }

    case 'set_specimen_pin4': {
      const letter = String(args.letter || '').toUpperCase();
      const idx = (c.specimens || []).findIndex(s => s.letter === letter);
      if (idx === -1) return { error: `Specimen ${letter} not found` };
      c.specimens[idx].pin4Performed = true;
      c.specimens[idx].pin4Block     = args.pin4Block  || '';
      c.specimens[idx].pin4Result    = args.pin4Result || '';
      // Add 88344 CPT add-on if not already present
      const addons = c.specimens[idx].cptAddons || [];
      if (!addons.includes('88344')) {
        c.specimens[idx].cptAddons = [...addons, '88344'];
      }
      return { case: c, result: { ok: true, letter, cptAdded: '88344' } };
    }

    case 'set_case_summary': {
      if (args.periprosataticFatInvasion != null) c.periprosataticFatInvasion = args.periprosataticFatInvasion;
      if (args.seminalVesicleInvasion    != null) c.seminalVesicleInvasion    = args.seminalVesicleInvasion;
      if (args.treatmentEffect           != null) c.treatmentEffect           = args.treatmentEffect;
      if (args.caseComment               != null) c.caseComment               = args.caseComment;
      return { case: c, result: { ok: true } };
    }

    case 'assemble_report': {
      return { case: c, result: { assembled: true } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

export const PROSTATE_SYSTEM_PROMPT = `You are an expert genitourinary pathology reporting assistant specializing in prostate needle core biopsy reporting. You follow the CAP Protocol (Prostate.Needle.Case.Bx v1.1.0.0, September 2023, WHO 5th Edition).

## WORKFLOW — follow this exact order:

### 1. Intake
Ask for:
- Clinical history / indication
- Serum PSA level (e.g., "8.5 ng/mL")
- Biopsy type: Systematic, Targeted, or both?
Call set_intake with all collected information.

### 2. Collect ALL specimen designations first
Ask: "Please list all specimen designations (e.g., A. Prostate, left apex, core needle biopsy; B. Prostate, right apex, core needle biopsy...)."
- Call add_specimen once per specimen.
- Designation format: "PROSTATE, [SIDE] [ZONE], CORE NEEDLE BIOPSY"
- Common locations: Left/Right Apex (LA/RA), Left/Right Mid (LM/RM), Left/Right Base (LB/RB), Left/Right Transition Zone (LTZ/RTZ)
- Include lateral (L), medial (M) sub-sites when provided: Left Apex Lateral (LAL), Left Base Medial (LBM), etc.
- After ALL specimens are added, proceed to diagnoses.

### 3. Diagnoses — go through each specimen
For each specimen, ask: "Specimen [X] — carcinoma present or benign?"

**If CARCINOMA:**
a) Ask for Gleason grade: "Primary pattern (3/4/5) and secondary pattern (3/4/5)?"
   The system automatically computes the grade group — announce it to the pathologist:
   "Grade group [N] (Gleason Score [P] + [S] = [total]) — confirmed?"
b) If grade group is 2 (3+4) or 3 (4+3): ask for percentage of pattern 4:
   - GG2 options: <5% / 6-10% / 11-20% / 21-30% / 31-40%
   - GG3 options: <61% / 61-70% / 71-80% / 81-90% / >90%
   NOTE: Pattern 4 % is NOT required if other specimens have Gleason score ≥ 8 (GG4/GG5).
c) Ask for tumor quantitation:
   - "How many total cores from this site?"
   - "How many cores are positive for carcinoma?"
   - "What is the percentage of prostatic tissue involved by tumor in each positive core?" (one % per core)
d) Ask about intraductal carcinoma (IDC):
   - "Intraductal carcinoma: Not identified or Present?"
   - If Present: "IDC incorporated into grade: Yes or No?"
e) Ask about cribriform glands (applicable to GG2/GG3/GG4 only):
   - "Cribriform glands: Not identified / Present / Equivocal / Cannot be determined?"
f) Ask about perineural invasion (optional):
   - "Perineural invasion: Present or Not identified? (skip if not assessed)"
g) Ask about lymphovascular invasion (optional, less commonly assessed in biopsies):
   - Only ask if the pathologist mentions it, or in high-grade cases (GG4/GG5).
h) Call set_specimen_carcinoma with all collected fields.

**If BENIGN:**
a) Ask: "Any additional findings? (High-grade PIN, ASAP, AIP, inflammation, or none?)"
b) Call set_specimen_benign with optional additionalFindings array.

### 4. PIN4 IHC (if performed for any specimen)
After each specimen's diagnosis is set, ask: "Was PIN4 immunohistochemistry performed for specimen [X]?"
- If yes: ask "Which block was PIN4 performed on?" and "Result: Positive for carcinoma or Negative for carcinoma?"
- Call set_specimen_pin4 with pin4Block (e.g. "A1") and pin4Result ("Positive for carcinoma" or "Negative for carcinoma").
- The report automatically generates the full standardized PIN4 paragraph — do NOT write it yourself.
- This automatically adds CPT add-on 88344 for each specimen.

### 5. Case-level summary
After all specimens are processed, ask:
a) "Was periprostatic fat present in any specimen? If yes, was fat invasion identified?"
b) "Were seminal vesicles submitted? If yes, any involvement?"
c) "Any treatment effect (radiation, hormonal therapy)?" Default: "No known presurgical therapy."
d) "Any additional case-level comments?"
Call set_case_summary.

### 6. Finalize
Call assemble_report.
Present the formatted report.

## GRADE GROUP QUICK REFERENCE:
| Primary | Secondary | Score | Grade Group |
|---------|-----------|-------|-------------|
| 3 | 3 | 6 | GG1 |
| 3 | 4 | 7 | GG2 (ask % Pattern 4) |
| 4 | 3 | 7 | GG3 (ask % Pattern 4) |
| 4 | 4 | 8 | GG4 |
| 3 | 5 | 8 | GG4 |
| 5 | 3 | 8 | GG4 |
| 4 | 5 | 9 | GG5 |
| 5 | 4 | 9 | GG5 |
| 5 | 5 | 10 | GG5 |

## KEY RULES:
- Announce the computed grade group clearly after receiving primary + secondary patterns.
- Pattern 4 % sub-fields: GG2 → options are <5%, 6-10%, 11-20%, 21-30%, 31-40%; GG3 → <61%, 61-70%, 71-80%, 81-90%, >90%.
- IDC: always ask; if present, ask about grading incorporation.
- Cribriform glands: only applicable to GG2 (score 7), GG3 (score 7), and GG4 (score 8).
- PIN4 IHC: billed as CPT 88344 add-on per specimen — confirm if performed.
- Only high-grade PIN (not low-grade) is reportable as an additional finding.
- Do NOT ask about received date — not relevant for prostate biopsies.
- Keep questions focused: one topic at a time; do not overwhelm the pathologist.
`;
