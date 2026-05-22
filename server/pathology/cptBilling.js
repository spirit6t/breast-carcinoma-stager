/**
 * CPT billing logic for general pathology + cytology specimens.
 *
 * Surgical path levels (88302–88309) are assigned by specimen keywords.
 * Cytology codes (88104/88108/88112/88173/88174) are assigned when
 * the designation contains FNA, ThinPrep, smear, cell block, BAL, etc.
 */

// ── Cytology detection ────────────────────────────────────────────────────────
const CYTOLOGY_PATTERNS = [
  /\bFNA\b/i,
  /fine[\s-]?needle\s+aspiration/i,
  /\bsmear/i,
  /cell\s+block/i,
  /ThinPrep/i,
  /SurePath/i,
  /thin\s+prep/i,
  /liquid\s+prep/i,
  /touch\s+prep/i,
  /touch\s+imprint/i,
  /imprint\s+cytol/i,
  /\bBAL\b/i,
  /bronchoalveolar\s+lavage/i,
  /bronchial\s+(wash|brush)/i,
  /\brushing/i,
  /\bwashing/i,
  /\beffusion\b/i,
  /paracentesis/i,
  /thoracentesis/i,
  /pericardiocentesis/i,
  /body\s+fluid/i,
  /pleural\s+fluid/i,
  /peritoneal\s+fluid/i,
  /ascit/i,
  /\bsputum\b/i,
  /urine\s+cytol/i,
  /\bCSF\b/i,
  /cerebrospinal/i,
  /\bcytol/i,
];

export function detectSpecimenCategory(designation) {
  const d = designation || '';
  for (const pat of CYTOLOGY_PATTERNS) {
    if (pat.test(d)) return 'cytology';
  }
  return 'surgical';
}

// ── Cytology CPT rules ────────────────────────────────────────────────────────
// Primary code + optional addons

const CYTOLOGY_CPT_RULES = [
  // FNA — interpretation code 88173; cell block addon 88108
  {
    match: [/\bFNA\b/i, /fine[\s-]?needle\s+aspiration/i],
    primary: '88173',
    label: 'FNA interpretation (1st site)',
    addons: [
      { match: /cell\s+block/i, cpt: '88108', label: 'Cell block preparation' },
    ],
  },
  // ThinPrep / SurePath / liquid-based prep
  {
    match: [/ThinPrep/i, /SurePath/i, /thin\s+prep/i, /liquid\s+prep/i],
    primary: '88112',
    label: 'Liquid-based cytology (ThinPrep/SurePath)',
    addons: [
      { match: /cell\s+block/i, cpt: '88108', label: 'Cell block preparation' },
    ],
  },
  // BAL / bronchial washings / body fluids / effusions (with or without cell block)
  {
    match: [/\bBAL\b/i, /bronchoalveolar/i, /bronchial\s+wash/i, /\bwashing/i,
            /\beffusion\b/i, /paracentesis/i, /thoracentesis/i, /body\s+fluid/i,
            /pleural\s+fluid/i, /peritoneal\s+fluid/i, /ascit/i, /\bCSF\b/i],
    primary: '88108',
    label: 'Cytopathology concentration technique (fluid/washing)',
    addons: [],
  },
  // Smears only (brushings, sputum, touch preps)
  {
    match: [/\brushing/i, /\bsmear/i, /\bsputum\b/i, /touch\s+prep/i, /touch\s+imprint/i, /imprint\s+cytol/i],
    primary: '88104',
    label: 'Cytopathology smears',
    addons: [
      { match: /cell\s+block/i, cpt: '88108', label: 'Cell block preparation' },
    ],
  },
];

