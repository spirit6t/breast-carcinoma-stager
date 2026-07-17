/**
 * CPT billing logic for breast / endometrial specimens + IHC.
 *
 * Specimen → CPT:
 *   Radical mastectomy / modified radical mastectomy   → 88309
 *   Simple / total mastectomy (no qualifier)            → 88309
 *   Sentinel lymph node excision                        → 88307
 *   Lumpectomy / partial mastectomy / excision          → 88307
 *   Additional shave margin — pathology present         → 88307
 *   Additional shave margin — benign / no pathology     → 88305
 *   Hysterectomy (endometrial)                          → 88309
 *
 * IHC (per specimen letter):
 *   1st distinct antibody       → 88342
 *   each additional distinct    → 88341
 *   Ki-67 / MIB-1               → 88360 (separate; not in 88342/88341 chain)
 *   same antibody repeated on same specimen → counted once
 */

// ── Specimen CPT rules ────────────────────────────────────────────────────────
// Evaluated in order — first match wins.

const SPECIMEN_RULES = [
  // Frozen section — intraoperative consultation (check before tissue type rules)
  { match: /frozen[\s-]?section|\bintraoperative[\s-]?consult/i,        cpt: '88331', label: 'Frozen section consultation (intraoperative)' },
  // Endometrial / gynecologic
  { match: /hysterectomy/i,                                              cpt: '88309', label: 'Hysterectomy (neoplasm)' },
  // Mastectomy — radical / modified radical first
  { match: /radical\s+mastectomy|modified\s+radical|modified-radical/i, cpt: '88309', label: 'Radical / modified radical mastectomy' },
  // Any other mastectomy
  { match: /\bmastectomy\b/i,                                            cpt: '88309', label: 'Mastectomy' },
  // Sentinel lymph node
  { match: /sentinel\s+(lymph\s+)?node|\bSLN\b/i,                       cpt: '88307', label: 'Sentinel lymph node excision' },
  // Lumpectomy / partial mastectomy
  { match: /\blumpectomy\b|partial\s+mastectomy/i,                       cpt: '88307', label: 'Lumpectomy / partial mastectomy' },
  // Additional / shave margins — CPT depends on whether pathology is present (handled below)
  { match: /additional\s+\w*\s*margin|shave\s+(excision|biopsy|margin)|re[- ]?excision/i, cpt: '88305', label: 'Additional / shave margin (benign)' },
  // Generic excision fallback
  { match: /\bexcision\b/i,                                              cpt: '88307', label: 'Excision' },
];

/**
 * Determine whether an additional/shave margin diagnosis warrants upgrade to 88307.
 *
 * Rules:
 *   - Carcinoma, DCIS, invasive, or malignant tissue → always 88307
 *   - Atypical pathology (ADH, ALH, FEA, LCIS) + measurement against inked margin → 88307
 *   - Negative for carcinoma/atypia (benign) → stays 88305
 */
function shouldUpgradeMarginTo88307(diagnosis) {
  if (!diagnosis) return false;
  const dx = String(diagnosis);

  // Remove "negative for [clause]" and "no [X] identified/seen/present" phrases so that
  // "Negative for carcinoma or atypia" doesn't trigger the carcinoma check below.
  const positive = dx
    .replace(/\bnegative\s+for\b[^.;]*/gi, '')
    .replace(/\bno\s+\w[\w\s]*\b(identified|seen|present|found)\b[^.;]*/gi, '')
    .trim();

  // Carcinoma / DCIS / invasive present in the positive-findings portion → 88307
  if (/\bcarcinoma\b|\bdcis\b|malignant|\binvasive\b/i.test(positive)) return true;

  // Atypical pathology entities (specific terms, not the generic word "atypia")
  const hasAtypicalEntity =
    /\badh\b|atypical\s+ductal\s+hyperplasia|\balh\b|atypical\s+lobular\s+hyperplasia|flat\s+epithelial\s+atypia|\bfea\b|\blcis\b|lobular\s+carcinoma\s+in\s+situ/i.test(dx);

  // Measurement against inked margin (e.g. "3 mm from ink", "at inked margin")
  const hasMeasurementToMargin =
    /\d+\s*mm\s*(from|to|of)\s*(the\s+)?(ink|inked(\s+margin)?)|at\s+(the\s+)?inked?\s+(margin)?|\bmeasure[ds]?\b.*\bink/i.test(dx);

  return hasAtypicalEntity && hasMeasurementToMargin;
}

