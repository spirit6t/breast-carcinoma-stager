function upper(s) {
  return s ? String(s).toUpperCase() : '';
}

const AGGRESSIVE_TYPES = /carcinosarcoma|serous\s+carcinoma|clear[\s-]?cell\s+carcinoma|undifferentiated\s+carcinoma/i;

function formatHistologicDx(histType, grade) {
  if (!histType) return 'ENDOMETRIAL CARCINOMA';
  const type = histType.trim();
  if (AGGRESSIVE_TYPES.test(type)) {
    // Aggressive types are inherently high-grade — prefix, never suffix
    const clean = type.replace(/^high[\s-]?grade\s+/i, '');
    return `HIGH-GRADE ${upper(clean)}`;
  }
  // For endometrioid and other non-aggressive types, append FIGO grade
  const gradeStr = grade ? `, ${upper(grade)}` : '';
  return `${upper(type)}${gradeStr}`;
}

function findPrimarySpecimen(specimens) {
  if (!specimens || !specimens.length) return null;
  const UTERUS = /\buterus\b|\bhysterectomy\b|\bwhole\s+uterus\b/i;
  const NODE   = /\bnode\b|\blymph\b|\bsentinel\b|\bpelvic\b|\bpara.?aortic\b/i;
  const resect = specimens.find(s => UTERUS.test(s.designation) && !NODE.test(s.designation));
  if (resect) return resect;
  const other = specimens.find(s => !NODE.test(s.designation));
  return other || specimens[0];
}

function ptExplain(cat) {
  if (!cat) return '';
  if (/pT1a/i.test(cat)) return 'tumor limited to endometrium or <50% myometrial invasion';
  if (/pT1b/i.test(cat)) return '≥50% myometrial invasion';
  if (/pT2/i.test(cat)) return 'cervical stromal invasion';
  if (/pT3a/i.test(cat)) return 'uterine serosal involvement or adnexal spread';
  if (/pT3b/i.test(cat)) return 'vaginal or parametrial involvement';
  if (/pT4/i.test(cat)) return 'bladder or bowel mucosa invasion';
  return cat;
}

function pnExplain(cat) {
  if (!cat) return '';
  if (/pN0\(i\+\)/i.test(cat)) return 'isolated tumor cells only (≤0.2 mm)';
  if (/pN0/i.test(cat)) return 'no regional lymph node metastasis';
  if (/pN1mi/i.test(cat)) return 'micrometastasis (>0.2–2 mm) to pelvic nodes';
  if (/pN1a/i.test(cat)) return 'macrometastasis (>2 mm) to pelvic nodes';
  if (/pN2mi/i.test(cat)) return 'micrometastasis to para-aortic nodes';
  if (/pN2a/i.test(cat)) return 'macrometastasis (>2 mm) to para-aortic nodes';
  if (/not\s+assigned/i.test(cat)) return 'no nodes submitted';
  return cat;
}

function pmExplain(cat) {
  if (!cat) return '';
  if (/pM1/i.test(cat)) return 'distant metastasis present';
  return cat;
}

function figo2023Explain(stage) {
  const map = {
    'IA1': 'non-aggressive histological type; confined to endometrium or polyp',
    'IA2': 'non-aggressive histological type; <50% myometrial invasion; no/focal LVSI',
    'IA3': 'low-grade endometrioid; limited to uterus and ovary',
    'IB':  'non-aggressive histological type; ≥50% myometrial invasion; no/focal LVSI',
    'IC':  'aggressive histological type; confined to endometrium (no myometrial invasion)',
    'IIA': 'non-aggressive histological type; cervical stromal invasion',
    'IIB': 'non-aggressive histological type; substantial LVSI (≥5 foci)',
    'IIC': 'aggressive histological type; any myometrial involvement',
    'IIIA1': 'spread to ovary or fallopian tube',
    'IIIA2': 'uterine subserosa or serosal involvement',
    'IIIB1': 'vaginal or parametrial spread',
    'IIIB2': 'pelvic peritoneal metastasis',
    'IIIC1i':  'pelvic lymph node micrometastasis',
    'IIIC1ii': 'pelvic lymph node macrometastasis',
    'IIIC2i':  'para-aortic lymph node micrometastasis',
    'IIIC2ii': 'para-aortic lymph node macrometastasis',
    'IVA': 'bladder or bowel mucosa invasion',
    'IVB': 'abdominal peritoneal metastasis beyond pelvis',
    'IVC': 'distant metastasis (lungs, liver, brain, bone, or extra-abdominal lymph nodes)',
  };
  const key = String(stage || '').trim().replace(/^FIGO\s+/i, '').toUpperCase();
  // Handle IICm
  if (/IICm/i.test(stage)) return 'p53 abnormal; any myometrial invasion; confined to corpus';
  // Handle IAm
  if (/IAm/i.test(stage)) return 'POLE mutated; confined to corpus or with cervical extension';
  return map[key] || '';
}

