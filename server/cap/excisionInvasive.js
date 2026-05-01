/**
 * CAP synoptic renderer for Breast Excision with Invasive Carcinoma.
 * Standard: AJCC-UICC 8.
 * Output style: section headers preserved; only filled items are printed.
 */

function line(label, value) {
  return value != null && String(value).trim() !== '' ? `  ${label}: ${value}` : null;
}

function listLine(label, arr, joiner = ', ') {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return `  ${label}: ${arr.join(joiner)}`;
}

function section(title, lines) {
  const clean = lines.filter(Boolean);
  if (!clean.length) return null;
  return [title, ...clean].join('\n');
}

function fmtSize(primary, additional, cannot) {
  if (primary != null && String(primary).trim() !== '') {
    const add = additional ? ` (additional: ${additional} mm)` : '';
    return `${primary} mm${add}`;
  }
  if (cannot) return `Cannot be determined (${cannot})`;
  return null;
}

function fmtNottingham(n) {
  if (!n) return [];
  const out = [];
  const score = (label, v) => v != null && v !== '' ? `${label}: ${v}/3` : null;
  out.push(score('Tubule Formation', n.tubuleFormation));
  out.push(score('Nuclear Pleomorphism', n.nuclearPleomorphism));
  if (n.mitoticCount != null && n.mitoticCount !== '') {
    const mits = n.mitosesPer10HPF != null && n.mitosesPer10HPF !== ''
      ? ` (${n.mitosesPer10HPF} mitoses/10 HPF)`
      : '';
    out.push(`Mitotic Count: ${n.mitoticCount}/3${mits}`);
  }
  if (n.totalScore != null && n.totalScore !== '') {
    out.push(`Total Nottingham Score: ${n.totalScore}/9`);
  }
  if (n.overallGrade) out.push(`Overall Grade: ${n.overallGrade}`);
  return out.filter(Boolean).map((s) => `  ${s}`);
}

function fmtBiomarker(prefix, b) {
  if (!b) return [];
  const out = [];
  if (b.status) out.push(`${prefix} Status: ${b.status}`);
  if (b.percentPositive != null && b.percentPositive !== '') {
    out.push(`${prefix} Percent Positive Nuclei: ${b.percentPositive}%`);
  }
  if (b.intensity) out.push(`${prefix} Intensity: ${b.intensity}`);
  if (b.internalControl) out.push(`${prefix} Internal Control: ${b.internalControl}`);
  return out.map((s) => `  ${s}`);
}

