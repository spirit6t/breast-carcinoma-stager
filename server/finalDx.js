/**
 * Final diagnosis block renderer for each specimen.
 * Branches on mode: excision-DCIS vs excision-invasive.
 */

function upper(s) {
  return s ? String(s).toUpperCase() : '';
}

/** Replace literal \n / \t escape sequences with real whitespace before rendering. */
function norm(s) {
  return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : '';
}

function joinList(arr, fallback = '') {
  const clean = (arr || []).filter((x) => x && String(x).trim());
  return clean.length ? clean.join(' AND ') : fallback;
}

function gradeText(g) {
  if (!g) return '';
  const up = upper(g);
  return up.replace('GRADE', 'NUCLEAR GRADE');
}

// Normalize any "invasive ductal / NST" variant to the preferred CAP term.
const DUCTAL_RE = /invasive\s+(ductal|carcinoma\s*(of\s*)?no\s+special\s+type)/i;
function normalizeInvasiveHistType(raw) {
  if (!raw) return 'INVASIVE CARCINOMA OF NO SPECIAL TYPE (DUCTAL)';
  if (DUCTAL_RE.test(raw) || /no\s+special\s+type/i.test(raw)) {
    return 'INVASIVE CARCINOMA OF NO SPECIAL TYPE (DUCTAL)';
  }
  return upper(raw);
}

function buildDcisBlock(caseData) {
  const specimens = caseData.specimens || [];
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const stg = cap.stage || {};
  const m = cap.margins || {};
  const clip = caseData.priorHistory?.clipType;

  if (!specimens.length) return '';

  const lines = [];
  const primary = findPrimarySpecimen(specimens);
  // All specimens in alphabetical order (A, B, C...)
  const allSorted = [...specimens].sort((a, b) => a.letter.localeCompare(b.letter));

  const procedure = cap.specimen?.procedure || '';
  const laterality = cap.specimen?.laterality || '';
  const primaryDesignation = primary ? primary.designation || '' : '';

  const dxHeader = [
    `${primary.letter}. BREAST${laterality ? `, ${upper(laterality)}` : ''}${procedure ? `, ${upper(procedure)}` : (primaryDesignation ? `, ${upper(primaryDesignation)}` : '')}:`,
  ];

  const patternsText = joinList((t.architecturalPatterns || []).map((p) => upper(p)));
  const necrosisText =
    t.necrosis && /comedo/i.test(t.necrosis) ? 'COMEDONECROSIS' :
    t.necrosis && /present/i.test(t.necrosis) ? 'NECROSIS' : '';
  const calcText = (t.microcalcifications || []).some((c) => /DCIS|present/i.test(c))
    ? 'MICROCALCIFICATIONS' : '';

  const dcisLine =
    `DUCTAL CARCINOMA IN SITU (DCIS)` +
    (t.nuclearGrade ? `, ${gradeText(t.nuclearGrade)}` : '') +
    (patternsText ? `, ${patternsText} TYPE` : '') +
    ([necrosisText, calcText].filter(Boolean).length
      ? `, WITH ${[necrosisText, calcText].filter(Boolean).join(' AND ')}`
      : '');

  // Omit pN when not assigned (no nodes submitted)
  const pnDcis = stg.pnCategory && !/not\s+assigned/i.test(stg.pnCategory) ? stg.pnCategory : null;
  const stageParts = [stg.ptCategory, pnDcis, stg.pmCategory].filter(Boolean);
  const stageLine = stageParts.length ? `PATHOLOGIC STAGE: ${stageParts.join(', ')}` : '';

  const clipLine = `PREVIOUS BIOPSY SITE CHANGES${clip ? ` AND ${upper(clip)} CLIP` : ' AND CLIP'} PRESENT`;

  let marginLine = '';
  if (m.status === 'All margins negative for DCIS') {
    const dist = m.distanceMm != null && m.distanceMm !== '' ? `${m.distanceMm} MM` : '';
    const closest = (m.closestMargins || []).join(', ');
    marginLine = `MARGINS STATUS: ALL MARGINS NEGATIVE FOR DCIS` +
      (closest ? `; CLOSEST MARGIN ${closest.toUpperCase()}${dist ? ` AT ${dist}` : ''}` : '');
  } else if (m.status === 'DCIS present at margin') {
    const sides = (m.involvedMargins || []).map((x) => upper(x.side)).join(', ');
    marginLine = `MARGINS STATUS: DCIS PRESENT AT MARGIN${sides ? ` (${sides})` : ''}`;
  }

  lines.push(
    dxHeader.join('\n'),
    dcisLine,
    stageLine,
    clipLine,
    marginLine,
    'SEE SYNOPTIC REPORT FOR TUMOR CHARACTERISTICS'
  );

  // Render all specimens in A→B→C order; primary gets full block, others get dx line
  const blocks = [];
  for (const s of allSorted) {
    if (s.letter === primary.letter) {
      blocks.push(lines.filter(Boolean).join('\n'));
    } else {
      const h = `${s.letter}. ${upper(s.designation || '')}:`;
      const dx = s.diagnosis && s.diagnosis.trim()
        ? upper(norm(s.diagnosis.trim()))
        : 'NEGATIVE FOR DCIS AND INVASIVE CARCINOMA';
      blocks.push(`${h}\n${dx}`);
    }
  }

  return blocks.join('\n\n');
}

