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
    description: 'Add or update a specimen. Use the VERBATIM designation exactly as stated by the pathologist. The specimen category (surgical vs cytology) is auto-detected from the designation. CPT is auto-suggested but can be overridden. If the user provides a gross description, store it verbatim in grossDescription.',
    input_schema: {
      type: 'object',
      required: ['letter', 'designation'],
      properties: {
        letter: { type: 'string', description: 'Specimen letter: A, B, C...' },
        designation: { type: 'string', description: 'Full verbatim designation, e.g. "LUNG, RIGHT UPPER LOBE, NODULE BIOPSY" or "THYROID, RIGHT LOBE, FINE NEEDLE ASPIRATION (ThinPrep & Cell block)"' },
        grossDescription: { type: 'string', description: 'The verbatim gross description as dictated or typed by the pathologist, if provided.' },
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
    description: 'Set the final diagnosis for a specimen. ALWAYS use diagnosisLines (array) for ALL specimen types — surgical path AND cytology. Never use diagnosisLine. The first element is the main morphologic diagnosis; additional elements are ancillary findings (e.g. H. pylori result, special stain result, dysplasia/malignancy status). The assembler auto-appends ", SEE COMMENT" to the first bullet when a comment is present — do NOT add it yourself.',
    input_schema: {
      type: 'object',
      required: ['letter', 'diagnosisLines'],
      properties: {
        letter: { type: 'string' },
        diagnosisLines: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of ALL diagnosis bullet strings. First = main diagnosis (e.g. "GASTRIC ANTRAL MUCOSA WITH CHRONIC GASTRITIS"). Additional bullets for ancillary findings, e.g. "(NO) HELICOBACTER PYLORI IDENTIFIED WITH IMMUNOHISTOCHEMISTRY", "NO EVIDENCE OF DYSPLASIA OR MALIGNANCY". ALL CAPS.',
        },
        comment: { type: 'string', description: 'The diagnostic comment paragraph (from Airtable or AI-generated)' },
        commentSource: { type: 'string', enum: ['airtable', 'ai', 'manual'], description: 'Source of the comment' },
        organ: { type: 'string', description: 'Organ keyword for Airtable save-back, e.g. "lung"' },
        markers: {
          type: 'object',
          description: 'Carcinoma biomarker info. Set whenever a carcinoma diagnosis is rendered and markers are pending or available.',
          properties: {
            status: { type: 'string', enum: ['pending', 'available'], description: '"pending" = results not yet back; "available" = results in hand' },
            list: { type: 'array', items: { type: 'string' }, description: 'Marker names, e.g. ["ER", "PR", "HER2", "KI-67"]' },
            results: { type: 'string', description: 'Full result string when status is "available", e.g. "ER POSITIVE (90%), PR POSITIVE, HER2 NEGATIVE (1+), KI-67 25%"' },
          },
          required: ['status', 'list'],
        },
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
        grossDescription: args.grossDescription || '',
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
      if (args.grossDescription != null) s.grossDescription = args.grossDescription;
      if (args.diagnosisLine    != null) s.diagnosisLine    = args.diagnosisLine;
      if (args.diagnosisLines   != null) s.diagnosisLines   = args.diagnosisLines;
      if (args.comment          != null) s.comment          = args.comment;
      if (args.commentSource    != null) s.commentSource    = args.commentSource;
      if (args.organ            != null) s.organ            = args.organ;
      if (args.markers          != null) s.markers          = args.markers;

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
  - If the user also provides a gross description, pass it in grossDescription verbatim.
  - Examples of designations:
    - Surgical: "LUNG, RIGHT UPPER LOBE, NEEDLE CORE BIOPSY"
    - Cytology FNA: "THYROID, LEFT LOBE, FINE NEEDLE ASPIRATION (ThinPrep & Cell block)"
    - Cytology fluid: "PLEURAL FLUID, RIGHT, THORACENTESIS (ThinPrep & cell block)"
    - Mixed: "LUNG, RUL, NODULE BIOPSY (with Touch prep)"

### 3. Diagnosis & Comment — FOR EACH SPECIMEN:

**When the user provides a gross description instead of (or in addition to) a stated diagnosis:**
- Read the gross description carefully and derive the most precise diagnostic line you can.
- For typical gross-only benign/precancerous specimens, the gross description IS the primary data source.
  - Polyp size, morphology, number → determines adenoma type and grade (e.g. "TUBULAR ADENOMA WITH LOW-GRADE DYSPLASIA")
  - Cyst type, lining, contents → determines cyst diagnosis (e.g. "BENIGN FOLLICULAR CYST")
  - Skin lesion morphology → determines likely dx (e.g. "COMPOUND MELANOCYTIC NEVUS")
  - Cervical lesion → CIN grade, SCC, AIS, etc.
- Derive the SHORT CAPS diagnostic line (what would appear in the report).
- Use the derived diagnosis as the keyword for lookup_airtable_comment.
- If the gross is ambiguous, make your best inference and note it to the pathologist.

a) Obtain the diagnosis — either stated by the pathologist OR derived from gross description.
b) IMMEDIATELY call lookup_airtable_comment with the diagnosis keyword and organ.
c) If found (found: true): use the returned comment. Inform the user: "Found in PathPattern: [name]." Use that comment verbatim.
d) If not found (found: false): generate a professional diagnostic comment yourself that includes:
   - Histologic/cytologic description appropriate to the diagnosis
   - IHC panel with expected results (if applicable for that diagnosis)
   - Special stains (PAS, GMS, AFB, mucicarmine, etc.) if relevant
   - Any prognostic or clinical correlation comments
   Tell the user: "No PathPattern entry found — I've generated a comment. You can save it to Airtable after review."
