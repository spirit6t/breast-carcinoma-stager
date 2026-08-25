function norm(s) { return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : ''; }
function upper(s) { return norm(s).toUpperCase(); }
const indent = s => `      ${s}`;
const bullet = s => indent(`-     ${s}`);

const PT_EXPLAIN = {
  pT0:  'no evidence of primary tumor',
  pT1a: 'tumor ≤4 cm, limited to the kidney',
  pT1b: 'tumor >4 cm and ≤7 cm, limited to the kidney',
  pT2a: 'tumor >7 cm and ≤10 cm, limited to the kidney',
  pT2b: 'tumor >10 cm, limited to the kidney',
  pT3a: 'tumor extends into renal vein/segmental branches, pelvicalyceal system, or perinephric/renal sinus fat',
  pT3b: 'tumor extends into vena cava below the diaphragm',
  pT3c: 'tumor extends into vena cava above the diaphragm or invades IVC wall',
  pT4:  'tumor invades beyond Gerota\'s fascia (including ipsilateral adrenal)',
};

const PN_EXPLAIN = {
  'pN0': 'no regional lymph node metastasis',
  'pN1': 'metastasis in regional lymph node(s)',
};

const CPT_LABELS = {
  '88307': 'Partial nephrectomy / lymph node excision',
  '88309': 'Radical/total nephrectomy',
  '88331': 'Frozen section consultation',
  '88332': 'Frozen section add-on (each additional site)',
  '88305': 'Tissue biopsy',
};

