/**
 * CAP synoptic renderer for Breast Excision with DCIS (clean-narrative format:
 * section headers kept, only selected items printed under each).
 * Standard: AJCC-UICC 8.
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

export function renderCapSynopticDCIS(caseData) {
  const cap = caseData.cap || {};
  const spec = cap.specimen || {};
  const t = cap.tumor || {};
  const m = cap.margins || {};
  const n = cap.nodes || {};
  const met = cap.metastasis || {};
  const stg = cap.stage || {};
  const ss = cap.specialStudies || {};

  const sections = [];

  sections.push('CASE SUMMARY: DCIS OF THE BREAST — RESECTION');
  sections.push('Standard(s): AJCC-UICC 8');

  sections.push(
    section('SPECIMEN', [
      line('Procedure', spec.procedure),
      line('Specimen Laterality', spec.laterality),
    ])
  );

  const sizeLine = (() => {
    if (t.sizeExtentMm != null && t.sizeExtentMm !== '') {
      const add = t.additionalDimMm ? ` (additional ${t.additionalDimMm} mm)` : '';
      return `${t.sizeExtentMm} mm${add}`;
    }
    if (t.cannotDetermineSize) return `Cannot be determined (${t.cannotDetermineSize})`;
    return null;
  })();

  sections.push(
    section('TUMOR', [
      listLine('Tumor Site', t.site),
      line('Histologic Type', t.histologicType),
      line('Size (Extent) of DCIS', sizeLine),
      line('Number of Blocks with DCIS', t.blocksWithDCIS),
      line('Number of Blocks Examined', t.blocksExamined),
      listLine('Architectural Patterns', t.architecturalPatterns),
      line('Nuclear Grade', t.nuclearGrade),
      line('Necrosis', t.necrosis),
      listLine(
        'Microcalcifications',
        [
          ...(t.microcalcifications || []),
          ...(t.microcalcificationsOther ? [`Other: ${t.microcalcificationsOther}`] : []),
        ]
      ),
    ])
  );

  const marginLines = [];
  if (m.status) marginLines.push(`  Margin Status: ${m.status}`);
  if (m.status === 'All margins negative for DCIS') {
    if (m.distanceMm != null && m.distanceMm !== '') {
      marginLines.push(`  Distance from DCIS to Closest Margin: ${m.distanceMm} mm`);
    }
    if (Array.isArray(m.closestMargins) && m.closestMargins.length) {
      marginLines.push(`  Closest Margin(s) to DCIS: ${m.closestMargins.join(', ')}`);
    }
  }
  if (m.status === 'DCIS present at margin' && Array.isArray(m.involvedMargins) && m.involvedMargins.length) {
    marginLines.push('  Margin(s) Involved by DCIS:');
    for (const mg of m.involvedMargins) {
      const extent = mg.extent ? ` — ${mg.extent}` : '';
      marginLines.push(`    • ${mg.side}${extent}`);
    }
  }
  sections.push(section('MARGINS', marginLines));

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

  sections.push(
    section('PATHOLOGIC STAGE CLASSIFICATION (pTNM, AJCC 8th Edition)', [
      line('pT Category', stg.ptCategory),
      line('pN Category', stg.pnCategory),
      line('pM Category', stg.pmCategory),
    ])
  );

  const af = (caseData.cap?.additionalFindings || '').trim();
  sections.push(section('ADDITIONAL FINDINGS', [af ? `  ${af}` : null]));

  const erPrHer2 =
    ss.erPrHer2Text && ss.erPrHer2Text.trim()
      ? ss.erPrHer2Text.trim()
      : 'was performed on the previous biopsy # _____ with the following result: {ER: ___%, PR: ___%, HER2: ___}';
  sections.push(section('SPECIAL STUDIES', [`  ER/PR/HER2: ${erPrHer2}`]));

  return sections.filter(Boolean).join('\n\n');
}