// ── Surgical path CPT rules ───────────────────────────────────────────────────
const SURGICAL_CPT_RULES = [
  // Level V — radical resections with neoplasm
  { match: /\bmastectomy\b/i,                                      cpt: '88309', label: 'Mastectomy' },
  { match: /\bhysterectomy\b/i,                                    cpt: '88309', label: 'Hysterectomy (neoplasm)' },
  { match: /radical\s+(neck\s+)?dissection/i,                      cpt: '88309', label: 'Radical dissection' },
  { match: /\bcolectomy\b|\bcolon\s+resection\b/i,                 cpt: '88309', label: 'Colon resection' },
  { match: /\bnephrectomy\b/i,                                     cpt: '88309', label: 'Nephrectomy' },
  { match: /\blobectomy\b|\bpneumonectomy\b/i,                     cpt: '88309', label: 'Lung lobectomy/pneumonectomy' },
  { match: /\bprostatectomy\b/i,                                   cpt: '88309', label: 'Prostatectomy' },
  { match: /\bgastrectomy\b/i,                                     cpt: '88309', label: 'Gastrectomy' },

  // Level IV — complex excisions, sentinel nodes, lumpectomy
  { match: /sentinel\s+lymph\s+node|\bSLN\b/i,                    cpt: '88307', label: 'Sentinel lymph node' },
  { match: /\blumpectomy\b|partial\s+mastectomy/i,                 cpt: '88307', label: 'Lumpectomy' },
  { match: /additional\s+(superior|inferior|anterior|posterior|medial|lateral|deep|superficial)\s+margin|re[- ]?excision/i, cpt: '88305', label: 'Re-excision/additional margin' },
  { match: /lymph\s+node\s+dissection|axillary\s+dissection/i,    cpt: '88307', label: 'Lymph node dissection' },
  { match: /\bexcision\b.{1,40}\bneoplasm\b|\btumor\s+excision\b/i, cpt: '88307', label: 'Excision of neoplasm' },

  // Level III — most biopsies
  { match: /\bbiopsy\b|\bcore\s+biopsy\b|\bneedle\s+biopsy\b|\bpunch\s+biopsy\b/i, cpt: '88305', label: 'Biopsy' },
  { match: /\bpolypectomy\b|\bpolyp\b/i,                          cpt: '88305', label: 'Polyp/polypectomy' },
  { match: /\bcurettage\b|\bcurettings\b|\bD&C\b/i,               cpt: '88305', label: 'Curettage/D&C' },
  { match: /\bexcision\b/i,                                       cpt: '88305', label: 'Excision' },
  { match: /\bresection\b/i,                                      cpt: '88305', label: 'Resection' },

  // Level II — simple specimens
  { match: /\bappendix\b/i,                                       cpt: '88304', label: 'Appendix' },
  { match: /\bskin\s+tag\b|\bacrochord/i,                        cpt: '88302', label: 'Skin tag' },
  { match: /\bforeskin\b|\bcircumcision\b/i,                     cpt: '88302', label: 'Foreskin' },

  // Level III fallback for any tissue
  { match: /.*/,                                                   cpt: '88305', label: 'Tissue specimen' },
];

export function suggestPathologyCpt(designation) {
  const category = detectSpecimenCategory(designation);

  if (category === 'cytology') {
    // Try cytology rules
    for (const rule of CYTOLOGY_CPT_RULES) {
      const patterns = Array.isArray(rule.match) ? rule.match : [rule.match];
      if (patterns.some(p => p.test(designation))) {
        const addons = (rule.addons || [])
          .filter(a => a.match.test(designation))
          .map(a => ({ cpt: a.cpt, label: a.label }));
        return {
          category: 'cytology',
          cpt: rule.primary,
          label: rule.label,
          addons,
        };
      }
    }
    // Generic cytology fallback
    return { category: 'cytology', cpt: '88104', label: 'Cytopathology smears', addons: [] };
  }

  // Surgical path — also check if there's a cytology component (touch prep)
  let result = null;
  for (const rule of SURGICAL_CPT_RULES) {
    if (rule.match.test(designation)) {
      result = { category: 'surgical', cpt: rule.cpt, label: rule.label, addons: [] };
      break;
    }
  }
  if (!result) result = { category: 'surgical', cpt: '88305', label: 'Tissue specimen', addons: [] };

  // Check for cytology addon (touch prep / smear on a surgical specimen)
  if (/touch\s+prep|touch\s+imprint|imprint\s+cytol/i.test(designation)) {
    result.addons.push({ cpt: '88104', label: 'Touch prep cytology (add-on)' });
  }

  return result;
}

