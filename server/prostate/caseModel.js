/**
 * Case model for prostate needle core biopsy reporting.
 * CAP Protocol: Prostate.Needle.Case.Bx_1.1.0.0 (Sep 2023, WHO 5th Ed)
 */

// ── Grade group lookup ────────────────────────────────────────────────────────

export const GRADE_GROUP_MAP = [
  { g1: 3, g2: 3, gradeGroup: 1, score: 6,  label: 'Grade group 1 (Gleason Score 3 + 3 = 6)',  showPattern4: false },
  { g1: 3, g2: 4, gradeGroup: 2, score: 7,  label: 'Grade group 2 (Gleason Score 3 + 4 = 7)',  showPattern4: true  },
  { g1: 4, g2: 3, gradeGroup: 3, score: 7,  label: 'Grade group 3 (Gleason Score 4 + 3 = 7)',  showPattern4: true  },
  { g1: 4, g2: 4, gradeGroup: 4, score: 8,  label: 'Grade group 4 (Gleason Score 4 + 4 = 8)',  showPattern4: false },
  { g1: 3, g2: 5, gradeGroup: 4, score: 8,  label: 'Grade group 4 (Gleason Score 3 + 5 = 8)',  showPattern4: false },
  { g1: 5, g2: 3, gradeGroup: 4, score: 8,  label: 'Grade group 4 (Gleason Score 5 + 3 = 8)',  showPattern4: false },
  { g1: 4, g2: 5, gradeGroup: 5, score: 9,  label: 'Grade group 5 (Gleason Score 4 + 5 = 9)',  showPattern4: false },
  { g1: 5, g2: 4, gradeGroup: 5, score: 9,  label: 'Grade group 5 (Gleason Score 5 + 4 = 9)',  showPattern4: false },
  { g1: 5, g2: 5, gradeGroup: 5, score: 10, label: 'Grade group 5 (Gleason Score 5 + 5 = 10)', showPattern4: false },
];

/**
 * Compute grade group from primary + secondary Gleason patterns.
 * Returns null if combination is invalid.
 */
export function computeGradeGroup(gleasonPrimary, gleasonSecondary) {
  const row = GRADE_GROUP_MAP.find(r => r.g1 === gleasonPrimary && r.g2 === gleasonSecondary);
  if (!row) return null;
  return {
    gradeGroup:   row.gradeGroup,
    gleasonScore: row.score,
    label:        row.label,         // full label for report
    showPattern4: row.showPattern4,  // true for GG2/GG3 → ask % pattern 4
  };
}

// Pattern 4 percentage options (GG2: 3+4=7)
export const PATTERN4_PCT_OPTIONS_GG2 = ['<5%', '6-10%', '11-20%', '21-30%', '31-40%'];
// Pattern 4 percentage options (GG3: 4+3=7)
export const PATTERN4_PCT_OPTIONS_GG3 = ['<61%', '61-70%', '71-80%', '81-90%', '>90%'];

// ── Empty specimen ────────────────────────────────────────────────────────────

export const emptyProstateBiopsySpecimen = () => ({
  letter:        '',
  designation:   '',           // e.g. 'PROSTATE, LEFT APEX, CORE NEEDLE BIOPSY'
  location:      '',           // anatomic abbreviation: LA, RA, LM, RM, LB, RB, LTZ, RTZ...
  hasCarcinoma:  null,         // true | false | null (not yet determined)

  // ── Carcinoma fields ──
  histologicType:             'Acinar adenocarcinoma, conventional (usual)',
  gleasonPrimary:             null,   // 3 | 4 | 5
  gleasonSecondary:           null,   // 3 | 4 | 5
  gleasonScore:               null,   // computed: primary + secondary
  gradeGroup:                 null,   // computed: 1–5
  gradeGroupLabel:            '',     // full text: 'Grade group 2 (Gleason Score 3 + 4 = 7)'
  pattern4Pct:                '',     // '<5%' / '6-10%' / ... for GG2/GG3 only
  pattern4PctNumeric:         null,   // for GG4+ free-text %
  pattern5PctNumeric:         null,   // for GG4+ optional %

  // IDC / cribriform
  idc:                        'Not identified',   // 'Not identified' | 'Present'
  idcIncorporatedIntoGrade:   'No',               // 'Yes' | 'No' | 'Cannot be determined'
  cribriformGlands:           'Not identified',   // 'Not applicable' | 'Not identified' | 'Present' | 'Equivocal' | 'Cannot be determined'

  // Tumor quantitation
  coresTotal:          null,  // integer — total cores from this site
  coresPositive:       null,  // integer — positive cores from this site
  corePctInvolvement:  [],    // number[] — % involvement per positive core, e.g. [40, 20]

  // Ancillary
  perineumralInvasion: null,  // 'Not identified' | 'Present' | null
  lvi:                 null,  // 'Not identified' | 'Present' | null

  // ── Benign / additional findings ──
  additionalFindings:  [],    // string[] — 'High-grade PIN' | 'ASAP' | 'Inflammation (...)' | 'AIP'

  // ── PIN4 IHC ──
  pin4Performed:  false,
  pin4Result:     '',         // e.g. 'Negative for carcinoma (p63+/HMWK+/AMACR-)'

  // ── CPT ──
  cpt:      '88305',
  cptAddons: [],              // ['88344'] when PIN4 IHC performed
});

// ── Empty case ────────────────────────────────────────────────────────────────

export function createEmptyProstateCase() {
  return {
    version:     1,
    organ:       'prostate',
    mode:        'prostate-biopsy',
    receivedDate: null,
    priorHistory: {
      clinicalHistory: '',
      psaLevel:        '',    // e.g. '8.5 ng/mL'
    },
    procedure:   [],          // ['Systematic biopsy'] | ['Targeted biopsy'] | both
    specimens:   [],          // ProstateBiopsySpecimen[]

    // Case-level summary (filled after all specimens are entered)
    periprosataticFatInvasion: null,   // 'Not identified' | 'Present' | 'Equivocal' | 'Cannot be determined'
    seminalVesicleInvasion:    null,   // same options
    treatmentEffect:           null,   // 'No known presurgical therapy' | 'Radiation effect' | etc.
    caseComment:               '',

    reportText:  '',
    updatedAt:   new Date().toISOString(),
  };
}