function fmtSize(primary, additional) {
  if (primary == null || primary === '') return '';
  const main = `${primary} MM`;
  return additional ? `${main} (ADDITIONAL: ${String(additional).toUpperCase()})` : main;
}

function findPrimarySpecimen(specimens) {
  if (!specimens || !specimens.length) return null;
  const MARGIN = /\bmargin\b|\bshave\b/i;
  const NODE   = /\bnode\b|\blymph\b|\bsentinel\b|\baxilla\b/i;
  const RESECT = /\blumpectomy\b|\bmastectomy\b|\bpartial\s+mastectomy\b|\bbreast\b/i;

  // Prefer an explicit breast resection specimen
  const byResect = specimens.find(s => RESECT.test(s.designation) && !MARGIN.test(s.designation) && !NODE.test(s.designation));
  if (byResect) return byResect;

  // Prefer non-margin, non-node
  const other = specimens.find(s => !MARGIN.test(s.designation) && !NODE.test(s.designation));
  if (other) return other;

  return specimens[0];
}

function buildInvasiveBlock(caseData) {
  const specimens = caseData.specimens || [];
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const stg = cap.stage || {};
  const m = cap.margins || {};
  const n = cap.nodes || {};
  const clip = caseData.priorHistory?.clipType;

  if (!specimens.length) return '';

  const blocks = [];
  const primary = findPrimarySpecimen(specimens);
  // All specimens in alphabetical order (A, B, C...)
  const allSorted = [...specimens].sort((a, b) => a.letter.localeCompare(b.letter));
  const procedure = cap.specimen?.procedure || '';
  const laterality = cap.specimen?.laterality || '';

  const header = `${primary.letter}. BREAST${laterality ? `, ${upper(laterality)}` : ''}${procedure ? `, ${upper(procedure)}` : (primary.designation ? `, ${upper(primary.designation)}` : '')}:`;

  const histType = normalizeInvasiveHistType(t.histologicType);
  const grade = t.nottingham?.overallGrade ? `, ${upper(t.nottingham.overallGrade)} (NOTTINGHAM SCORE ${t.nottingham.totalScore || '?'}/9)` : '';
  const sizeStr = fmtSize(t.invasiveSizeMm, t.invasiveAdditionalDimMm);
  const sizeLine = sizeStr ? `TUMOR SIZE: ${sizeStr}` : '';
  const focalityLine = t.focality && /multiple/i.test(t.focality)
    ? `MULTIFOCAL${t.numberOfFoci ? ` (${t.numberOfFoci} FOCI)` : ''}`
    : '';

  const lviLine = t.lymphovascularInvasion
    ? `LYMPHOVASCULAR INVASION: ${upper(t.lymphovascularInvasion)}`
    : '';

  const dcisAssoc = t.dcisAssociated && /present/i.test(t.dcisAssociated);
  let dcisLine = '';
  if (dcisAssoc) {
    const dcisGrade = t.dcisGrade ? `, ${upper(t.dcisGrade)}` : '';
    // Auto-calculate DCIS extent: blocks with DCIS × 4 mm (if not explicitly set)
    const computedDcisExtent = (t.dcisExtentMm != null && t.dcisExtentMm !== '')
      ? Number(t.dcisExtentMm)
      : (t.blocksWithDCIS != null && t.blocksWithDCIS !== '')
      ? Number(t.blocksWithDCIS) * 4
      : null;
    const dcisExtent = computedDcisExtent != null ? `, EXTENT ${computedDcisExtent} MM` : '';
    const eic = t.extensiveIntraductalComponent === true ? '; EXTENSIVE INTRADUCTAL COMPONENT' : '';
    dcisLine = `WITH ASSOCIATED DUCTAL CARCINOMA IN SITU${dcisGrade}${dcisExtent}${eic}`;
  }

  const stageBits = [];
  if (stg.yPrefix) stageBits.push('y');
  if (stg.rPrefix) stageBits.push('r');
  const pfx = stg.yPrefix ? 'y' : stg.rPrefix ? 'r' : 'p';
  const ptDisplay = stg.ptCategory
    ? `${pfx}${stg.ptCategory.replace(/^p/, '')}${stg.mModifier ? ' (m)' : ''}`
    : '';
  // Omit pN when "not assigned" (no nodes submitted)
  const pnRaw = stg.pnCategory && !/not\s+assigned/i.test(stg.pnCategory) ? stg.pnCategory : null;
  const pnDisplay = pnRaw ? `${pfx}${pnRaw.replace(/^p/, '')}` : '';
  const pmDisplay = stg.pmCategory && !/not\s+applicable/i.test(stg.pmCategory) ? stg.pmCategory : '';
  const stageParts = [ptDisplay, pnDisplay, pmDisplay].filter(Boolean);
  const stageLine = stageParts.length ? `PATHOLOGIC STAGE: ${stageParts.join(', ')}` : '';

  // ---- Margin lines ----
  let marginInvasive = '';
  if (m.invasiveStatus === 'All margins negative for invasive carcinoma') {
    const dist = m.invasiveDistanceMm != null && m.invasiveDistanceMm !== '' ? `${m.invasiveDistanceMm} MM` : '';
    const closest = (m.invasiveClosestMargins || []).join(', ');
    marginInvasive = `MARGINS STATUS (INVASIVE CARCINOMA): NEGATIVE` +
      (closest ? `; CLOSEST MARGIN ${closest.toUpperCase()}${dist ? ` AT ${dist}` : ''}` : '');
  } else if (m.invasiveStatus === 'Invasive carcinoma present at margin') {
    const sides = (m.invasiveInvolvedMargins || []).map((x) => upper(x.side)).join(', ');
    marginInvasive = `MARGINS STATUS (INVASIVE CARCINOMA): POSITIVE${sides ? ` (${sides})` : ''}`;
  }

  let marginDcis = '';
  if (m.dcisStatus === 'All margins negative for DCIS') {
    const dist = m.dcisDistanceMm != null && m.dcisDistanceMm !== '' ? `${m.dcisDistanceMm} MM` : '';
    const closest = (m.dcisClosestMargins || []).join(', ');
    marginDcis = `MARGINS STATUS (DCIS): NEGATIVE` +
      (closest ? `; CLOSEST MARGIN ${closest.toUpperCase()}${dist ? ` AT ${dist}` : ''}` : '');
  } else if (m.dcisStatus === 'DCIS present at margin') {
    const sides = (m.dcisInvolvedMargins || []).map((x) => upper(x.side)).join(', ');
    marginDcis = `MARGINS STATUS (DCIS): POSITIVE${sides ? ` (${sides})` : ''}`;
  }

  // ---- Lymph node line ----
  let nodeLine = '';
  if (n.status && /not\s+applicable/i.test(n.status)) {
    nodeLine = '';
  } else if (n.allNegative === true) {
    const total = n.totalExamined != null ? n.totalExamined : '';
    nodeLine = `LYMPH NODES: ALL NEGATIVE${total !== '' ? ` (0/${total})` : ''}`;
  } else if (n.macroCount || n.microCount || n.itcCount) {
    const total = n.totalExamined != null ? n.totalExamined : '';
    const positives =
      (Number(n.macroCount) || 0) +
      (Number(n.microCount) || 0) +
      (Number(n.itcCount) || 0);
    const fraction = total !== '' ? `${positives}/${total}` : `${positives}`;
    nodeLine = `LYMPH NODES: ${fraction} POSITIVE` +
      (n.largestDepositMm ? ` (LARGEST DEPOSIT ${n.largestDepositMm} MM)` : '') +
      (n.extranodalExtension && /present/i.test(n.extranodalExtension)
        ? `; EXTRANODAL EXTENSION ${upper(n.extranodalExtension)}`
        : '');
  }

  const clipLine = clip
    ? `PREVIOUS BIOPSY SITE CHANGES AND ${upper(clip)} CLIP PRESENT`
    : 'PREVIOUS BIOPSY SITE CHANGES AND CLIP PRESENT';

  // Biomarkers status line
  const bioPending = cap.specialStudies?.biomarkersSource === 'Pending';
  const bioPrior   = cap.specialStudies?.biomarkersSource === 'Performed on prior biopsy';
  let markersLine = '';
  if (bioPending)      markersLine = 'BREAST BIOMARKERS PENDING (ER/PR/HER2/Ki-67)';
  else if (bioPrior)   markersLine = 'BREAST BIOMARKERS PERFORMED ON PRIOR BIOPSY — SEE SYNOPTIC REPORT';

  const lines = [
    header,
    `${histType}${grade}`,
    sizeLine,
    focalityLine,
    lviLine,
    dcisLine,
    marginInvasive,
    marginDcis,
    nodeLine,
    stageLine,
    clipLine,
    markersLine,
    'SEE SYNOPTIC REPORT FOR TUMOR CHARACTERISTICS',
  ].filter(Boolean);

  // Render all specimens in A→B→C order; primary gets full block, others get dx line
  for (const s of allSorted) {
    if (s.letter === primary.letter) {
      blocks.push(lines.join('\n'));
    } else {
      const h = `${s.letter}. ${upper(s.designation || '')}:`;
      const dx = s.diagnosis && s.diagnosis.trim()
        ? upper(norm(s.diagnosis.trim()))
        : 'NEGATIVE FOR INVASIVE CARCINOMA AND DCIS';
      blocks.push(`${h}\n${dx}`);
    }
  }

  return blocks.join('\n\n');
}

export function buildFinalDiagnosisBlock(caseData) {
  if (caseData?.mode === 'excision-invasive') return buildInvasiveBlock(caseData);
  return buildDcisBlock(caseData);
}
