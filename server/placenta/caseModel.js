/**
 * Case model for singleton placenta examination reporting.
 *
 * Diagnostic terminology follows the Amsterdam Placental Workshop Group
 * Consensus Statement (Khong TY, et al. Arch Pathol Lab Med. 2016;140:698-713).
 *
 * Placental weight percentiles (unfixed, trimmed, singleton):
 *   - Weeks 28–42: Atlas of Placental Pathology, Appendix A-2
 *     (Boyd T, et al. Normative values for placental weights, N=15,419;
 *      Baystate Medical Center 1995-97. Mod Pathol 1999;12:1P).
 *   - Weeks 23–27: Atlas of Placental Pathology, Appendix A-1
 *     (Hecht J, et al. Reference weights for placentas delivered before the
 *      28th week of gestation. Placenta 2007;28:987-90).
 */

// ── Placental weight standards (grams; unfixed and trimmed; singleton) ─────────
// Each row holds the percentile thresholds available for that gestational week.
// Missing percentiles are simply absent (the band classifier copes with gaps).

const PLACENTA_WEIGHT_TABLE = {
  // Weeks 23–27 — Appendix A-1 (10th/25th/50th/75th/90th)
  23: { p10: 120, p25: 152, p50: 181, p75: 220, p90: 260 },
  24: { p10: 129, p25: 153, p50: 197, p75: 228, p90: 280 },
  25: { p10: 142, p25: 169, p50: 200, p75: 242, p90: 270 },
  26: { p10: 160, p25: 184, p50: 212, p75: 260, p90: 300 },
  27: { p10: 154, p25: 186, p50: 225, p75: 280, p90: 330 },

  // Weeks 28–42 — Appendix A-2 (3rd/5th/10th/25th/50th/75th/90th/95th/97th)
  28: { p3: 103, p5: 128, p10: 140, p25: 173, p50: 214, p75: 261, p90: 321, p95: 361, p97: 371 },
  29: { p3: 124, p5: 135, p10: 161, p25: 214, p50: 252, p75: 309, p90: 352, p95: 496, p97: 629 },
  30: { p3: 185, p5: 190, p10: 208, p25: 269, p50: 316, p75: 374, p90: 433, p95: 502, p97: 570 },
  31: { p3: 142, p5: 152, p10: 175, p25: 246, p50: 313, p75: 360, p90: 417, p95: 479, p97: 579 },
  32: { p3: 161, p5: 214, p10: 241, p25: 275, p50: 318, p75: 377, p90: 436, p95: 461, p97: 465 },
  33: { p3: 190, p5: 224, p10: 252, p25: 286, p50: 352, p75: 413, p90: 446, p95: 475, p97: 504 },
  34: { p3: 221, p5: 260, p10: 283, p25: 322, p50: 382, p75: 430, p90: 479, p95: 527, p97: 558 },
  35: { p3: 232, p5: 250, p10: 291, p25: 344, p50: 401, p75: 471, p90: 544, p95: 600, p97: 626 },
  36: { p3: 270, p5: 291, p10: 320, p25: 369, p50: 440, p75: 508, p90: 580, p95: 628, p97: 679 },
  37: { p3: 303, p5: 324, p10: 349, p25: 390, p50: 452, p75: 531, p90: 607, p95: 660, p97: 692 },
  38: { p3: 320, p5: 335, p10: 365, p25: 420, p50: 484, p75: 560, p90: 629, p95: 675, p97: 706 },
  39: { p3: 330, p5: 350, p10: 379, p25: 426, p50: 490, p75: 564, p90: 635, p95: 683, p97: 713 },
  40: { p3: 340, p5: 360, p10: 390, p25: 440, p50: 501, p75: 572, p90: 643, p95: 685, p97: 715 },
  41: { p3: 358, p5: 379, p10: 403, p25: 452, p50: 515, p75: 583, p90: 655, p95: 705, p97: 738 },
  42: { p3: 370, p5: 388, p10: 412, p25: 460, p50: 525, p75: 592, p90: 658, p95: 700, p97: 771 },
};

const PERCENTILE_ORDER = [
  ['p3', 3], ['p5', 5], ['p10', 10], ['p25', 25], ['p50', 50],
  ['p75', 75], ['p90', 90], ['p95', 95], ['p97', 97],
];

function ordinal(p) {
  if (p === 3) return '3RD';
  if (p === 2) return '2ND';
  if (p === 1) return '1ST';
  return `${p}TH`;
}

/**
 * Classify a trimmed placental weight (grams) against the singleton standard
 * for a given gestational age (weeks). Returns null when no reference row exists.
 */