// ── IHC billing ───────────────────────────────────────────────────────────────
// 88342  — 1st antibody per specimen (or 88342-26 for professional component)
// 88341  — each additional distinct antibody (or 88341-26)
// 88360  — Ki-67 / proliferation index (morphometric, computerized)
// Modifier: '-26' = professional component only; '' = global

function normAb(ab) {
  return String(ab || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isKi67(ab) {
  const n = normAb(ab);
  return n === 'ki-67' || n === 'ki67' || n === 'mib-1' || n === 'mib1';
}

/**
 * Compute IHC CPT units grouped by specimen letter.
 * modifier: '-26' or '' (empty = global/full billing)
 * Returns [{ specimenLetter, entries: [{ antibody, cpt }] }]
 */
export function computePathologyIhcBilling(ihcEntries, modifier = '') {
  const mod = modifier
    ? (modifier.startsWith('-') ? modifier : `-${modifier}`)
    : '';

  const bySpecimen = new Map();
  for (const e of ihcEntries || []) {
    const letter = String(e.specimenLetter || '').toUpperCase();
    if (!letter) continue;
    if (!bySpecimen.has(letter)) bySpecimen.set(letter, { ki67: new Set(), others: [] });
    const bucket = bySpecimen.get(letter);
    if (isKi67(e.antibody)) {
      bucket.ki67.add(normAb(e.antibody));
    } else {
      const key = normAb(e.antibody);
      if (!bucket.others.some(x => normAb(x) === key)) {
        bucket.others.push(String(e.antibody || '').trim());
      }
    }
  }

  const result = [];
  for (const [letter, bucket] of [...bySpecimen.entries()].sort()) {
    const entries = [];
    bucket.others.forEach((ab, i) => {
      entries.push({ antibody: ab, cpt: (i === 0 ? `88342${mod}` : `88341${mod}`) });
    });
    [...bucket.ki67].forEach(ab => {
      const display = (ab === 'ki-67' || ab === 'ki67') ? 'Ki-67' : ab;
      entries.push({ antibody: display, cpt: `88360${mod}` });
    });
    if (entries.length) result.push({ specimenLetter: letter, entries });
  }
  return result;
}

export function formatCptSummary(specimens, ihcEntries = [], ihcModifier = '') {
  if (!specimens || !specimens.length) return '';
  const lines = ['CPT BILLING SUMMARY'];

  // Specimen-level codes
  for (const s of specimens) {
    let line = `${s.letter}. ${s.designation || ''}`;
    if (s.cpt) line += ` — ${s.cpt}`;
    lines.push(line);
    if (s.cptAddons && s.cptAddons.length) {
      lines.push(`   Add-on: ${s.cptAddons.join(', ')}`);
    }
  }

  // IHC codes — grouped by specimen
  const ihcBilling = computePathologyIhcBilling(ihcEntries, ihcModifier);
  if (ihcBilling.length) {
    const modLabel = ihcModifier ? ` (professional component${ihcModifier})` : '';
    lines.push('');
    lines.push(`IMMUNOHISTOCHEMISTRY${modLabel}:`);

    for (const spec of ihcBilling) {
      const first  = spec.entries.filter(e => e.cpt.startsWith('88342'));
      const addl   = spec.entries.filter(e => e.cpt.startsWith('88341'));
      const ki67   = spec.entries.filter(e => e.cpt.startsWith('88360'));
      const total  = spec.entries.length;

      const parts = [];
      if (first.length)            parts.push(`${first[0].cpt} × ${first.length} (${first.map(e => e.antibody).join(', ')})`);
      if (addl.length === 1)       parts.push(`${addl[0].cpt} (${addl[0].antibody})`);
      else if (addl.length > 1)    parts.push(`${addl[0].cpt} × ${addl.length} (${addl.map(e => e.antibody).join(', ')})`);
      ki67.forEach(e =>            parts.push(`${e.cpt} (${e.antibody})`));

      lines.push(`   Spec. ${spec.specimenLetter} [${total} stain${total !== 1 ? 's' : ''}]: ${parts.join(', ')}`);
    }
  }

  return lines.join('\n');
}
