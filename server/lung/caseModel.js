/**
 * Case model for lung carcinoma resection reporting.
 * CAP Protocol: Lung.Resection v5.1.0.0 — AJCC 9th Edition
 */

// ── IASLC Histopathologic Grade — Non-mucinous Adenocarcinoma ─────────────────
// G1: Lepidic-predominant, <20% high-grade pattern
// G2: Acinar- or papillary-predominant, <20% high-grade pattern
// G3: Any tumor with ≥20% high-grade pattern (solid, micropapillary, cribriform, complex glandular)

export function computeIASLCGrade(patterns) {
  const p = patterns || {};
  const lepidic          = Number(p.lepidic          || 0);
  const acinar           = Number(p.acinar           || 0);
  const papillary        = Number(p.papillary        || 0);
  const solid            = Number(p.solid            || 0);
  const micropapillary   = Number(p.micropapillary   || 0);
  const cribriform       = Number(p.cribriform       || 0);
  const complex_glandular = Number(p.complex_glandular || 0);

  const highGradePct = solid + micropapillary + cribriform + complex_glandular;

  // G3 — ≥20% high-grade pattern, regardless of predominant
  if (highGradePct >= 20) {
    const hgParts = [];
    if (solid)            hgParts.push(`solid ${solid}%`);
    if (micropapillary)   hgParts.push(`micropapillary ${micropapillary}%`);
    if (cribriform)       hgParts.push(`cribriform ${cribriform}%`);
    if (complex_glandular) hgParts.push(`complex glandular ${complex_glandular}%`);
    return {
      grade: 'G3',
      label: 'Grade 3 (G3) — Poorly differentiated',
      rationale: `≥20% high-grade pattern (${highGradePct}%): ${hgParts.join(', ')}`,
    };
  }

  // Determine predominant pattern (highest %)
  const ranked = [
    { name: 'lepidic', pct: lepidic },
    { name: 'acinar', pct: acinar },
    { name: 'papillary', pct: papillary },
    { name: 'solid', pct: solid },
    { name: 'micropapillary', pct: micropapillary },
    { name: 'cribriform', pct: cribriform },
    { name: 'complex glandular', pct: complex_glandular },
  ].filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct);

  const predominant = ranked[0];
  if (!predominant) return null;

  const hgNote = highGradePct > 0 ? `; ${highGradePct}% high-grade pattern` : '; no high-grade pattern';

  // G1 — lepidic-predominant with <20% high-grade
  if (predominant.name === 'lepidic') {
    return {
      grade: 'G1',
      label: 'Grade 1 (G1) — Well differentiated',
      rationale: `Lepidic-predominant (${lepidic}%)${hgNote}`,
    };
  }

  // G2 — acinar- or papillary-predominant with <20% high-grade
  if (predominant.name === 'acinar' || predominant.name === 'papillary') {
    return {
      grade: 'G2',
      label: 'Grade 2 (G2) — Moderately differentiated',
      rationale: `${predominant.name.charAt(0).toUpperCase() + predominant.name.slice(1)}-predominant (${predominant.pct}%)${hgNote}`,
    };
  }

  // Predominant is a high-grade pattern — G3
  return {
    grade: 'G3',
    label: 'Grade 3 (G3) — Poorly differentiated',
    rationale: `${predominant.name}-predominant (${predominant.pct}%)`,
  };
}

// ── Stage group table (AJCC 9th) ──────────────────────────────────────────────
// Rows: pT  Columns: pN0, pN1, pN2a, pN2b, pN3

