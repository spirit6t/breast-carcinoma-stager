/**
 * MIPS Quality Measures — Pathology (2026)
 *
 * Measures implemented:
 *   #491 — MMR/MSI Biomarker (colorectal, endometrial, gastroesophageal, small bowel carcinoma)
 *   #249 — Barrett's Esophagus (dysplasia statement)
 *   #395 — Lung Cancer Biopsy/Cytology (IASLC histologic classification)
 *   #396 — Lung Cancer Resection (pTpN + histologic type)
 *   #440 — Skin Cancer Biopsy Reporting Time (≤7 calendar days)
 *   #397 — Melanoma — Primary Malignant Cutaneous (required elements)
 *   #250 — Malignant Neoplasm of Prostate (radical prostatectomy)
 */

// ── Measure definitions ───────────────────────────────────────────────────────

export const MIPS_MEASURES = {
  '491': {
    number: '491',
    title: 'MMR/MSI Biomarker Testing',
    description: 'Colorectal, endometrial, gastroesophageal, or small bowel carcinoma biopsy/resection — report must include or recommend MMR/MSI testing.',
    codes: {
      met:       { code: 'M1193',    label: 'MMR/MSI testing included or recommended in report' },
      metPrior:  { code: 'M1195',    label: 'MMR/MSI testing performed on prior specimen' },
      notMet:    { code: 'M1194',    label: 'MMR/MSI testing not documented, reason not given' },
      exception: { code: 'M1194',    label: 'Exception: documented medical reason (e.g. no residual tumor, insufficient tissue, neoadjuvant Rx)' },
      exclusion: { code: 'M1192',    label: 'Exclusion: Lynch Syndrome diagnosis or esophageal SCC' },
    },
    defaultCode: 'M1193',
  },
  '249': {
    number: '249',
    title: "Barrett's Esophagus",
    description: "Esophageal biopsy with histologic finding of Barrett's mucosa — report must include a dysplasia statement (present/absent/indefinite with grade if present).",
    codes: {
      met:       { code: '3126F',    label: "Barrett's mucosa report includes dysplasia statement with grading" },
      notMet:    { code: '3126F-1P', label: "Barrett's mucosa report lacks dysplasia statement, reason not given" },
      exception: { code: '3126F-8P', label: 'Medical reason for not reporting dysplasia (e.g. malignant neoplasm, absence of metaplasia)' },
      exclusion: { code: 'G8797',    label: 'Exclusion: specimen not from esophagus/GE junction' },
    },
    defaultCode: '3126F',
  },
  '395': {
    number: '395',
    title: 'Lung Cancer Biopsy/Cytology — IASLC Classification',
    description: 'NSCLC biopsy or cytology — report must follow IASLC guidance: no "large cell carcinoma", "AIS", "MIA", or "BAC"; must classify into specific histologic type.',
    codes: {
      met:       { code: 'G9421', label: 'Classified into specific histologic type per IASLC guidance' },
      notMet:    { code: 'G9422', label: 'Histologic type does not follow IASLC guidance, reason not given' },
      exception: { code: 'G9419', label: 'Medical reason (e.g. insufficient tissue, negative biopsy, NSCLC-NOS with reason documented)' },
      exclusion: { code: 'G9420', label: 'Exclusion: not primary NSCLC, metastatic, small cell, or non-lung anatomic site' },
    },
    defaultCode: 'G9421',
    note: 'CPT 88307 (lung wedge biopsy/resection) is EXEMPT from this measure.',
  },
  '396': {
    number: '396',
    title: 'Lung Cancer Resection — pTpN + Histologic Type',
    description: 'Primary lung cancer resection (lobectomy/pneumonectomy; CPT 88309) — report must include pT category, pN category, AND histologic type.',
    codes: {
      met:       { code: 'G9418', label: 'Report includes pT category, pN category, and histologic type' },
      notMet:    { code: 'G9422', label: 'pT/pN or histologic type not documented, reason not given' },
      exception: { code: 'G9423', label: 'Medical reason (e.g. metastatic disease, carcinoid, inadequate specimen, no residual carcinoma)' },
      exclusion: { code: 'G9424', label: 'Exclusion: not primary NSCLC, small cell, metastatic, or non-lung site' },
    },
    defaultCode: 'G9418',
    note: 'CPT 88307 (wedge resection) is EXEMPT. Only 88309 triggers this measure.',
  },
  '440': {
    number: '440',
    title: 'Skin Cancer Biopsy Reporting Time (≤7 days)',
    description: 'BCC, SCC, or melanoma (including in situ) biopsy — report must be sent to biopsying clinician within 7 calendar days of specimen receipt.',
    codes: {
      met:       { code: 'G9785', label: 'Report sent within 7 calendar days (auto-populated)' },
      notMet:    { code: 'G9786', label: 'Report NOT sent within 7 calendar days, reason not given' },
      exception: { code: 'M1166', label: 'Exception: wide local excision or re-excision (not a biopsy)' },
      exclusion: { code: 'G9784', label: 'Exclusion: second opinion consultation OR pathologist performed the biopsy' },
    },
    defaultCode: 'G9785',
    note: 'G9785 is auto-populated; only override for exclusions/exceptions.',
  },
  '397': {
    number: '397',
    title: 'Melanoma — Primary Malignant Cutaneous (Required Elements)',
    description: 'Invasive cutaneous melanoma — report must include pT category, thickness, ulceration, mitotic rate, peripheral/deep margin status, and microsatellitosis.',
    codes: {
      met:       { code: 'G9428', label: 'Report includes pT, thickness, ulceration, mitotic rate, margins, and microsatellitosis' },
      notMet:    { code: 'G9431', label: 'Required elements not documented, reason not given' },
      exception: { code: 'G9429', label: 'Medical reason (e.g. negative biopsy in melanoma patient, insufficient tissue)' },
      exclusion: { code: 'G9430', label: 'Exclusion: in situ diagnosis, non-cutaneous site, melanoma in transit' },
    },
    defaultCode: 'G9428',
    note: 'In situ melanoma (D03.x) triggers Measure #440 only, NOT #397.',
  },
  '250': {
    number: '250',
    title: 'Malignant Neoplasm of Prostate (Radical Prostatectomy)',
    description: 'Radical prostatectomy (CPT 88309) with carcinoma — report must include pT category, pN category, Gleason score, and margin status.',
    codes: {
      met:       { code: '3267F',    label: 'Report includes pTpN category, Gleason score, and margin status' },
      notMet:    { code: '3267F-1P', label: 'pTpN, Gleason, or margin status not documented, reason not given' },
      exception: { code: '3267F-8P', label: 'Medical reason (e.g. TURP specimen, secondary site prostate carcinoma)' },
      exclusion: { code: 'G8798',    label: 'Exclusion: not primary prostate tissue from a resection' },
    },
    defaultCode: '3267F',
  },
};

