# Carcinoma Stager — Full Module Context

This file captures the complete business logic, data models, and design decisions for every
module. Read CLAUDE.md first for stack/setup; this file covers the "what and why" per module.

---

## How a case flows through the system

1. User picks a module in the React SPA → frontend sends `POST /api/agent` with
   `{ caseData, userMessage }`.
2. `server/agent.js` reads `caseData.organ` and routes to the correct tool set + system prompt.
3. The AI calls tool functions (e.g. `add_specimen`, `set_tumor`) in a loop; each call returns
   an updated `caseData` object.
4. When the AI calls `assemble_report`, `server/reportAssembler.js` → module assembler builds
   the report text and stores it in `caseData.reportText`.
5. Frontend displays the report in `ReportPreview.tsx`. Meditech-safe toggle strips em-dash,
   en-dash, smart quotes for LIS paste.

**Routing in `agent.js`:**
```
organ === 'endometrium' → ENDO tools/prompt/executor
organ === 'prostate'    → PROSTATE tools/prompt/executor
organ === 'lung'        → LUNG tools/prompt/executor
organ === 'pathology'   → PATHOLOGY tools/prompt/executor
(default)               → BREAST tools/prompt/executor
```

---

## Module 1 — Breast Carcinoma

**Files:** `server/agentTools.js`, `server/billing.js`, `server/reportAssembler.js`,
`server/finalDx.js`, `server/caseModel.js`, `server/cap/excisionDCIS.js`,
`server/cap/excisionInvasive.js`

**Modes:** `excision-DCIS` | `excision-invasive` | `biopsy-DCIS` | `biopsy-invasive`

**Key rules:**
- Specimen order always A → B → C in final diagnosis (sort by `letter`)
- DCIS extent auto-computed: `blocksWithDCIS × 4 mm` if `dcisExtentMm` not set explicitly
- DCIS-only cases: only ask ER and PR — never HER2 or Ki-67 (agent check on `mode`)
- pN omitted from final diagnosis when `pnCategory` matches `/not\s+assigned/i`
- Sentinel node `(sn)` modifier auto-applied in CAP synoptic when `sentinelExamined > 0` AND
  `totalExamined < 6`

**CPT billing (`billing.js`):**
- frozen section → 88331 (88332 add-on per additional site on same specimen)
- radical/modified radical mastectomy → 88309
- any other mastectomy → 88309
- sentinel lymph node → 88307
- lumpectomy / partial mastectomy → 88307
- shave/additional margin: benign → 88305; carcinoma/DCIS present → 88307
- IHC: first antibody per specimen → 88342; each additional → 88341; Ki-67 → 88360
- Same antibody on same specimen counted once only
- Modifier `-26` supported globally for professional component

**`renderCptSummary` in `reportAssembler.js`:**
- Per-specimen line + inline IHC display
- `s.cptAddons` counted in totals (88332 add-ons)
- ALL IHC codes counted unconditionally (not limited to matched specimen letters)
- TOTALS line always rendered at bottom

---

## Module 2 — Endometrial Carcinoma

**Files:** `server/endometrial/agentTools.js`, `server/endometrial/caseModel.js`,
`server/endometrial/finalDx.js`, `server/endometrial/capSynoptic.js`,
`server/endometrial/reportAssembler.js`

**Key rules:**
- Final diagnosis header includes procedure from `cap.specimen.procedure` if not already in
  the verbatim designation (appended automatically in `buildEndometrialFinalDx`)
- FIGO Stage 2009 — rationale appended in both final diagnosis and CAP synoptic, e.g.:
  `FIGO STAGE (2009): IB — TUMOR INVADES ≥50% OF MYOMETRIUM`
- FIGO Stage 2023 — rationale also appended, using the detailed FIGO 2023 criteria map

**MARGINS section (CAP Note K):**
Required only when cervix/parametrium/paracervix is involved.
Fields: `margins.status` / `margins.distanceQualifier` / `margins.closestMm` /
`margins.closestLocations[]` / `margins.involvedLocations[]`
Location options: Ectocervical | Vaginal cuff | Parametrial | Paracervical | Other
Distance qualifier options: 'Exact distance' | 'At least' | 'Less than' | 'Less than 1 mm' |
'Cannot be determined'

**Staging:** AJCC 8th + FIGO 2009 + FIGO 2023 (all three rendered if provided)
pT1a = <50% MI; pT1b = ≥50% MI; pT2 = cervical stromal; pT3a = serosa/adnexa; pT3b = vaginal/
parametrial; pT4 = bladder/bowel mucosa

**Biomarkers:** ER, PR, MMR (MLH1/MSH2/MSH6/PMS2), p53, representative block for molecular
MIPS: Measure #491 (MMR/MSI testing) — suggested when MMR IHC performed