const STAGE_TABLE = {
  pTis:  { pN0: 'IA1', pN1: null,   pN2a: null,   pN2b: null,  pN3: null  },
  pT1mi: { pN0: 'IA1', pN1: null,   pN2a: null,   pN2b: null,  pN3: null  },
  pT1a:  { pN0: 'IA1', pN1: 'IIB',  pN2a: 'IIA',  pN2b: 'IIIA', pN3: 'IIIC' },
  pT1b:  { pN0: 'IA2', pN1: 'IIB',  pN2a: 'IIA',  pN2b: 'IIIA', pN3: 'IIIC' },
  pT1c:  { pN0: 'IA3', pN1: 'IIB',  pN2a: 'IIA',  pN2b: 'IIIA', pN3: 'IIIC' },
  pT2a:  { pN0: 'IB',  pN1: 'IIB',  pN2a: 'IIB',  pN2b: 'IIIA', pN3: 'IIIC' },
  pT2b:  { pN0: 'IIA', pN1: 'IIB',  pN2a: 'IIIA', pN2b: 'IIIB', pN3: 'IIIC' },
  pT3:   { pN0: 'IIB', pN1: 'IIIA', pN2a: 'IIIA', pN2b: 'IIIB', pN3: 'IIIC' },
  pT4:   { pN0: 'IIIA', pN1: 'IIIA', pN2a: 'IIIB', pN2b: 'IIIC', pN3: 'IIIC' },
};

export function computeStageGroup(ptCategory, pnCategory, pmCategory) {
  if (!ptCategory || !pnCategory) return null;

  // M1 overrides
  if (pmCategory === 'pM1a' || pmCategory === 'pM1b') return 'IVA';
  if (pmCategory === 'pM1c1' || pmCategory === 'pM1c2' || pmCategory === 'pM1c') return 'IVB';

  const row = STAGE_TABLE[ptCategory];
  if (!row) return null;

  // Normalise pNX → pN0 for display (unknown nodes)
  const col = pnCategory === 'pNX' ? 'pN0' : pnCategory;
  return row[col] || null;
}

// ── CPT by resection type ─────────────────────────────────────────────────────
export const RESECTION_CPT = {
  wedge:                '88307',
  segmentectomy:        '88307',
  lobectomy:            '88309',
  completion_lobectomy: '88309',
  sleeve_lobectomy:     '88309',
  bilobectomy:          '88309',
  pneumonectomy:        '88309',
};

export const RESECTION_LABELS = {
  wedge:                'Wedge resection',
  segmentectomy:        'Segmentectomy',
  lobectomy:            'Lobectomy',
  completion_lobectomy: 'Completion lobectomy',
  sleeve_lobectomy:     'Sleeve lobectomy',
  bilobectomy:          'Bilobectomy',
  pneumonectomy:        'Pneumonectomy',
};

export const LOBE_LABELS = {
  RUL: 'Right Upper Lobe',
  RML: 'Right Middle Lobe',
  RLL: 'Right Lower Lobe',
  LUL: 'Left Upper Lobe',
  LLL: 'Left Lower Lobe',
  main_bronchus: 'Main Bronchus',
  bilateral: 'Bilateral',
};