export function computePlacentaWeightPercentile(weeks, weightG) {
  const w = Math.round(Number(weeks));
  const grams = Number(weightG);
  if (!Number.isFinite(w) || !Number.isFinite(grams) || grams <= 0) return null;

  const row = PLACENTA_WEIGHT_TABLE[w];
  if (!row) return { weeks: w, weightG: grams, band: null, label: '', isSmall: false, isLarge: false, source: null, outOfRange: true };

  const points = PERCENTILE_ORDER
    .filter(([key]) => row[key] != null)
    .map(([key, p]) => ({ p, threshold: row[key] }));
  if (!points.length) return null;

  const p10 = row.p10 ?? null;
  const p90 = row.p90 ?? null;
  const isSmall = p10 != null && grams < p10;
  const isLarge = p90 != null && grams > p90;

  const first = points[0];
  const last = points[points.length - 1];

  let band;
  if (grams < first.threshold) {
    band = `LESS THAN THE ${ordinal(first.p)} PERCENTILE`;
  } else if (grams >= last.threshold) {
    band = `GREATER THAN THE ${ordinal(last.p)} PERCENTILE`;
  } else {
    band = '';
    for (let i = 0; i < points.length - 1; i++) {
      const lo = points[i];
      const hi = points[i + 1];
      if (grams === lo.threshold) { band = `APPROXIMATELY THE ${ordinal(lo.p)} PERCENTILE`; break; }
      if (grams > lo.threshold && grams < hi.threshold) { band = `THE ${ordinal(lo.p)} TO ${ordinal(hi.p)} PERCENTILE`; break; }
    }
    if (!band && grams === last.threshold) band = `APPROXIMATELY THE ${ordinal(last.p)} PERCENTILE`;
  }

  return {
    weeks: w,
    weightG: grams,
    band,
    label: `${band} FOR GESTATIONAL AGE`,
    isSmall,
    isLarge,
    p10,
    p90,
    source: w >= 28 ? 'A-2' : 'A-1',
  };
}

// ── Trimester from gestational age ────────────────────────────────────────────
export function trimesterLabel(weeks) {
  const w = Number(weeks);
  if (!Number.isFinite(w)) return 'THIRD TRIMESTER';
  if (w < 14) return 'FIRST TRIMESTER';
  if (w < 28) return 'SECOND TRIMESTER';
  return 'THIRD TRIMESTER';
}

// ── Delivery method labels ────────────────────────────────────────────────────
export const DELIVERY_LABELS = {
  vaginal:          'VAGINAL DELIVERY',
  assisted_vaginal: 'ASSISTED VAGINAL DELIVERY',
  cesarean:         'CESAREAN SECTION',
  other:            'DELIVERY',
};

// ── Default reference citations ───────────────────────────────────────────────
export const DEFAULT_PLACENTA_REFERENCES = [
  'Khong TY, Mooney EE, Ariel I, et al. Sampling and Definitions of Placental Lesions: Amsterdam Placental Workshop Group Consensus Statement. Arch Pathol Lab Med. 2016;140(7):698-713.',
];

// Weight-standard citation, appended dynamically based on the table used.
export const WEIGHT_REFERENCES = {
  'A-2': 'Boyd T, Gang D, Lis G, et al. Normative values for placental weights (N=15,419), Baystate Medical Center 1995-97 (unfixed and trimmed, singleton). Mod Pathol 1999;12:1P. Reproduced in: Atlas of Placental Pathology, Appendix A-2.',
  'A-1': 'Hecht J, Kliman HJ, Allred EN, et al. Reference weights for placentas delivered before the 28th week of gestation. Placenta 2007;28:987-90. Reproduced in: Atlas of Placental Pathology, Appendix A-1.',
};

// ── CPT ───────────────────────────────────────────────────────────────────────
// Placenta, third trimester → 88307; placenta other than third trimester → 88305.
export function placentaCpt(weeks) {
  const w = Number(weeks);
  return Number.isFinite(w) && w >= 28 ? '88307' : '88305';
}

// ── Empty case factory ────────────────────────────────────────────────────────
export function createEmptyPlacentaCase() {
  return {
    version: 1,
    organ: 'placenta',
    mode: 'placenta-singleton',
    receivedDate: null,

    // Clinical / specimen
    specimenDesignation: '',     // verbatim header override, e.g. "PLACENTA, SINGLETON, THIRD TRIMESTER"
    gestationalAgeWeeks: null,   // completed weeks
    deliveryMethod: null,        // 'vaginal' | 'assisted_vaginal' | 'cesarean' | 'other'
    deliveryMethodOther: '',
    clinicalHistory: '',

    // Gross
    placentaWeightG: null,       // unfixed, trimmed
    weightPercentile: null,      // computed {band,label,isSmall,isLarge,source,...}
    cordVessels: 3,              // 3 = trivascular; 2 = single umbilical artery

    // Narrative findings. Each defaults to the normal statement; set normal:false
    // and provide `line` (ALL CAPS) to override with abnormal pathology.
    findings: {
      cord:         { normal: true, line: '' },
      membranes:    { normal: true, line: '' },
      disc:         { normal: true, line: '' },
      villiDecidua: { normal: true, line: '' },
    },

    additionalDiagnosisLines: [],  // extra ALL-CAPS bullet lines
    caseComment: '',
    references: [...DEFAULT_PLACENTA_REFERENCES],

    cpt: '88307',

    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}