**CPT:** hysterectomy → 88309; BSO / lymph node → 88307; additional tissue → 88305

---

## Module 3 — Prostate Needle Core Biopsy

**Files:** `server/prostate/agentTools.js`, `server/prostate/caseModel.js`,
`server/prostate/reportAssembler.js`

**CAP Protocol:** Prostate.Needle.Case.Bx_1.1.0.0 (WHO 5th Ed, Sep 2023)

**Gleason grade group computation (`computeGradeGroup` in `caseModel.js`):**
| Primary + Secondary | Score | Grade Group |
|---------------------|-------|-------------|
| 3+3 | 6 | GG1 |
| 3+4 | 7 | GG2 |
| 4+3 | 7 | GG3 |
| 4+4 | 8 | GG4 |
| 3+5 / 5+3 / 4+5 / 5+4 / 5+5 | 8–10 | GG5 |

**Report format (per specimen):**
```
A. PROSTATE, LEFT APEX, CORE NEEDLE BIOPSY:
      ACINAR ADENOCARCINOMA, CONVENTIONAL (USUAL) TYPE
      GRADE GROUP 2 (GLEASON SCORE 3 + 4 = 7)
      PERCENTAGE OF PATTERN 4: <5%
      INTRADUCTAL CARCINOMA: NOT IDENTIFIED
      CRIBRIFORM GLANDS: NOT IDENTIFIED        ← shown only for GG2/GG3/GG4
      TUMOR PRESENT IN 2 OUT OF 3 CORES
         - PERCENTAGE OF PROSTATIC TISSUE INVOLVED BY TUMOR: 40%, 20%
```

**Cribriform line:** Only rendered for GG2, GG3, GG4 (Gleason score 7–8). Label is simply
`CRIBRIFORM GLANDS:` — no parenthetical.

**IDC rule:** `IDC INCORPORATED INTO GRADE:` shown ONLY when IDC is present (not when absent).

**Pattern 4 line:** Only one line — categorical (`<5%`, `5–10%`, etc.) takes priority over
numeric. Suppressed in lower-GG specimens when any specimen in the case has GG ≥ 4.

**ASAP:** `ATYPICAL SMALL ACINAR PROLIFERATION SUSPICIOUS BUT NOT DIAGNOSTIC OF MALIGNANCY (ASAP)`

**PIN4 IHC paragraph (standardized):**
- Positive: "no identifiable basal cells by p63 and cytokeratin 34betaE12 with positive luminal
  AMACR staining confirming the diagnosis above"
- Negative: "intact basal cells by p63 and cytokeratin 34betaE12 with absent AMACR staining,
  not supporting carcinoma"
- Block reference: `block ***` if `pin4Block` not set

**Case Summary:** Highest grade, site, total positive cores, greatest % involvement, PNI, LVI, IDC

**CPT:** 88305 × N (tissue biopsies) + 88344 × N (PIN4 multiplex IHC)
CPT shown as aggregate totals: `88305 × 13 (Tissue biopsy)`, `88344 × 3 (PIN4 IHC)`

**MIPS:** Biopsies exempt from Measure #250 (requires 88309). Note rendered explicitly.

**No `receivedDate`** field in prostate cases.

---

## Module 4 — Lung Carcinoma Resection

**Files:** `server/lung/agentTools.js`, `server/lung/caseModel.js`,
`server/lung/reportAssembler.js`

**CAP Protocol:** Lung.Resection v5.1.0.0 — AJCC 9th Edition

**IASLC Grading (non-mucinous adenocarcinoma only):**
- G1 (Well-differentiated): lepidic-predominant + <20% high-grade patterns
- G2 (Moderately differentiated): acinar or papillary-predominant + <20% high-grade
- G3 (Poorly differentiated): any tumor with ≥20% high-grade patterns
- High-grade patterns: solid, micropapillary, cribriform, complex glandular
- Grade auto-computed from `patternDetails` object when provided to `set_tumor`

**Primary CPT map (`RESECTION_CPT`):**
- wedge / segmentectomy → 88307
- lobectomy / completion_lobectomy / sleeve_lobectomy / bilobectomy / pneumonectomy → 88309

**Secondary specimen CPT auto-detection:**
- "frozen" / "FS" / "intraoperative consult" → 88331 (+ 88332 add-ons for multiple sites)
- lymph node / station N / nodal station → 88307
- everything else → 88305

**Specimen architecture:** One `isPrimary` specimen gets full CAP workup. Secondary specimens
(lymph nodes, margins, pleural biopsies) each have `diagnosisLines[]` set by agent.
Agent must collect ALL specimen designations first, then diagnose each one.

**Margins in CAP synoptic:** Closest margin shown when all margins negative, e.g.:
`Closest Margin to Invasive Tumor: Bronchial (1.2 cm)`

