/**
 * Agent tools for the General Pathology / Cytology module.
 *
 * Covers any organ and any specimen type (surgical path + cytology).
 * Integrates with Airtable PathPattern for diagnostic comment lookup.
 */

import { detectSpecimenCategory, suggestPathologyCpt } from './cptBilling.js';
import { lookupDiagnosticComment } from './airtableClient.js';

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const PATHOLOGY_TOOL_SCHEMAS = [
  {
    name: 'set_intake',
    description: 'Set case intake information: received date and clinical history.',
    input_schema: {
      type: 'object',
      properties: {
        receivedDate: { type: 'string', description: 'YYYY-MM-DD format' },
        clinicalHistory: { type: 'string' },
      },
    },
  },
  {
    name: 'add_specimen',
    description: 'Add or update a specimen. Use the VERBATIM designation exactly as stated by the pathologist. The specimen category (surgical vs cytology) is auto-detected from the designation. CPT is auto-suggested but can be overridden.',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter: { type: 'string', description: 'Specimen letter: A, B, C...' },
        designation: { type: 'string', description: 'Full verbatim designation, e.g. "LUNG, RIGHT UPPER LOBE, NODULE BIOPSY" or "THYROID, RIGHT LOBE, FINE NEEDLE ASPIRATION (ThinPrep & Cell block)"' },
        cptOverride: { type: 'string', description: 'Override auto-detected CPT code if needed' },
        cptAddons: { type: 'array', items: { type: 'string' }, description: 'Additional CPT codes (e.g. ["88108"] for cell block add-on)' },
      },
    },
  },
  {
    name: 'lookup_airtable_comment',
    description: 'Search Airtable PathPattern database for a diagnostic comment matching the given organ and diagnosis. Returns the comment text if found. ALWAYS call this before set_specimen_diagnosis for every specimen.',
    input_schema: {
      type: 'object',
      required: ['diagnosisKeyword'],
      properties: {
        diagnosisKeyword: { type: 'string', description: 'The diagnosis keyword to search for, e.g. "adenocarcinoma", "benign follicular nodule", "negative for malignancy"' },
        organKeyword: { type: 'string', description: 'The organ to narrow the search, e.g. "lung", "thyroid", "skin"' },
      },
    },
  },
  {
    name: 'set_specimen_diagnosis',
    description: 'Set the final diagnosis for a specimen. For surgical path, provide a single diagnosisLine (e.g. "ADENOCARCINOMA"). For cytology, provide diagnosisLines (array of bullet strings). Always set the comment from Airtable or AI-generated text.',
    input_schema: {
      type: 'object',
      required: ['letter'],
      properties: {
        letter: { type: 'string' },
        diagnosisLine: { type: 'string', description: 'For surgical path: the main diagnosis line, e.g. "ADENOCARCINOMA"' },
        diagnosisLines: {
          type: 'array',
          items: { type: 'string' },
          description: 'For cytology: array of bullet-point diagnosis strings, e.g. ["NEGATIVE FOR MALIGNANCY", "ALVEOLAR MACROPHAGES AND BLOOD"]',
        },
        comment: { type: 'string', description: 'The diagnostic comment paragraph (from Airtable or AI-generated)' },
        commentSource: { type: 'string', enum: ['airtable', 'ai', 'manual'], description: 'Source of the comment' },
        organ: { type: 'string', description: 'Organ keyword for Airtable save-back, e.g. "lung"' },
      },
    },
  },
  {
    name: 'add_ihc_entry',
    description: 'Log an immunohistochemistry result for a specimen.',
    input_schema: {
      type: 'object',
      required: ['specimenLetter', 'antibody', 'finding', 'sentence'],
      properties: {
        specimenLetter: { type: 'string' },
        block: { type: 'string' },
        antibody: { type: 'string' },
        finding: { type: 'string' },
        sentence: { type: 'string', description: 'Clean one-sentence IHC comment' },
      },
    },
  },
  {
    name: 'request_clarification',
    description: 'Ask the pathologist for missing or ambiguous information.',
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
    description: 'Assemble and finalize the pathology report. Call only when all specimens have diagnosis and comment set.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executePathologyTool(name, args, caseData) {
  const c = JSON.parse(JSON.stringify(caseData));

  switch (name) {
    case 'set_intake': {
      if (args.receivedDate) c.receivedDate = args.receivedDate;
      if (args.clinicalHistory != null) {
        c.priorHistory = { ...c.priorHistory, clinicalHistory: args.clinicalHistory };
      }
      return { case: c, result: { ok: true } };
    }

    case 'add_specimen': {
      const letter = String(args.letter || '').toUpperCase();
      if (!letter) return { error: 'add_specimen: letter is required' };

      const designation = args.designation || '';
      const billing = suggestPathologyCpt(designation);
      const cpt = args.cptOverride || billing.cpt;
      const cptAddons = args.cptAddons || billing.addons.map(a => a.cpt);

      const entry = {
        letter,
        designation,
        specimenCategory: billing.category,
        organ: '',
        diagnosisLine: '',
        diagnosisLines: [],
        comment: '',
        commentSource: null,
        cpt,
        cptAddons,
      };

      const existing = (c.specimens || []).find(s => s.letter === letter);
      if (existing) {
        c.specimens = c.specimens.map(s => s.letter === letter ? { ...s, ...entry } : s);
      } else {
        c.specimens = [...(c.specimens || []), entry];
      }
      c.specimens.sort((a, b) => a.letter.localeCompare(b.letter));

      return {
        case: c,
        result: {
          letter,
          designation,
          specimenCategory: billing.category,
          cpt,
          cptAddons,
          cptLabel: billing.label,
        },
      };
    }

    case 'lookup_airtable_comment': {
      const { diagnosisKeyword, organKeyword } = args;
      if (!diagnosisKeyword) return { error: 'diagnosisKeyword is required' };

      try {
        const found = await lookupDiagnosticComment(diagnosisKeyword, organKeyword || '');
        if (found && found.comment) {
          return {
            case: c,
            result: {
              found: true,
              name: found.name,
              comment: found.comment,
              diagnoses: found.diagnoses,
              note: found.note,
            },
          };
        }
        return { case: c, result: { found: false, comment: null } };
      } catch (e) {
        return { case: c, result: { found: false, error: String(e?.message || e) } };
      }
    }

    case 'set_specimen_diagnosis': {
      const letter = String(args.letter || '').toUpperCase();
      if (!letter) return { error: 'set_specimen_diagnosis: letter is required' };

      const idx = (c.specimens || []).findIndex(s => s.letter === letter);
      if (idx === -1) return { error: `Specimen ${letter} not found — call add_specimen first` };

      const s = c.specimens[idx];
      if (args.diagnosisLine  != null) s.diagnosisLine  = args.diagnosisLine;
      if (args.diagnosisLines != null) s.diagnosisLines = args.diagnosisLines;
      if (args.comment        != null) s.comment        = args.comment;
      if (args.commentSource  != null) s.commentSource  = args.commentSource;
      if (args.organ          != null) s.organ          = args.organ;

      return { case: c, result: { letter, set: true } };
    }

    case 'add_ihc_entry': {
      const entry = {
        specimenLetter: String(args.specimenLetter || '').toUpperCase(),
        block:    args.block    || '',
        antibody: args.antibody || '',
        finding:  args.finding  || '',
        sentence: args.sentence || '',
      };
      c.ihc = [...(c.ihc || []), entry];
      return { case: c, result: { added: entry } };
    }

    case 'request_clarification': {
      return { case: c, result: { ask: { field: args.field, question: args.question } } };
    }

    case 'assemble_report': {
      return { case: c, result: { assembled: true } };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

export const PATHOLOGY_SYSTEM_PROMPT = `You are an expert surgical pathology and cytopathology reporting assistant. Your role is to conduct a structured interview with the pathologist, look up diagnostic comments from the PathPattern database (Airtable), and build a complete, properly formatted pathology report.

## WORKFLOW — follow this exact order:

### 1. Intake
- Ask for the received date (if not provided).
- Ask for clinical history / indication.
- Call set_intake with the information.

### 2. Specimens
For each specimen the user describes:
- Call add_specimen with the VERBATIM designation (letter + designation exactly as dictated).
  - The system auto-detects specimen category (surgical path vs cytology) and CPT from the designation.
  - Examples of designations:
    - Surgical: "LUNG, RIGHT UPPER LOBE, NEEDLE CORE BIOPSY"
    - Cytology FNA: "THYROID, LEFT LOBE, FINE NEEDLE ASPIRATION (ThinPrep & Cell block)"
    - Cytology fluid: "PLEURAL FLUID, RIGHT, THORACENTESIS (ThinPrep & cell block)"
    - Mixed: "LUNG, RUL, NODULE BIOPSY (with Touch prep)"

### 3. Diagnosis & Comment — FOR EACH SPECIMEN:
a) Ask the pathologist for the diagnosis (a word or short phrase is fine, e.g. "adenocarcinoma", "benign follicular nodule", "negative for malignancy").
b) IMMEDIATELY call lookup_airtable_comment with the diagnosis keyword and organ.
c) If found (found: true): use the returned comment. Inform the user: "Found in PathPattern: [name]." Use that comment verbatim.
d) If not found (found: false): generate a professional diagnostic comment yourself that includes:
   - Histologic/cytologic description appropriate to the diagnosis
   - IHC panel with expected results (if applicable for that diagnosis)
   - Special stains (PAS, GMS, AFB, mucicarmine, etc.) if relevant
   - Any prognostic or clinical correlation comments
   Tell the user: "No PathPattern entry found — I've generated a comment. You can save it to Airtable after review."
e) Call set_specimen_diagnosis with:
   - For SURGICAL PATH: diagnosisLine (e.g. "ADENOCARCINOMA"), comment, commentSource
   - For CYTOLOGY: diagnosisLines (array of bullet strings, e.g. ["NEGATIVE FOR MALIGNANCY", "ALVEOLAR MACROPHAGES AND BRONCHIAL CELLS"]), comment (if any), commentSource
   - Always set organ (e.g. "lung") for save-back capability.

### 4. IHC (if performed)
- Ask if any IHC stains were performed.
- For each stain, call add_ihc_entry.

### 5. Finalize
- Call assemble_report.
- Present the formatted report.
- For any specimen where commentSource is 'ai', offer: "Would you like to save the AI-generated comment for [specimen organ/diagnosis] to Airtable PathPattern for future reuse?"

## OUTPUT FORMATS:

### Surgical path specimen:
\`\`\`
A. DESIGNATION: DIAGNOSIS, see comment.

Comment: [paragraph text]
\`\`\`

### Cytology specimen:
\`\`\`
A. DESIGNATION:
      -     DIAGNOSIS LINE 1
      -     DIAGNOSIS LINE 2

Comment: [paragraph if present]
\`\`\`

## CPT CODING:
The system auto-assigns CPT codes. Common codes:
- Surgical biopsies: 88305 (most biopsies), 88307 (lumpectomy, sentinel node), 88309 (radical resections)
- FNA interpretation: 88173 (1st site), 88174 (each additional site)
- Cell block: 88108 (add-on)
- Liquid-based cytology (ThinPrep/SurePath): 88112
- Smears/touch preps: 88104
- BAL/fluid concentration: 88108

## IMPORTANT RULES:
- Always look up PathPattern BEFORE generating a comment.
- Present specimen designations in ALL CAPS.
- Keep cytology bullet lines concise and in ALL CAPS.
- Never abbreviate the designation — use it exactly as stated.
- If the user says "the diagnosis is the same as before" or similar, still call lookup_airtable_comment fresh.
- Do not call assemble_report until all specimens have a diagnosis and comment set.
`;