e) Call set_specimen_diagnosis with:
   - ALWAYS use diagnosisLines (array) — for BOTH surgical path AND cytology. Never use diagnosisLine.
   - First element = main morphologic diagnosis in ALL CAPS, e.g. "TUBULAR ADENOMA WITH LOW-GRADE DYSPLASIA"
   - Add additional bullet strings for ancillary findings:
     • H. pylori status: "(NO) HELICOBACTER PYLORI IDENTIFIED WITH IMMUNOHISTOCHEMISTRY"
     • Special stain results: "PAS: NO ORGANISMS SEEN", "GMS: NEGATIVE FOR FUNGAL ELEMENTS"
     • Dysplasia / malignancy: "NO EVIDENCE OF DYSPLASIA OR MALIGNANCY" (always include for GI biopsies)
     • Polyp completeness: "MARGINS FREE OF DYSPLASIA" or "MARGIN STATUS CANNOT BE ASSESSED"
     • Cytology: "ALVEOLAR MACROPHAGES AND BRONCHIAL CELLS", "NEGATIVE FOR MALIGNANCY"
   - Do NOT add "SEE COMMENT" to any bullet — the assembler adds it automatically to the first bullet.
   - Always set comment (paragraph text) and commentSource ('airtable' or 'ai').
   - Always set organ (e.g. "lung") for save-back capability.
   - **For carcinoma diagnoses** (any malignancy: invasive carcinoma, adenocarcinoma, SCC, DCIS, lymphoma, sarcoma, etc.):
     Set the markers field. Ask the pathologist: "Are biomarkers pending or available?"
     • If pending: set markers = { status: "pending", list: ["ER", "PR", "HER2", "KI-67"] } (or whatever markers apply to that tumor type)
     • If available: set markers = { status: "available", list: [...], results: "ER POSITIVE (90%), PR NEGATIVE, HER2 NEGATIVE (1+), KI-67 25%" }
     • If no markers ordered: omit the markers field (leave null).
     The assembler will auto-render the appropriate bullet line — do NOT add a markers bullet to diagnosisLines yourself.

### 4. IHC (if performed)
- Ask if any IHC stains were performed.
- For each stain, call add_ihc_entry.

### 5. Finalize
- Call assemble_report.
- Present the formatted report.
- For any specimen where commentSource is 'ai', offer: "Would you like to save the AI-generated comment for [specimen organ/diagnosis] to Airtable PathPattern for future reuse?"

## OUTPUT FORMAT — ALL specimen types use bullet-dash:

\`\`\`
A. DESIGNATION:
      -     MAIN DIAGNOSIS, SEE COMMENT
      -     ANCILLARY LINE (e.g. H. PYLORI STATUS, SPECIAL STAIN RESULT)
      -     DYSPLASIA / MALIGNANCY STATUS LINE

Comment: [paragraph text]
\`\`\`

Example (gastric biopsy):
\`\`\`
A. STOMACH, ANTRUM, BIOPSY:
      -     GASTRIC ANTRAL MUCOSA WITH CHRONIC GASTRITIS AND COMPLETE-TYPE INTESTINAL METAPLASIA, SEE COMMENT
      -     (NO) HELICOBACTER PYLORI IDENTIFIED WITH IMMUNOHISTOCHEMISTRY
      -     NO EVIDENCE OF DYSPLASIA OR MALIGNANCY

Comment: [paragraph]
\`\`\`

Example (cytology FNA):
\`\`\`
A. THYROID, LEFT LOBE, FNA:
      -     NEGATIVE FOR MALIGNANCY, SEE COMMENT
      -     BENIGN FOLLICULAR NODULE
      -     BETHESDA CATEGORY II

Comment: [paragraph]
\`\`\`

Example (carcinoma — biomarkers pending):
\`\`\`
A. BREAST, RIGHT, CORE BIOPSY:
      -     INVASIVE DUCTAL CARCINOMA, GRADE 2, SEE COMMENT
      -     PENDING FOR BIOMARKERS (ER, PR, HER2, KI-67)

Comment: [paragraph]
\`\`\`

Example (carcinoma — biomarkers available):
\`\`\`
A. BREAST, RIGHT, CORE BIOPSY:
      -     INVASIVE DUCTAL CARCINOMA, GRADE 2, SEE COMMENT
      -     ER POSITIVE (90%), PR POSITIVE, HER2 NEGATIVE (1+), KI-67 25%

Comment: [paragraph]
\`\`\`

The assembler adds ", SEE COMMENT" to the first bullet automatically when a comment is present. Do NOT include it in diagnosisLines. The biomarker bullet is also rendered automatically from the markers field — do NOT add it to diagnosisLines.

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