**pN staging:** N2a = single station; N2b = multiple stations
Molecular pending line added to final diagnosis when `specialStudies.molecularPending = true`

**MIPS:** Measure #396 for lobectomy/pneumonectomy + NSCLC

---

## Module 5 — Surgical Pathology / Cytology (General)

**Files:** `server/pathology/agentTools.js`, `server/pathology/cptBilling.js`,
`server/pathology/mipsBilling.js`, `server/pathology/reportAssembler.js`,
`server/pathology/airtableClient.js`

**Covers:** Any organ, any specimen type — surgical path + cytology

**Report format (all specimen types use bullet-dash):**
```
A. GASTRIC ANTRUM, BIOPSY:
      -     GASTRIC ANTRAL MUCOSA WITH CHRONIC GASTRITIS, SEE COMMENT
      -     HELICOBACTER PYLORI: NOT IDENTIFIED WITH IMMUNOHISTOCHEMISTRY
      -     NO EVIDENCE OF DYSPLASIA OR MALIGNANCY
```

**Cytology format:** Adequacy/malignancy statement FIRST, descriptive line second.
SEE COMMENT appended to the LAST bullet (not first) for cytology.
Combined case-level comment rendered ONCE after all specimens (not per-specimen).
ThinPrep & Cell block designation casing preserved.

**Airtable PathPattern lookup:** Agent always calls `lookup_airtable_comment` before
`set_specimen_diagnosis` for every specimen. Base: `app6vyZndScBt10Hl`.

**CPT detection (`suggestPathologyCpt`):**
- Frozen section (checked first, before tissue type): → 88331 + 88332 add-ons
- Cytology: FNA → 88173; ThinPrep/SurePath → 88112; BAL/washings → 88108; smears → 88104
- Surgical: mastectomy/hysterectomy/lobectomy → 88309; SLN/lumpectomy → 88307;
  biopsy/polyp/curettage → 88305; skin tag/foreskin → 88302
- Touch prep add-on: + 88104

**IHC modifier:** `-26` = professional component only (applied globally via `ihcModifier` field)

**MIPS quality measures (`mipsBilling.js`):**
| # | Code | Trigger |
|---|------|---------|
| 491 | M1193 | MMR/MSI testing — endometrial, colorectal, Lynch-suspect |
| 249 | G9421 | Barrett's esophagus — biopsy |
| 395 | 3124F | Colorectal resection with lymph node count ≥12 |
| 396 | 3126F | Lobectomy/pneumonectomy + NSCLC |
| 440 | 3725F | Melanoma — Breslow thickness + ulceration reported |
| 397 | 3128F | Prostate cancer — Gleason score |
| 250 | G9415 | Radical prostatectomy (88309) |

No `receivedDate` in general pathology cases.

---

## Cross-module patterns

### `norm()` helper (ALL assemblers)
```javascript
function norm(s) { return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : ''; }
```
Always call `norm()` BEFORE `upper()` / `toUpperCase()` to prevent literal `\N` in output.

### CPT totals
Every module renders a TOTALS line summing all CPT codes:
`TOTALS: 88305 × 3, 88307 × 2, 88342 × 1, 88341 × 2`

### Frozen section billing
- 88331: first site per specimen
- 88332: each additional site, same specimen (stored in `spec.cptAddons[]`)
- Detected from "frozen section", "FS", "intraoperative consult" in designation

### Sentinel node modifier
Auto-applied when `sentinelExamined > 0` AND `totalExamined < 6`.
Adds `(sn)` to pN category and a note in CAP synoptic.

### Meditech-safe mode
`sanitizeForLIS(text)` in `ReportPreview.tsx` strips:
em-dash (—) → hyphen, en-dash (–) → hyphen, smart quotes → straight quotes, etc.
Toggled by checkbox in report tab toolbar.

---

## Frontend — `client/src/lib/types.ts`

`AnyCase = CaseData | EndometrialCaseData | PathologyCaseData | ProstateCaseData | LungCaseData`

This union is the single source of truth. Any new module MUST add its interface here and extend
the union. `ReportPreview.tsx` guards with `isEndo`, `isPathology`, `isProstate`, `isLung`
checks before casting — if adding a module, add a guard and update the `bc` null assignment:
```typescript
const bc = (isEndo || isPathology || isProstate || isLung) ? null : (caseState as CaseData);
```

---

## Deployment

- **Railway** auto-deploys on every push to `main`
- Build command: `cd server && npm install && cd ../client && npm install && npm run build`
- Start command: `NODE_ENV=production node server/index.js`
- Server serves React `client/dist` in production; Vite dev proxy used locally
- Local dev: `npm run dev` (root) → server :3001 + Vite HMR on :5173

## Environment (.env in server/)
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=        # optional fallback
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=app6vyZndScBt10Hl
```