function buildPrimaryFinalDx(caseData) {
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const m = cap.margins || {};
  const n = cap.nodes || {};
  const stg = cap.stage || {};

  // Header: "A. KIDNEY, LEFT, RADICAL NEPHRECTOMY:"
  const laterality = upper(cap.specimen?.laterality || '');
  const procedure = upper(cap.specimen?.procedure || '');
  const headerParts = ['KIDNEY'];
  if (laterality && laterality !== 'NOT SPECIFIED') headerParts.push(laterality);
  if (procedure) headerParts.push(procedure);
  const header = `A. ${headerParts.join(', ')}:`;

  const lines = [header];

  // Histologic type
  const histType = t.histologicType === 'Other' && t.histologicTypeOther
    ? t.histologicTypeOther
    : (t.histologicType || '');
  if (histType) lines.push(bullet(upper(histType)));

  // WHO/ISUP grade
  if (t.histologicGrade && t.histologicGrade !== 'Not applicable') {
    const GRADE_DESC = {
      G1: 'NUCLEOLI ABSENT OR INCONSPICUOUS AT 400X MAGNIFICATION',
      G2: 'NUCLEOLI CONSPICUOUS AT 400X MAGNIFICATION, NOT PROMINENT AT 100X',
      G3: 'NUCLEOLI CONSPICUOUS AT 100X MAGNIFICATION',
      G4: 'EXTREME NUCLEAR PLEOMORPHISM AND/OR MULTINUCLEATED GIANT CELLS',
      GX: 'GRADE CANNOT BE ASSESSED',
    };
    const desc = GRADE_DESC[t.histologicGrade] || '';
    lines.push(bullet(`WHO/ISUP ${upper(t.histologicGrade)}${desc ? ` — ${desc}` : ''}`));
  }

  // Tumor size
  if (t.sizeCm != null) {
    lines.push(bullet(`TUMOR SIZE: ${t.sizeCm} CM${t.focality === 'Multifocal' && t.multifocalCount ? ` (LARGEST OF ${t.multifocalCount} TUMORS)` : ''}`));
  }

  // Tumor extent — key findings
  const ext = t.tumorExtent || [];
  if (ext.length) {
    for (const e of ext) {
      if (!/limited to kidney/i.test(e)) {
        lines.push(bullet(upper(e)));
      }
    }
  }

  // Sarcomatoid / rhabdoid
  if (t.sarcomatoidFeatures && t.sarcomatoidFeatures !== 'Not identified') {
    const pct = t.sarcomatoidPct != null ? ` (${t.sarcomatoidPct}%)` : '';
    lines.push(bullet(`SARCOMATOID DIFFERENTIATION: ${upper(t.sarcomatoidFeatures)}${pct}`));
  }
  if (t.rhabdoidFeatures && t.rhabdoidFeatures !== 'Not identified') {
    const pct = t.rhabdoidPct != null ? ` (${t.rhabdoidPct}%)` : '';
    lines.push(bullet(`RHABDOID DIFFERENTIATION: ${upper(t.rhabdoidFeatures)}${pct}`));
  }

  // Necrosis
  if (t.necrosis) {
    const pct = t.necrosisPct != null ? ` (${t.necrosisPct}%)` : '';
    lines.push(bullet(`TUMOR NECROSIS: ${upper(t.necrosis)}${pct}`));
  }

  // LVI
  if (t.lvi) lines.push(bullet(`LYMPHOVASCULAR INVASION: ${upper(t.lvi)}`));

  // Margins
  if (m.status) {
    if (/all margins negative/i.test(m.status)) {
      lines.push(bullet('MARGINS: ALL NEGATIVE FOR INVASIVE CARCINOMA'));
    } else if (/present at margin/i.test(m.status)) {
      const sites = (m.involvedLocations || []).map(upper).join(', ');
      lines.push(bullet(`MARGINS INVOLVED BY CARCINOMA${sites ? `: ${sites}` : ''}`));
    } else if (/cannot be determined/i.test(m.status)) {
      lines.push(bullet('MARGINS: CANNOT BE DETERMINED'));
    } else if (/not applicable/i.test(m.status)) {
      lines.push(bullet('MARGINS: NOT APPLICABLE'));
    }
  }

  // Lymph nodes
  if (n.status && !/not applicable/i.test(n.status)) {
    if (/all negative/i.test(n.status)) {
      const examined = n.nodesExamined != null ? `0/${n.nodesExamined}` : '';
      lines.push(bullet(`REGIONAL LYMPH NODES: NEGATIVE FOR MALIGNANCY${examined ? ` (${examined})` : ''}`));
    } else if (/tumor present/i.test(n.status)) {
      const pos = n.nodesPositive != null ? n.nodesPositive : '?';
      const exam = n.nodesExamined != null ? n.nodesExamined : '?';
      lines.push(bullet(`REGIONAL LYMPH NODES: ${pos}/${exam} POSITIVE`));
    }
  }

  // Stage
  const prefix = stg.yPrefix ? 'y' : stg.rPrefix ? 'r' : '';
  const stageParts = [];
  if (stg.ptCategory) {
    const pt = stg.ptCategory.replace(/^p/, '');
    stageParts.push(`${prefix}p${pt}`);
  }
  if (stg.pnCategory && !/not assigned/i.test(stg.pnCategory)) {
    const pn = stg.pnCategory.replace(/^p/, '');
    stageParts.push(`${prefix}p${pn}`);
  }
  if (stg.pmCategory && !/not applicable/i.test(stg.pmCategory || '')) {
    stageParts.push(stg.pmCategory);
  }
  if (stg.tSuffix) stageParts[0] = (stageParts[0] || '') + stg.tSuffix;
  if (stageParts.length) lines.push(bullet(`PATHOLOGIC STAGE: ${stageParts.join(' ')}`));

  // Molecular pending
  if (cap.specialStudies?.molecularPending) {
    lines.push(bullet('MOLECULAR STUDIES: PENDING'));
  }

  lines.push(bullet('SEE CANCER CASE SUMMARY'));

  return lines.join('\n');
}

function buildSecondaryFinalDx(specimens) {
  return specimens.map(s => {
    const h = `${s.letter}. ${upper(s.designation || '')}:`;
    const dxLines = (s.diagnosisLines || []).filter(Boolean);
    if (!dxLines.length) return `${h}\n${bullet('NEGATIVE FOR MALIGNANCY')}`;
    return `${h}\n${dxLines.map(l => bullet(upper(l))).join('\n')}`;
  }).join('\n\n');
}