// ── Empty case ────────────────────────────────────────────────────────────────
export function createEmptyLungCase() {
  return {
    version: 1,
    organ: 'lung',
    mode: 'lung-resection',
    receivedDate: null,

    // Procedure
    resectionType:   null,   // 'wedge' | 'segmentectomy' | 'lobectomy' | 'completion_lobectomy' | 'sleeve_lobectomy' | 'bilobectomy' | 'pneumonectomy'
    treatmentStatus: 'p',   // 'p' | 'yp' | 'r'
    laterality:      null,   // 'left' | 'right'
    lobe:            null,   // 'RUL' | 'RML' | 'RLL' | 'LUL' | 'LLL' | 'main_bronchus'

    // Tumor — histology
    histologicType:      null,   // see HISTOLOGIC_TYPES
    histologicTypeOther: '',
    mucinous:            null,   // boolean — adenocarcinoma only
    lepidic:             null,   // boolean — non-mucinous adeno: lepidic component present?
    lepidic_predominant: null,   // boolean — lepidic-predominant subtype?
    histologicPatterns:  '',     // free text: "Acinar 60%, lepidic 40%"
    histologicGrade:     null,   // 'G1' | 'G2' | 'G3' | 'GX' | 'not_applicable'
    // IASLC pattern details (non-mucinous adenocarcinoma only)
    patternDetails: null,        // { lepidic, acinar, papillary, solid, micropapillary, cribriform, complex_glandular } — percentages
    iaslcGradeLabel: '',         // e.g. 'Grade 2 (G2) — Moderately differentiated'
    iaslcGradeRationale: '',     // e.g. 'Acinar-predominant (60%); 10% high-grade pattern'

    // Tumor — size
    invasiveSizeCm: null,   // primary T-determining size
    totalSizeCm:    null,   // only for lepidic/non-mucinous adeno

    // Tumor — invasion
    pleuralInvasion:           null,   // 'PL0' | 'PL1' | 'PL2'
    stas:                      null,   // 'not_identified' | 'present' | 'cannot_be_determined' | 'not_applicable'
    lvi:                       null,   // 'not_identified' | 'present' | 'cannot_be_determined'
    lviSubtypes:               [],     // ['lymphatic', 'arterial', 'venous']
    adjacentStructureInvasion: false,
    adjacentStructures:        [],     // named T2a/T3/T4 structures

    // Multifocal
    multifocal:        false,
    multifocalNodules: [],   // [{ location, sizeCm, sameLobe }]

    // Treatment effect
    treatmentEffect: 'No known presurgical therapy',

    // Margins
    margins: {
      invasiveStatus:  null,   // 'all_negative' | 'involved'
      involvedMargins: [],     // ['bronchial', 'vascular', 'parenchymal', 'other']
      closestMargin:   '',
      closestDistanceCm: null,
      nonInvasiveStatus: null, // 'all_negative' | 'cis_bronchial' | 'lepidic_parenchymal' | 'not_applicable'
    },

    // Lymph nodes
    nodes: {
      pnCategory:         null,   // 'NX' | 'N0' | 'N1' | 'N2a' | 'N2b' | 'N3'
      positiveStations:   [],     // IASLC station descriptions
      examinedStations:   [],     // all examined
      nodesPositive:      null,
      nodesExamined:      null,
      extranodalExtension: null,  // 'not_identified' | 'present' | 'cannot_be_determined'
      largestDepositMm:   null,
    },

    // Metastasis
    metastasis: {
      pmCategory: 'not_applicable',  // 'not_applicable' | 'M1a' | 'M1b' | 'M1c1' | 'M1c2'
      sites:      [],
    },

    // Stage (agent-computed)
    stage: {
      ptCategory:  null,   // 'pTis' | 'pT1mi' | 'pT1a' | 'pT1b' | 'pT1c' | 'pT2a' | 'pT2b' | 'pT3' | 'pT4'
      pnCategory:  null,   // 'pN0' | 'pN1' | 'pN2a' | 'pN2b' | 'pN3' | 'pNX'
      pmCategory:  null,   // 'pM0' | 'pM1a' | 'pM1b' | 'pM1c1' | 'pM1c2'
      stageGroup:  null,   // 'IA1' | 'IA2' | 'IA3' | 'IB' | 'IIA' | 'IIB' | 'IIIA' | 'IIIB' | 'IIIC' | 'IVA' | 'IVB'
      yPrefix:     false,
      rPrefix:     false,
      ptRationale: '',
      pnRationale: '',
    },

    // Additional findings
    additionalFindings: [],  // string[]

    // Special studies
    specialStudies: {
      molecularPending: false,
      molecularMarkers: [],   // ['PD-L1', 'EGFR', 'ALK', 'ROS1', 'KRAS', 'MET', 'RET', 'BRAF', 'NTRK']
      ihcPerformed:     false,
      ihcDescription:   '',
    },

    // Specimens — all specimen designations + diagnoses
    // The primary resection specimen is identified by primarySpecimenLetter.
    // Its final diagnosis block is auto-built from the tumor workup fields.
    // Secondary specimens (lymph nodes, margins, etc.) carry free diagnosisLines.
    primarySpecimenLetter: 'A',
    specimens: [],  // [{ letter, designation, isPrimary, diagnosisLines, comment }]

    // IHC entries (for CPT billing)
    ihc:         [],
    ihcModifier: '',

    // MIPS
    mips: [],   // [{ measureNumber, code, codeLabel }]

    caseComment: '',
    reportText:  '',
    updatedAt:   new Date().toISOString(),
  };
}