// ── Suggestion engine ─────────────────────────────────────────────────────────

function txt(...parts) {
  return parts.map(p => (p || '').toLowerCase()).join(' ');
}

/**
 * Given a specimen object, return an array of applicable MIPS measures
 * with the suggested default code for each.
 *
 * @param {object} specimen — PathologySpecimen with letter, designation, organ,
 *                            diagnosisLines[], diagnosisLine, cpt, specimenCategory
 * @returns {Array<{ measureNumber: string, defaultCode: string, measure: object }>}
 */
export function suggestMipsMeasures(specimen) {
  const designation = (specimen.designation || '').toLowerCase();
  const organ       = (specimen.organ || '').toLowerCase();
  const dxLines     = (specimen.diagnosisLines || []);
  const dxText      = txt(dxLines.join(' '), specimen.diagnosisLine || '');
  const all         = txt(designation, organ, dxText);
  const baseCpt     = (specimen.cpt || '').replace(/-.*/, '').trim();

  const suggestions = [];

  // ── #491 — MMR/MSI ──────────────────────────────────────────────────────────
  if (['88305', '88307', '88309'].includes(baseCpt)) {
    const isCarcinoma = /\b(carcinoma|adenocarcinoma)\b/.test(dxText);
    const isColorectal = /\b(colon|rectal|rectum|colorectal|sigmoid|cecum|cecal|ascending colon|descending colon|transverse colon|hepatic flex|splenic flex|appendic)\b/.test(all);
    const isEndometrial = /\b(endometri|uterus|uterine)\b/.test(all);
    const isGastroSmallBowel = /\b(esophag|gastroesophag|stomach|gastric|cardia|ge junction|gej|small bowel|duodenum|duodenal|jejunum|ileum|ileal)\b/.test(all);
    if (isCarcinoma && (isColorectal || isEndometrial || isGastroSmallBowel)) {
      suggestions.push({ measureNumber: '491', defaultCode: 'M1193' });
    }
  }

  // ── #249 — Barrett's Esophagus ──────────────────────────────────────────────
  if (['88305', '88307', '88309'].includes(baseCpt)) {
    const isBarretts = /barrett|specialized intestinal metaplasia|\bsim\b/.test(dxText);
    const isEsoph    = /\b(esophag|ge junction|gej|gastroesophag)\b/.test(all);
    if (isBarretts && isEsoph) {
      suggestions.push({ measureNumber: '249', defaultCode: '3126F' });
    }
  }

  // ── #395 / #396 — Lung Cancer ───────────────────────────────────────────────
  {
    const isLung = /\b(lung|bronch|pulmonary|lower lobe|upper lobe|middle lobe|lul|lll|rul|rll|rml)\b/.test(all);
    const isNSCLC = /\b(adenocarcinoma|squamous cell carcinoma|large cell carcinoma|nsclc|non.small.cell)\b/.test(dxText)
                 || (/\bcarcinoma\b/.test(dxText) && isLung);
    if (isLung && isNSCLC) {
      if (baseCpt === '88309') {
        // Resection — #396
        suggestions.push({ measureNumber: '396', defaultCode: 'G9418' });
      } else if (['88305', '88104', '88108', '88112', '88173'].includes(baseCpt)) {
        // Biopsy/cytology — #395 (88307 wedge is explicitly exempt)
        suggestions.push({ measureNumber: '395', defaultCode: 'G9421' });
      }
      // 88307 → exempt, no MIPS required
    }
  }

  // ── #440 + #397 — Skin Cancer ───────────────────────────────────────────────
  if (['88304', '88305'].includes(baseCpt)) {
    const isSkin = /\b(skin|cutaneous|derm|scalp|lip|ear|eyelid|cheek|nose|chin|forehead|temple|trunk|chest|back|arm|leg|digit|nail|toe|finger|hand|foot|face|neck|shoulder|abdomen|flank|groin|buttock)\b/.test(all)
                || specimen.specimenCategory === 'surgical'; // skin biopsies almost always surgical
    const isMelanoma = /\bmelanoma\b/.test(dxText);
    const isBccScc   = /\b(basal cell carcinoma|bcc|squamous cell carcinoma|scc|keratoacanthoma)\b/.test(dxText);
    const isInsitu   = /\bin situ\b/.test(dxText);

    if (isSkin && (isMelanoma || isBccScc)) {
      suggestions.push({ measureNumber: '440', defaultCode: 'G9785' });
      // #397 for invasive melanoma only
      if (isMelanoma && !isInsitu) {
        suggestions.push({ measureNumber: '397', defaultCode: 'G9428' });
      }
    }
  }

  // ── #250 — Prostate Radical Prostatectomy ────────────────────────────────────
  if (baseCpt === '88309') {
    const isProstate    = /\bprostat\b/.test(all);
    const isProstateCa  = /\b(carcinoma|adenocarcinoma)\b/.test(dxText) && isProstate;
    if (isProstateCa) {
      suggestions.push({ measureNumber: '250', defaultCode: '3267F' });
    }
  }

  // Attach full measure metadata
  return suggestions.map(s => ({
    ...s,
    measure: MIPS_MEASURES[s.measureNumber],
  }));
}

/**
 * Format the MIPS section of the CPT billing summary.
 * mipsEntries: [{ specimenLetter, measureNumber, code, codeLabel }]
 */
export function formatMipsSummary(mipsEntries) {
  if (!mipsEntries || !mipsEntries.length) return '';
  const lines = ['MIPS QUALITY MEASURES:'];
  for (const e of mipsEntries) {
    const m = MIPS_MEASURES[e.measureNumber];
    const title = m ? `#${m.number} — ${m.title}` : `#${e.measureNumber}`;
    lines.push(`   Spec. ${e.specimenLetter} — ${title}: ${e.code} (${e.codeLabel || ''})`);
  }
  return lines.join('\n');
}
