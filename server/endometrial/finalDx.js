function upper(s) {
  return s ? String(s).toUpperCase() : '';
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

  // Histologic type + grade line
  const histType = upper(t.histologicType || 'ENDOMETRIAL CARCINOMA');
  const grade = t.histologicGrade ? `, ${upper(t.histologicGrade)}` : '';
  lines.push(` - ${histType}${grade}`);

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
  if (stg.ptCategory) stageParts.push(`${yPfx}${stg.ptCategory.replace(/^p/, '')}`);
  if (stg.pnCategory) stageParts.push(`${yPfx}${stg.pnCategory.replace(/^p/, '')}`);
  if (stg.pmCategory && !/not\s+applicable/i.test(stg.pmCategory)) stageParts.push(stg.pmCategory);
  if (stageParts.length) lines.push(` - PATHOLOGIC STAGE: ${stageParts.join(', ')}`);
  if (stg.figoStage2009) lines.push(` - FIGO STAGE (2009): ${upper(stg.figoStage2009)}`);

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
