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

  // MARGINS (Note K) — required only if cervix/parametrium/paracervix involved
  const marginRows = [];
  if (m.status) {
    marginRows.push(`Margin Status (required only if cervix and/or parametrium/paracervix involved by carcinoma)`);
    if (/not\s+applicable/i.test(m.status)) {
      marginRows.push(`  Not applicable`);
    } else if (/negative/i.test(m.status)) {
      marginRows.push(`  All margins negative for carcinoma`);
      if (m.closestLocations?.length) {
        marginRows.push(`  Closest Margin(s) to Carcinoma:`);
        for (const loc of m.closestLocations) marginRows.push(`    ${loc}`);
      }
      if (m.closestMm != null) {
        const qualifier = m.distanceQualifier || 'Exact distance';
        marginRows.push(`  Distance from Carcinoma to Closest Margin: ${qualifier}: ${m.closestMm} mm`);
      } else if (m.distanceQualifier === 'Less than 1 mm') {
        marginRows.push(`  Distance from Carcinoma to Closest Margin: Less than 1 mm`);
      } else if (m.distanceQualifier === 'Cannot be determined') {
        marginRows.push(`  Distance from Carcinoma to Closest Margin: Cannot be determined`);
      }
    } else if (/present|positive/i.test(m.status)) {
      marginRows.push(`  Carcinoma present at margin`);
      if (m.involvedLocations?.length) {
        marginRows.push(`  Margin(s) Involved by Carcinoma:`);
        for (const loc of m.involvedLocations) marginRows.push(`    ${loc}`);
      }
    } else if (/cannot\s+be\s+determined/i.test(m.status)) {
      marginRows.push(`  Cannot be determined`);
    }
  }
  if (marginRows.length) parts.push(section('MARGINS (Note K)', marginRows));

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
  const PT_EXPLAIN = {
    pT1a: 'tumor limited to endometrium or <50% myometrial invasion',
    pT1b: '≥50% myometrial invasion',
    pT2:  'cervical stromal invasion',
    pT3a: 'uterine serosal involvement or adnexal spread',
    pT3b: 'vaginal or parametrial involvement',
    pT4:  'bladder or bowel mucosa invasion',
  };
  const PN_EXPLAIN = {
    'pN0':      'no regional lymph node metastasis',
    'pN0(i+)':  'isolated tumor cells only (≤0.2 mm)',
    'pN1mi':    'micrometastasis (>0.2–2 mm) to pelvic nodes',
    'pN1a':     'macrometastasis (>2 mm) to pelvic nodes',
    'pN2mi':    'micrometastasis to para-aortic nodes',
    'pN2a':     'macrometastasis (>2 mm) to para-aortic nodes',
  };
  const FIGO2023_EXPLAIN = {
    'IA1':     'non-aggressive histological type; confined to endometrium or polyp',
    'IA2':     'non-aggressive histological type; <50% myometrial invasion; no/focal LVSI',
    'IA3':     'low-grade endometrioid; limited to uterus and ovary',
    'IB':      'non-aggressive histological type; ≥50% myometrial invasion; no/focal LVSI',
    'IC':      'aggressive histological type; confined to endometrium (no myometrial invasion)',
    'IIA':     'non-aggressive histological type; cervical stromal invasion',
    'IIB':     'non-aggressive histological type; substantial LVSI (≥5 foci)',
    'IIC':     'aggressive histological type; any myometrial involvement',
    'IIIA1':   'spread to ovary or fallopian tube',
    'IIIA2':   'uterine subserosa or serosal involvement',
    'IIIB1':   'vaginal or parametrial spread',
    'IIIB2':   'pelvic peritoneal metastasis',
    'IIIC1i':  'pelvic lymph node micrometastasis',
    'IIIC1ii': 'pelvic lymph node macrometastasis',
    'IIIC2i':  'para-aortic lymph node micrometastasis',
    'IIIC2ii': 'para-aortic lymph node macrometastasis',
    'IVA':     'bladder or bowel mucosa invasion',
    'IVB':     'abdominal peritoneal metastasis beyond pelvis',
    'IVC':     'distant metastasis (lungs, liver, brain, bone, or extra-abdominal lymph nodes)',
  };

  const stgRows = [];
  if (stg.yPrefix) stgRows.push('Modified Classification: y (post-neoadjuvant therapy)');
  if (stg.rPrefix) stgRows.push('Modified Classification: r (recurrence)');
  if (stg.ptCategory) {
    const exp = PT_EXPLAIN[stg.ptCategory] || '';
    stgRows.push(`pT Category: ${stg.ptCategory}${exp ? ` — ${exp}` : ''}`);
  }
  if (stg.pnCategory) {
    const exp = PN_EXPLAIN[stg.pnCategory] || '';
    stgRows.push(`pN Category: ${stg.pnCategory}${exp ? ` — ${exp}` : ''}`);
  }
  if (stg.pmCategory) {
    const pmExp = /pM1/i.test(stg.pmCategory) ? ' — distant metastasis present' : '';
    stgRows.push(`pM Category: ${stg.pmCategory}${pmExp}`);
  }
  const FIGO2009_EXPLAIN = {
    'IA':    'tumor limited to endometrium or invades <50% of myometrium',
    'IB':    'tumor invades ≥50% of myometrium',
    'II':    'cervical stromal invasion; tumor confined to uterus',
    'IIIA':  'tumor involves uterine serosa and/or adnexa',
    'IIIB':  'vaginal or parametrial involvement',
    'IIIC1': 'pelvic lymph node metastasis',
    'IIIC2': 'para-aortic lymph node metastasis ± pelvic node involvement',
    'IVA':   'bladder or bowel mucosa invasion',
    'IVB':   'distant metastases including intra-abdominal or inguinal lymph nodes',
  };
  if (stg.figoStage2009) {
    const key09 = String(stg.figoStage2009).trim().toUpperCase();
    const exp09 = FIGO2009_EXPLAIN[key09] || '';
    stgRows.push(`FIGO Stage (2009): ${stg.figoStage2009}${exp09 ? ` — ${exp09}` : ''}`);
  }
  if (stg.figoStage2023) {
    const fKey = String(stg.figoStage2023).trim().toUpperCase();
    const fExp = /IICm/i.test(stg.figoStage2023)
      ? 'p53 abnormal; any myometrial invasion; confined to corpus'
      : /IAm/i.test(stg.figoStage2023)
      ? 'POLE mutated; confined to corpus or with cervical extension'
      : FIGO2023_EXPLAIN[fKey] || '';
    stgRows.push(`FIGO Stage (2023): ${stg.figoStage2023}${fExp ? ` — ${fExp}` : ''}`);
  }
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
