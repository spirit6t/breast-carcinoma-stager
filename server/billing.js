/**
 * CPT billing logic for breast specimens + IHC.
 *
 * Specimen → CPT:
 *   lumpectomy            → 88307
 *   mastectomy            → 88309
 *   sentinel lymph node   → 88307
 *   additional margin     → 88305
 *
 * IHC (per specimen letter):
 *   1st distinct antibody       → 88342
 *   each additional distinct    → 88341
 *   Ki-67                       → 88360 (separate; not in 88342/88341 chain)
 *   same antibody repeated on same specimen → counted once
 */

const SPECIMEN_RULES = [
  // Endometrial / gynecologic
  { match: /hysterectomy/i, cpt: '88309', label: 'Hysterectomy (neoplasm)' },
  // Breast
  { match: /\bmastectomy\b/i, cpt: '88309', label: 'Mastectomy' },
  { match: /sentinel\s+lymph\s+node|\bSLN\b/i, cpt: '88307', label: 'Sentinel lymph node' },
  { match: /additional\s+(superior|inferior|anterior|posterior|medial|lateral|deep|superficial)\s+margin|additional\s+margin|re[- ]?excision/i, cpt: '88305', label: 'Additional margin' },
  { match: /\blumpectomy\b|partial\s+mastectomy|excision/i, cpt: '88307', label: 'Lumpectomy / excision' },
];

export function suggestSpecimenCpt(designation) {
  if (!designation) return null;
  for (const rule of SPECIMEN_RULES) {
    if (rule.match.test(designation)) return { cpt: rule.cpt, label: rule.label };
  }
  return null;
}

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