/**
 * Suggest a CPT code for a breast/endometrial specimen.
 *
 * @param {string} designation  — verbatim specimen designation
 * @param {string} [diagnosis]  — diagnosis text (used to upgrade shave margin to 88307
 *                                 when pathology is present or atypia + measurement-to-ink)
 * @returns {{ cpt: string, label: string } | null}
 */
export function suggestSpecimenCpt(designation, diagnosis) {
  if (!designation) return null;

  for (const rule of SPECIMEN_RULES) {
    if (rule.match.test(designation)) {
      // Shave/additional margin upgrade logic
      if (rule.cpt === '88305' && shouldUpgradeMarginTo88307(diagnosis)) {
        return { cpt: '88307', label: 'Additional / shave margin (with pathology)', cptAddons: [] };
      }
      // Frozen section: detect multiple sites on same specimen → 88332 add-ons
      const cptAddons = [];
      if (rule.cpt === '88331') {
        const siteMatch = designation.match(/[×x]\s*(\d+)|(\d+)\s*(?:sites?|blocks?|sections?)/i);
        const siteCount = siteMatch ? parseInt(siteMatch[1] || siteMatch[2], 10) : 1;
        for (let i = 1; i < siteCount; i++) cptAddons.push('88332');
      }
      return { cpt: rule.cpt, label: rule.label, cptAddons };
    }
  }
  return null;
}

// ── IHC billing ───────────────────────────────────────────────────────────────

function norm(ab) {
  return String(ab || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isKi67(ab) {
  const n = norm(ab);
  return n === 'ki-67' || n === 'ki67' || n === 'mib-1' || n === 'mib1';
}

/**
 * Compute CPT units for a list of IHC entries.
 * Returns: [{ specimenLetter, entries: [{ antibody, cpt }] }, ...]
 *
 * Rules:
 *   - 1st distinct antibody per specimen → 88342
 *   - each additional distinct antibody  → 88341
 *   - Ki-67 / MIB-1                      → 88360 (morphometric analysis)
 *   - same antibody on same specimen     → counted once only
 */
export function computeIhcBilling(ihcEntries) {
  const bySpecimen = new Map();
  for (const e of ihcEntries || []) {
    const letter = String(e.specimenLetter || '').toUpperCase();
    if (!letter) continue;
    if (!bySpecimen.has(letter)) bySpecimen.set(letter, { ki67: new Set(), others: [] });
    const bucket = bySpecimen.get(letter);
    if (isKi67(e.antibody)) {
      bucket.ki67.add(norm(e.antibody));
    } else {
      const key = norm(e.antibody);
      if (!bucket.others.some((x) => norm(x) === key)) bucket.others.push(e.antibody);
    }
  }

  const result = [];
  for (const [letter, bucket] of [...bySpecimen.entries()].sort()) {
    const entries = [];
    bucket.others.forEach((ab, i) => {
      entries.push({ antibody: ab, cpt: i === 0 ? '88342' : '88341' });
    });
    [...bucket.ki67].forEach((ab) => {
      entries.push({ antibody: ab === 'ki-67' || ab === 'ki67' ? 'Ki-67' : ab, cpt: '88360' });
    });
    if (entries.length) result.push({ specimenLetter: letter, entries });
  }
  return result;
}

export function summarizeBilling(caseData) {
  const specimens = (caseData.specimens || []).map((s) => ({
    letter: s.letter,
    designation: s.designation,
    cpt: s.cpt,
  }));
  const ihc = computeIhcBilling(caseData.ihc);
  return { specimens, ihc };
}