export function renderCapSynopticInvasive(caseData) {
  const cap = caseData.cap || {};
  const spec = cap.specimen || {};
  const t = cap.tumor || {};
  const m = cap.margins || {};
  const n = cap.nodes || {};
  const met = cap.metastasis || {};
  const stg = cap.stage || {};
  const ss = cap.specialStudies || {};

  const sections = [];

  sections.push('CASE SUMMARY: INVASIVE CARCINOMA OF THE BREAST — RESECTION');
  sections.push('Standard(s): AJCC-UICC 8');

  sections.push(
    section('SPECIMEN', [
      line('Procedure', spec.procedure),
      line('Specimen Laterality', spec.laterality),
      line('Specimen Integrity', spec.integrity),
    ])
  );

  // ---- TUMOR ----
  const histType = t.histologicType
    + (t.histologicType === 'Other (specify)' && t.histologicTypeOther
      ? `: ${t.histologicTypeOther}`
      : '');
  const invasiveSize = fmtSize(t.invasiveSizeMm, t.invasiveAdditionalDimMm, t.invasiveSizeCannotBeDetermined);
  const dcisExtent = t.dcisExtentMm != null && t.dcisExtentMm !== '' ? `${t.dcisExtentMm} mm` : null;

  const tumorLines = [
    listLine('Tumor Site', t.site),
    line('Histologic Type', t.histologicType ? histType : null),
    line('Tumor Focality', t.focality),
    line('Number of Foci', t.numberOfFoci),
    line('Size of Largest Invasive Focus', invasiveSize),
    line('Size of Largest Focus (additional)', t.sizeOfLargestFocus != null && t.sizeOfLargestFocus !== '' ? `${t.sizeOfLargestFocus} mm` : null),
    ...fmtNottingham(t.nottingham),
    line('Lymphovascular Invasion', t.lymphovascularInvasion),
    line('Dermal Lymphovascular Invasion', t.dermalLymphovascularInvasion),
    line('Ductal Carcinoma In Situ (DCIS)', t.dcisAssociated),
    line('Estimated Extent of DCIS', dcisExtent),
    line('DCIS Component', t.dcisPercentage),
    line('DCIS Nuclear Grade', t.dcisGrade),
    listLine('DCIS Architectural Patterns', t.dcisArchitecturalPatterns),
    line('DCIS Necrosis', t.dcisNecrosis),
    line('Extensive Intraductal Component (EIC)',
      t.extensiveIntraductalComponent === true ? 'Present'
        : t.extensiveIntraductalComponent === false ? 'Not identified'
        : null),
    listLine('Microcalcifications', [
      ...(t.microcalcifications || []),
      ...(t.microcalcificationsOther ? [`Other: ${t.microcalcificationsOther}`] : []),
    ]),
    listLine('Skin / Dermal Involvement', t.skinInvolvement),
    line('Nipple Involvement', t.nippleInvolvement),
    line('Chest Wall (Skeletal Muscle, Rib) Involvement', t.chestWallInvolvement),
    line('Treatment Effect (Post-Neoadjuvant)', t.treatmentEffect),
  ];
  sections.push(section('TUMOR', tumorLines));

  // ---- MARGINS ----
  const marginLines = [];
  if (m.invasiveStatus) marginLines.push(`  Margin Status (Invasive Carcinoma): ${m.invasiveStatus}`);
  if (m.invasiveStatus === 'All margins negative for invasive carcinoma') {
    if (m.invasiveDistanceMm != null && m.invasiveDistanceMm !== '') {
      marginLines.push(`  Distance from Invasive Carcinoma to Closest Margin: ${m.invasiveDistanceMm} mm`);
    }
    if (Array.isArray(m.invasiveClosestMargins) && m.invasiveClosestMargins.length) {
      marginLines.push(`  Closest Margin(s) to Invasive Carcinoma: ${m.invasiveClosestMargins.join(', ')}`);
    }
  }
  if (m.invasiveStatus === 'Invasive carcinoma present at margin' && Array.isArray(m.invasiveInvolvedMargins) && m.invasiveInvolvedMargins.length) {
    marginLines.push('  Margin(s) Involved by Invasive Carcinoma:');
    for (const mg of m.invasiveInvolvedMargins) {
      const extent = mg.extent ? ` — ${mg.extent}` : '';
      marginLines.push(`    • ${mg.side}${extent}`);
    }
  }
  if (m.dcisStatus) marginLines.push(`  Margin Status (DCIS): ${m.dcisStatus}`);
  if (m.dcisStatus === 'All margins negative for DCIS') {
    if (m.dcisDistanceMm != null && m.dcisDistanceMm !== '') {
      marginLines.push(`  Distance from DCIS to Closest Margin: ${m.dcisDistanceMm} mm`);
    }
    if (Array.isArray(m.dcisClosestMargins) && m.dcisClosestMargins.length) {
      marginLines.push(`  Closest Margin(s) to DCIS: ${m.dcisClosestMargins.join(', ')}`);
    }
  }
  if (m.dcisStatus === 'DCIS present at margin' && Array.isArray(m.dcisInvolvedMargins) && m.dcisInvolvedMargins.length) {
    marginLines.push('  Margin(s) Involved by DCIS:');
    for (const mg of m.dcisInvolvedMargins) {
      const extent = mg.extent ? ` — ${mg.extent}` : '';
      marginLines.push(`    • ${mg.side}${extent}`);
    }
  }
  sections.push(section('MARGINS', marginLines));

  // ---- LYMPH NODES ----
  const nodeLines = [];
  if (n.status) nodeLines.push(`  Regional Lymph Node Status: ${n.status}`);
  if (n.allNegative === true) nodeLines.push('  All regional lymph nodes negative for tumor');
  if (n.macroCount != null && n.macroCount !== '') {
    nodeLines.push(`  Lymph Nodes with Macrometastases (>2 mm): ${n.macroCount}`);
  }
  if (n.microCount != null && n.microCount !== '') {
    nodeLines.push(`  Lymph Nodes with Micrometastases (>0.2–2 mm): ${n.microCount}`);
  }
  if (n.itcCount != null && n.itcCount !== '') {
    nodeLines.push(`  Lymph Nodes with Isolated Tumor Cells (≤0.2 mm): ${n.itcCount}`);
  }
  if (n.largestDepositMm != null && n.largestDepositMm !== '') {
    nodeLines.push(`  Size of Largest Nodal Metastatic Deposit: ${n.largestDepositMm} mm`);
  }
  if (n.extranodalExtension) nodeLines.push(`  Extranodal Extension: ${n.extranodalExtension}`);
  if (n.totalExamined != null && n.totalExamined !== '') {
    nodeLines.push(`  Total Number of Lymph Nodes Examined: ${n.totalExamined}`);
  }
  if (n.sentinelExamined != null && n.sentinelExamined !== '') {
    nodeLines.push(`  Number of Sentinel Nodes Examined: ${n.sentinelExamined}`);
  }
  if (Array.isArray(n.nSuffix) && n.nSuffix.length) {
    nodeLines.push(`  Regional Lymph Nodes Modifier: ${n.nSuffix.map((s) => `(${s})`).join(' ')}`);
  }
  sections.push(section('REGIONAL LYMPH NODES', nodeLines));

  sections.push(
    section('DISTANT METASTASIS', [
      line('Distant Site(s) Involved', met.distantSites),
      line('pM Category', met.pmCategory),
    ])
  );

  // ---- pTNM ----
  const stagePrefix = stg.yPrefix ? 'yp' : (stg.rPrefix ? 'r' : 'p');
  const ptDisplay = stg.ptCategory
    ? `${stagePrefix}${stg.ptCategory.replace(/^p/, '')}${stg.mModifier ? ' (m)' : ''}`
    : null;
  const pnDisplay = stg.pnCategory
    ? `${stagePrefix}${stg.pnCategory.replace(/^p/, '')}`
    : null;

  sections.push(
    section('PATHOLOGIC STAGE CLASSIFICATION (pTNM, AJCC 8th Edition)', [
      line('TNM Descriptor', stg.yPrefix ? 'y (post-neoadjuvant)' : (stg.rPrefix ? 'r (recurrent)' : null)),
      line('pT Category', ptDisplay),
      line('pN Category', pnDisplay),
      line('pM Category', stg.pmCategory),
    ])
  );

  // ---- ADDITIONAL FINDINGS ----
  const af = (caseData.cap?.additionalFindings || '').trim();
  sections.push(section('ADDITIONAL FINDINGS', [af ? `  ${af}` : null]));

  // ---- SPECIAL STUDIES ----
  const ssLines = [];
  if (ss.biomarkersSource) ssLines.push(`  Source of Biomarker Studies: ${ss.biomarkersSource}`);
  if (ss.biomarkersSource === 'Performed on prior biopsy' && ss.priorBiopsyAccession) {
    ssLines.push(`  Prior Biopsy Accession: ${ss.priorBiopsyAccession}`);
  }
  ssLines.push(...fmtBiomarker('Estrogen Receptor (ER)', ss.er));
  ssLines.push(...fmtBiomarker('Progesterone Receptor (PR)', ss.pr));
  if (ss.her2Ihc?.score) ssLines.push(`  HER2 (IHC) Score: ${ss.her2Ihc.score}`);
  if (ss.her2Ihc?.interpretation) ssLines.push(`  HER2 (IHC) Interpretation: ${ss.her2Ihc.interpretation}`);
  if (ss.her2Ish?.performed) {
    if (ss.her2Ish.method) ssLines.push(`  HER2 (ISH) Method: ${ss.her2Ish.method}`);
    if (ss.her2Ish.ratio != null && ss.her2Ish.ratio !== '') ssLines.push(`  HER2 (ISH) Ratio: ${ss.her2Ish.ratio}`);
    if (ss.her2Ish.her2SignalsPerCell != null && ss.her2Ish.her2SignalsPerCell !== '') {
      ssLines.push(`  HER2 Signals/Cell: ${ss.her2Ish.her2SignalsPerCell}`);
    }
    if (ss.her2Ish.cep17SignalsPerCell != null && ss.her2Ish.cep17SignalsPerCell !== '') {
      ssLines.push(`  CEP17 Signals/Cell: ${ss.her2Ish.cep17SignalsPerCell}`);
    }
    if (ss.her2Ish.interpretation) ssLines.push(`  HER2 (ISH) Interpretation: ${ss.her2Ish.interpretation}`);
  }
  if (ss.ki67Percent != null && ss.ki67Percent !== '') {
    ssLines.push(`  Ki-67 Proliferation Index: ${ss.ki67Percent}%`);
  }
  // Fall back to free-text if no structured biomarker data was entered:
  if (!ssLines.length && ss.erPrHer2Text && ss.erPrHer2Text.trim()) {
    ssLines.push(`  ER/PR/HER2: ${ss.erPrHer2Text.trim()}`);
  }
  sections.push(section('SPECIAL STUDIES', ssLines));

  return sections.filter(Boolean).join('\n\n');
}
