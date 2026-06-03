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
 * Suggest a CPT code for a breast/endometrial specimen.
 *
 * @param {string} designation  — verbatim specimen designation
 * @param {string} [diagnosis]  — diagnosis text (used to upgrade shave margin to 88307
 *                                 when carcinoma/DCIS is present)
 * @returns {{ cpt: string, label: string } | null}
 */
export function suggestSpecimenCpt(designation, diagnosis) {
  if (!designation) return null;

  for (const rule of SPECIMEN_RULES) {
    if (rule.match.test(designation)) {
      // Shave/additional margin upgrade: if pathology (carcinoma or DCIS) is present → 88307
      if (rule.cpt === '88305' && diagnosis && /carcinoma|dcis|malignant|invasive/i.test(diagnosis)) {
        return { cpt: '88307', label: 'Additional / shave margin (with pathology)' };
      }
      return { cpt: rule.cpt, label: rule.label };
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