export function buildEndometrialFinalDx(caseData) {
  const specimens = caseData.specimens || [];
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const stg = cap.stage || {};
  const m = cap.margins || {};
  const ss = cap.specialStudies || {};

  if (!specimens.length) return '';

  const primary = findPrimarySpecimen(specimens);
  const secondaries = specimens
    .filter(s => s.letter !== primary.letter)
    .sort((a, b) => a.letter.localeCompare(b.letter));

  const blocks = [];

  // ── Primary specimen block ──
  const header = `${primary.letter}. ${upper(primary.designation || '')}:`;

  const lines = [header];

  lines.push(` - ${formatHistologicDx(t.histologicType, t.histologicGrade)}`);

  // Myometrial invasion
  if (t.myometrialInvasion) {
    const pct = t.myometrialInvasionPercent != null ? ` (${t.myometrialInvasionPercent}%)` : '';
    if (/inner|less|<\s*50/i.test(t.myometrialInvasion)) {
      lines.push(` - TUMOR INVADES INNER MYOMETRIUM (< 50%${pct})`);
    } else if (/outer|more|≥\s*50|>=\s*50/i.test(t.myometrialInvasion)) {
      lines.push(` - TUMOR INVADES OUTER MYOMETRIUM (≥ 50%${pct})`);
    } else if (/not\s+identified/i.test(t.myometrialInvasion)) {
      lines.push(` - NO MYOMETRIAL INVASION IDENTIFIED`);
    }
  }

  // Cervical / LUS involvement
  if (t.cervicalInvolvement && !/not\s+identified/i.test(t.cervicalInvolvement)) {
    lines.push(` - ${upper(t.cervicalInvolvement)}`);
  }
  if (t.lowerUterineSegment && !/not\s+identified/i.test(t.lowerUterineSegment)) {
    lines.push(` - LOWER UTERINE SEGMENT: ${upper(t.lowerUterineSegment)}`);
  }
  if (t.uterineSerosal && /present/i.test(t.uterineSerosal)) {
    lines.push(` - UTERINE SEROSAL INVOLVEMENT PRESENT`);
  }

  // Margins
  if (m.status) {
    if (/negative/i.test(m.status)) {
      lines.push(` - MARGINS NEGATIVE FOR CARCINOMA`);
    } else if (/present|positive/i.test(m.status)) {
      const sites = (m.involvedLocations || []).map(upper).join(', ');
      lines.push(` - CARCINOMA PRESENT AT MARGIN${sites ? ` (${sites})` : ''}`);
    } else if (/not\s+applicable/i.test(m.status)) {
      lines.push(` - MARGINS: NOT APPLICABLE`);
    }
  }

  // Tubes and ovaries
  if (t.fallopianTubes) lines.push(` - ${upper(t.fallopianTubes)} FALLOPIAN TUBES`);
  if (t.ovaries) lines.push(` - ${upper(t.ovaries)} OVARIES`);

  // LVI
  if (t.lvi && !/not\s+identified/i.test(t.lvi)) {
    lines.push(` - LYMPHOVASCULAR INVASION: ${upper(t.lvi)}`);
  }

  // Biomarkers pending
  if (ss.biomarkersSource === 'Pending') {
    lines.push(` - PENDING FOR CARCINOMA MARKERS (ER/PR/MMR/p53)`);
  }

  // Stage
  const stageParts = [];
  const yPfx = stg.yPrefix ? 'y' : (stg.rPrefix ? 'r' : 'p');
  if (stg.ptCategory) stageParts.push(`${yPfx}${stg.ptCategory.replace(/^p/, '')} (${ptExplain(stg.ptCategory)})`);
  if (stg.pnCategory) stageParts.push(`${yPfx}${stg.pnCategory.replace(/^p/, '')} (${pnExplain(stg.pnCategory)})`);
  if (stg.pmCategory && !/not\s+applicable/i.test(stg.pmCategory)) stageParts.push(`${stg.pmCategory} (${pmExplain(stg.pmCategory)})`);
  if (stageParts.length) lines.push(` - PATHOLOGIC STAGE: ${stageParts.join('; ')}`);
  if (stg.figoStage2009) lines.push(` - FIGO STAGE (2009): ${upper(stg.figoStage2009)}`);
  if (stg.figoStage2023) lines.push(` - FIGO STAGE (2023): ${upper(stg.figoStage2023)} — ${figo2023Explain(stg.figoStage2023)}`);

  lines.push(` - SEE CANCER CASE SUMMARY`);

  blocks.push(lines.join('\n'));

  // ── Secondary specimens ──
  for (const s of secondaries) {
    const h = `${s.letter}. ${upper(s.designation || '')}:`;
    const dx = s.diagnosis && s.diagnosis.trim()
      ? upper(s.diagnosis.trim())
      : 'NEGATIVE FOR MALIGNANCY';
    blocks.push(`${h}\n${dx}`);
  }

  return blocks.join('\n\n');
}
