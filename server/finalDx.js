/**
 * Final diagnosis block renderer for each specimen.
 * Branches on mode: excision-DCIS vs excision-invasive.
 */

function upper(s) {
  return s ? String(s).toUpperCase() : '';
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

function buildDcisBlock(caseData) {
  const specimens = caseData.specimens || [];
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const stg = cap.stage || {};
  const m = cap.margins || {};
  const clip = caseData.priorHistory?.clipType;

  if (!specimens.length) return '';

  const lines = [];
  const primary = specimens[0];
  const primaryDesignation = primary ? primary.designation || '' : '';
  const procedure = cap.specimen?.procedure || '';
  const laterality = cap.specimen?.laterality || '';

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

  const stageParts = [stg.ptCategory, stg.pnCategory, stg.pmCategory].filter(Boolean);
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

  const blocks = [lines.filter(Boolean).join('\n')];

  for (const s of specimens.slice(1)) {
    const header = `${s.letter}. BREAST${laterality ? `, ${upper(laterality)}` : ''}, ${upper(s.designation || '')}:`;
    blocks.push(`${header}\nNEGATIVE FOR DCIS AND INVASIVE CARCINOMA`);
  }

  return blocks.join('\n\n');
}

function fmtSize(primary, additional) {
  if (primary == null || primary === '') return '';
  const main = `${primary} MM`;
  return additional ? `${main} (ADDITIONAL: ${String(additional).toUpperCase()})` : main;
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
  const primary = specimens[0];
  const procedure = cap.specimen?.procedure || '';
  const laterality = cap.specimen?.laterality || '';

  const header = `${primary.letter}. BREAST${laterality ? `, ${upper(laterality)}` : ''}${procedure ? `, ${upper(procedure)}` : (primary.designation ? `, ${upper(primary.designation)}` : '')}:`;

  const histType = upper(t.histologicType || 'INVASIVE CARCINOMA');
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
    const dcisExtent = t.dcisExtentMm != null && t.dcisExtentMm !== ''
      ? `, EXTENT ${t.dcisExtentMm} MM`
      : '';
    const eic = t.extensiveIntraductalComponent === true ? '; EXTENSIVE INTRADUCTAL COMPONENT' : '';
    dcisLine = `WITH ASSOCIATED DUCTAL CARCINOMA IN SITU${dcisGrade}${dcisExtent}${eic}`;
  }

  const stageBits = [];
  if (stg.yPrefix) stageBits.push('y');
  if (stg.rPrefix) stageBits.push('r');
  const ptDisplay = stg.ptCategory
    ? `${(stg.yPrefix ? 'y' : (stg.rPrefix ? 'r' : 'p'))}${stg.ptCategory.replace(/^p/, '')}${stg.mModifier ? ' (m)' : ''}`
    : '';
  const pnDisplay = stg.pnCategory
    ? `${(stg.yPrefix ? 'y' : (stg.rPrefix ? 'r' : 'p'))}${stg.pnCategory.replace(/^p/, '')}`
    : '';
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

  const clipLine = `PREVIOUS BIOPSY SITE CHANGES${clip ? ` AND ${upper(clip)} CLIP` : ' AND CLIP'} PRESENT`;

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
    'SEE SYNOPTIC REPORT FOR TUMOR CHARACTERISTICS',
  ].filter(Boolean);

  blocks.push(lines.join('\n'));

  for (const s of specimens.slice(1)) {
    const h = `${s.letter}. BREAST${laterality ? `, ${upper(laterality)}` : ''}, ${upper(s.designation || '')}:`;
    blocks.push(`${h}\nNEGATIVE FOR INVASIVE CARCINOMA AND DCIS`);
  }

  return blocks.join('\n\n');
}

export function buildFinalDiagnosisBlock(caseData) {
  if (caseData?.mode === 'excision-invasive') return buildInvasiveBlock(caseData);
  return buildDcisBlock(caseData);
}