function buildCapSynoptic(caseData) {
  const cap = caseData.cap || {};
  const t = cap.tumor || {};
  const m = cap.margins || {};
  const n = cap.nodes || {};
  const stg = cap.stage || {};
  const ss = cap.specialStudies || {};

  const parts = [];
  parts.push('CASE SUMMARY: (KIDNEY: NEPHRECTOMY)');
  parts.push('Standard(s): AJCC 8th Edition, WHO 5th Edition (2022)');

  // SPECIMEN
  const specRows = [];
  if (cap.specimen?.procedure) {
    specRows.push(`Procedure: ${cap.specimen.procedure}${cap.specimen.procedureOther ? ' — ' + cap.specimen.procedureOther : ''}`);
  }
  if (cap.specimen?.laterality) specRows.push(`Laterality: ${cap.specimen.laterality}`);
  if (specRows.length) parts.push(['SPECIMEN', ...specRows].join('\n'));

  // TUMOR
  const tumorRows = [];
  if (t.focality) {
    tumorRows.push(`Tumor Focality: ${t.focality}${t.multifocalCount ? ` (${t.multifocalCount} tumors)` : ''}`);
  }
  if (t.site?.length) tumorRows.push(`Tumor Site: ${t.site.join(', ')}`);
  if (t.sizeCm != null) tumorRows.push(`Tumor Size: ${t.sizeCm} cm`);
  if (t.otherSizesCm?.length) tumorRows.push(`Other Tumor Size(s): ${t.otherSizesCm.join(', ')} cm`);

  const histType = t.histologicType === 'Other' && t.histologicTypeOther
    ? `Other: ${t.histologicTypeOther}`
    : (t.histologicType || '');
  if (histType) tumorRows.push(`Histologic Type: ${histType}`);
  if (t.histologicGrade) tumorRows.push(`Histologic Grade (WHO/ISUP): ${t.histologicGrade}`);

  if (t.tumorExtent?.length) {
    tumorRows.push('Tumor Extent:');
    for (const e of t.tumorExtent) tumorRows.push(`  ${e}`);
  }

  if (t.rhabdoidFeatures) {
    tumorRows.push(`Rhabdoid Features: ${t.rhabdoidFeatures}${t.rhabdoidPct != null ? ` (${t.rhabdoidPct}%)` : ''}`);
  }
  if (t.sarcomatoidFeatures) {
    tumorRows.push(`Sarcomatoid Features: ${t.sarcomatoidFeatures}${t.sarcomatoidPct != null ? ` (${t.sarcomatoidPct}%)` : ''}`);
  }
  if (t.necrosis) {
    tumorRows.push(`Tumor Necrosis: ${t.necrosis}${t.necrosisPct != null ? ` (${t.necrosisPct}%)` : ''}`);
  }
  if (t.lvi) tumorRows.push(`Lymphatic/Small Vessel Vascular Invasion: ${t.lvi}`);
  if (t.tumorComment) tumorRows.push(`Comment: ${t.tumorComment}`);

  if (tumorRows.length) parts.push(['TUMOR', ...tumorRows].join('\n'));

  // MARGINS
  if (m.status) {
    const marginRows = [`Margin Status: ${m.status}`];
    if (/present at margin/i.test(m.status) && m.involvedLocations?.length) {
      marginRows.push('Margin(s) Involved:');
      for (const loc of m.involvedLocations) marginRows.push(`  ${loc}`);
    }
    if (m.marginComment) marginRows.push(`Comment: ${m.marginComment}`);
    parts.push(['MARGINS', ...marginRows].join('\n'));
  }

  // REGIONAL LYMPH NODES
  if (n.status) {
    const nodeRows = [`Regional Lymph Node Status: ${n.status}`];
    if (n.nodesPositive != null) nodeRows.push(`Number of Nodes with Tumor: ${n.nodesPositive}`);
    if (n.nodesExamined != null) nodeRows.push(`Number of Nodes Examined: ${n.nodesExamined}`);
    if (n.sites?.length) nodeRows.push(`Nodal Site(s) with Tumor: ${n.sites.join(', ')}`);
    if (n.largestDepositCm != null) nodeRows.push(`Size of Largest Nodal Deposit: ${n.largestDepositCm} cm`);
    if (n.extranodalExtension) nodeRows.push(`Extranodal Extension: ${n.extranodalExtension}`);
    parts.push(['REGIONAL LYMPH NODES', ...nodeRows].join('\n'));
  }

  // DISTANT METASTASIS
  const metSites = cap.metastasis?.sites || [];
  const hasNonContiguous = (t.tumorExtent || []).some(e => /non.?contiguous/i.test(e));
  if (metSites.length || hasNonContiguous) {
    const metRows = [];
    if (hasNonContiguous) metRows.push('Non-contiguous adrenal gland involvement');
    if (metSites.length) metRows.push(`Site(s): ${metSites.join(', ')}`);
    parts.push(['DISTANT METASTASIS', ...metRows].join('\n'));
  }

  // pTNM
  const stgRows = [];
  if (stg.yPrefix) stgRows.push('Modified Classification: y (post-neoadjuvant therapy)');
  if (stg.rPrefix) stgRows.push('Modified Classification: r (recurrence)');
  if (stg.ptCategory) {
    const key = stg.ptCategory.toLowerCase();
    const exp = PT_EXPLAIN[key] || PT_EXPLAIN[stg.ptCategory] || '';
    stgRows.push(`pT Category: ${stg.ptCategory}${stg.tSuffix || ''}${exp ? ` — ${exp}` : ''}`);
  }
  if (stg.pnCategory && !/not assigned/i.test(stg.pnCategory)) {
    const exp = PN_EXPLAIN[stg.pnCategory] || '';
    stgRows.push(`pN Category: ${stg.pnCategory}${exp ? ` — ${exp}` : ''}`);
  } else if (stg.pnCategory) {
    stgRows.push(`pN Category: ${stg.pnCategory}`);
  }
  if (stg.pmCategory && !/not applicable/i.test(stg.pmCategory || '')) {
    stgRows.push(`pM Category: ${stg.pmCategory} — distant metastasis confirmed pathologically`);
  }
  if (stgRows.length) parts.push(['pTNM CLASSIFICATION (AJCC 8th Edition)', ...stgRows].join('\n'));

  // SPECIAL STUDIES
  const ssRows = [];
  if (ss.ihcPerformed && ss.ihcDescription) ssRows.push(`IHC: ${ss.ihcDescription}`);
  if (ss.molecularPending) ssRows.push('Molecular Studies: Pending');
  if (ss.molecularMarkers?.length) ssRows.push(`Molecular Markers: ${ss.molecularMarkers.join(', ')}`);
  if (ssRows.length) parts.push(['SPECIAL STUDIES', ...ssRows].join('\n'));

  // ADDITIONAL FINDINGS
  if (cap.additionalFindings) {
    parts.push(`ADDITIONAL FINDINGS\n${cap.additionalFindings}`);
  }

  return parts.filter(Boolean).join('\n\n');
}

