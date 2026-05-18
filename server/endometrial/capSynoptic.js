function line(label, value, indent = '') {
  if (value == null || value === '' || value === false) return null;
  return `${indent}${label}: ${value}`;
}

function section(title, rows) {
  const lines = rows.filter(Boolean);
  if (!lines.length) return null;
  return [title, ...lines].join('\n');
}

export function renderCapSynopticEndometrial(caseData) {
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const m = cap.margins || {};
  const n = cap.nodes || {};
  const stg = cap.stage || {};
  const ss = cap.specialStudies || {};
  const h = caseData.priorHistory || {};

  const parts = [];

  parts.push(`CASE SUMMARY: (ENDOMETRIUM)`);
  parts.push(`Standard(s): AJCC 8th Edition, FIGO 2009 Staging (2018 Annual Report), FIGO 2023 Staging`);

  // CLINICAL
  const clinicalRows = [
    h.clinicalHistory ? `Clinical History: ${h.clinicalHistory}` : null,
    h.previousBiopsyResult ? `Prior Biopsy: ${h.previousBiopsyResult}` : null,
    h.radiologicFindings ? `Radiology: ${h.radiologicFindings}` : null,
  ].filter(Boolean);
  if (clinicalRows.length) parts.push(['CLINICAL', ...clinicalRows].join('\n'));

  // SPECIMEN
  parts.push(section('SPECIMEN', [
    line('Procedure', cap.specimen?.procedure),
    line('Specimen Integrity', cap.specimen?.integrity),
  ]));

  // TUMOR
  const tumorRows = [
    line('Histologic Type', t.histologicType),
    line('Histologic Grade', t.histologicGrade),
    t.tumorSizeMm != null ? `Tumor Size: ${t.tumorSizeMm} mm` : null,
  ];

  // Myometrial invasion
  if (t.myometrialInvasion) {
    tumorRows.push(`Myometrial Invasion: ${t.myometrialInvasion}${t.myometrialInvasionPercent != null ? ` (${t.myometrialInvasionPercent}%)` : ''}`);
    if (t.myometrialComment) tumorRows.push(`  Comment: ${t.myometrialComment}`);
  }

  if (t.adenomyosis) tumorRows.push(`Adenomyosis: ${t.adenomyosis}`);
  if (t.uterineSerosal) tumorRows.push(`Uterine Serosal Involvement: ${t.uterineSerosal}`);
  if (t.lowerUterineSegment) tumorRows.push(`Lower Uterine Segment Involvement: ${t.lowerUterineSegment}`);
  if (t.cervicalInvolvement) tumorRows.push(`Cervical Involvement: ${t.cervicalInvolvement}`);
  if (t.otherOrganInvolvement) tumorRows.push(`Other Organ Involvement: ${t.otherOrganInvolvement}`);
  if (t.peritonealWashings) tumorRows.push(`Peritoneal/Pelvic Washings: ${t.peritonealWashings}`);

  if (t.lvi) {
    const fociStr = t.lviFoci != null ? ` (${t.lviFoci} foci)` : '';
    tumorRows.push(`Lymphovascular Invasion: ${t.lvi}${fociStr}`);
  }

  if (t.fallopianTubes) tumorRows.push(`Fallopian Tubes: ${t.fallopianTubes}`);
  if (t.ovaries) tumorRows.push(`Ovaries: ${t.ovaries}`);

  parts.push(section('TUMOR', tumorRows.filter(Boolean)));

  // MARGINS
  const marginRows = [];
  if (m.status) {
    marginRows.push(`Margin Status: ${m.status}`);
    if (/negative/i.test(m.status || '')) {
      if (m.closestMm != null) marginRows.push(`  Distance to Closest Margin: ${m.closestMm} mm`);
      if (m.closestLocations?.length) marginRows.push(`  Closest Margin(s): ${m.closestLocations.join(', ')}`);
    } else if (/present|positive/i.test(m.status || '')) {
      if (m.involvedLocations?.length) marginRows.push(`  Involved Margin(s): ${m.involvedLocations.join(', ')}`);
    }
  }
  if (marginRows.length) parts.push(section('MARGINS', marginRows));

  // REGIONAL LYMPH NODES
  const nodeRows = [];
  const pel = n.pelvis || {};
  const paa = n.paraAortic || {};

  if (pel.status) {
    nodeRows.push(`Pelvic Nodes: ${pel.status}`);
    if (pel.totalExamined != null) nodeRows.push(`  Total Pelvic Examined: ${pel.totalExamined}`);
    if (pel.macroCount != null) nodeRows.push(`  Macrometastases (>2 mm): ${pel.macroCount}`);
    if (pel.microCount != null) nodeRows.push(`  Micrometastases (0.2–2 mm): ${pel.microCount}`);
    if (pel.itcCount != null) nodeRows.push(`  Isolated Tumor Cells: ${pel.itcCount}`);
    if (pel.largestDepositMm != null) nodeRows.push(`  Largest Pelvic Deposit: ${pel.largestDepositMm} mm`);
    if (pel.laterality?.length) nodeRows.push(`  Laterality: ${pel.laterality.join(', ')}`);
  }

  if (paa.status) {
    nodeRows.push(`Para-aortic Nodes: ${paa.status}`);
    if (paa.totalExamined != null) nodeRows.push(`  Total Para-aortic Examined: ${paa.totalExamined}`);
    if (paa.macroCount != null) nodeRows.push(`  Macrometastases (>2 mm): ${paa.macroCount}`);
    if (paa.microCount != null) nodeRows.push(`  Micrometastases (0.2–2 mm): ${paa.microCount}`);
    if (paa.largestDepositMm != null) nodeRows.push(`  Largest Para-aortic Deposit: ${paa.largestDepositMm} mm`);
  }

  if (n.nSuffix?.length) nodeRows.push(`N Suffix: ${n.nSuffix.join(', ')}`);
  if (nodeRows.length) parts.push(section('REGIONAL LYMPH NODES', nodeRows));

  // DISTANT METASTASIS
  if (cap.metastasis?.sites?.length) {
    parts.push(`DISTANT METASTASIS\nSite(s): ${cap.metastasis.sites.join(', ')}`);
  }

  // pTNM
  const stgRows = [];
  if (stg.yPrefix) stgRows.push('Modified Classification: y (post-neoadjuvant therapy)');
  if (stg.rPrefix) stgRows.push('Modified Classification: r (recurrence)');
  if (stg.ptCategory) stgRows.push(`pT Category: ${stg.ptCategory}`);
  if (stg.pnCategory) stgRows.push(`pN Category: ${stg.pnCategory}`);
  if (stg.pmCategory) stgRows.push(`pM Category: ${stg.pmCategory}`);
  if (stg.figoStage2009) stgRows.push(`FIGO Stage (2009): ${stg.figoStage2009}`);
  if (stg.figoStage2023) stgRows.push(`FIGO Stage (2023): ${stg.figoStage2023}`);
  if (stgRows.length) parts.push(section('pTNM CLASSIFICATION (AJCC 8th Edition)', stgRows));

  // SPECIAL STUDIES
  const ssRows = [];
  if (ss.biomarkersSource) ssRows.push(`Biomarker Status: ${ss.biomarkersSource}`);
  if (ss.er) ssRows.push(`ER: ${ss.er}`);
  if (ss.pr) ssRows.push(`PR: ${ss.pr}`);
  if (ss.mmr) ssRows.push(`MMR (MLH1/MSH2/MSH6/PMS2): ${ss.mmr}`);
  if (ss.p53) ssRows.push(`p53: ${ss.p53}`);
  if (ss.representativeBlock) ssRows.push(`Most Representative Block for Molecular Studies: ${ss.representativeBlock}`);
  if (ssRows.length) parts.push(section('SPECIAL STUDIES', ssRows));

  if (cap.additionalFindings) {
    parts.push(`ADDITIONAL FINDINGS\n${cap.additionalFindings}`);
  }

  return parts.filter(Boolean).join('\n\n');
}
