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

export function formatCptSummary(specimens) {
  if (!specimens || !specimens.length) return '';
  const lines = ['CPT BILLING SUMMARY'];
  for (const s of specimens) {
    let line = `${s.letter}. ${s.designation || ''}`;
    if (s.cpt) line += ` — ${s.cpt}`;
    lines.push(line);
    if (s.cptAddons && s.cptAddons.length) {
      lines.push(`   Add-on: ${s.cptAddons.join(', ')}`);
    }
  }
  return lines.join('\n');
}