function buildCptSummary(caseData) {
  const cap = caseData.cap || {};
  const procedure = cap.specimen?.procedure || '';
  const secondaries = caseData.specimens || [];

  const lines = ['CPT BILLING SUMMARY'];
  const totals = {};
  const addCode = (cpt, label) => {
    if (!cpt) return;
    totals[cpt] = (totals[cpt] || 0) + 1;
    return cpt;
  };

  // Primary specimen
  let primaryCpt = caseData._primaryCpt;
  let primaryLabel = caseData._primaryCptLabel;
  if (!primaryCpt) {
    if (/radical|total|simple/i.test(procedure)) {
      primaryCpt = '88309'; primaryLabel = 'Radical/total nephrectomy';
    } else {
      primaryCpt = '88307'; primaryLabel = 'Partial nephrectomy';
    }
  }
  lines.push(`A. KIDNEY — ${primaryCpt} (${primaryLabel})`);
  addCode(primaryCpt);

  // Secondary specimens
  for (const s of secondaries) {
    const label = s.cptLabel || CPT_LABELS[s.cpt] || s.cpt || '';
    lines.push(`${s.letter}. ${s.designation} — ${s.cpt}${label ? ` (${label})` : ''}`);
    addCode(s.cpt);
    for (const addon of (s.cptAddons || [])) {
      lines.push(`   Add-on: ${addon} (frozen section, additional site)`);
      addCode(addon);
    }
  }

  const totalParts = Object.keys(totals).sort().map(cpt => `${cpt} × ${totals[cpt]}`);
  if (totalParts.length) {
    lines.push('');
    lines.push(`TOTALS: ${totalParts.join(', ')}`);
  }

  return lines.join('\n');
}

export function assembleKidneyReport(caseData) {
  const parts = [];

  if (caseData.receivedDate) parts.push(`Specimen received: ${caseData.receivedDate}`);

  parts.push('FINAL DIAGNOSIS:');

  const primaryDx = buildPrimaryFinalDx(caseData);
  parts.push(primaryDx);

  const secondaries = (caseData.specimens || []);
  if (secondaries.length) {
    parts.push(buildSecondaryFinalDx(secondaries));
  }

  if (caseData.caseComment && caseData.caseComment.trim()) {
    parts.push(`COMMENT:\n${caseData.caseComment.trim()}`);
  }

  parts.push('---');
  parts.push(buildCapSynoptic(caseData));

  const cpt = buildCptSummary(caseData);
  parts.push('---');
  parts.push(cpt);

  return parts.filter(Boolean).join('\n\n');
}
