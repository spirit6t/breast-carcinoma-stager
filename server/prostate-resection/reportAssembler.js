/**
 * Report assembler for prostate radical prostatectomy cases.
 * CAP Protocol v4.3.0.0 (September 2023, AJCC 8th Edition)
 */

function up(s)   { return s ? String(s).toUpperCase() : ''; }
function norm(s) { return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : ''; }
function dash(s) { return `      -     ${s}`; }
function isNeg(v) { return !v || /not identified|absent|negative|not applicable|not seen/i.test(v); }

// ── Final diagnosis helpers ───────────────────────────────────────────────────

function buildPrimaryDxLines(c) {
  const t  = c.cap.tumor;
  const q  = c.cap.quantitation;
  const m  = c.cap.margins;
  const n  = c.cap.nodes;
  const st = c.cap.stage;
  const lines = [];

  // 1. Histologic type(s)
  const types = t.histologicTypes && t.histologicTypes.length
    ? t.histologicTypes
    : ['Acinar adenocarcinoma, conventional (usual) type'];
  for (const ht of types) {
    lines.push(dash(up(ht)));
  }

  // 2. Grade group
  if (t.gradeGroupLabel) {
    lines.push(dash(up(t.gradeGroupLabel)));
  }

  // 3. Pattern 4 %
  if (t.pattern4Pct) {
    lines.push(dash(`PERCENTAGE OF PATTERN 4: ${up(t.pattern4Pct)}`));
  }

  // 4. Intraductal carcinoma — only if present; details in CAP synoptic
  const idcVal = t.idc || 'Not identified';
  if (!isNeg(idcVal)) {
    lines.push(dash(`INTRADUCTAL CARCINOMA: ${up(idcVal)}`));
  }

  // 6. Tumor quantitation
  const pctPart = q.tumorPctInvolved
    ? `APPROXIMATELY ${up(q.tumorPctInvolved)} OF PROSTATE INVOLVED`
    : null;
  const nodulePart = q.dominantNoduleMm != null
    ? `DOMINANT NODULE: ${q.dominantNoduleMm} MM${q.dominantNoduleLocation ? `, ${up(q.dominantNoduleLocation)}` : ''}`
    : null;
  if (pctPart || nodulePart) {
    lines.push(dash(`TUMOR QUANTITATION: ${[pctPart, nodulePart].filter(Boolean).join('; ')}`));
  }

  // 7. EPE — only if present
  const epeVal = t.epe || 'Not identified';
  if (!isNeg(epeVal)) {
    lines.push(dash(`EXTRAPROSTATIC EXTENSION: ${up(epeVal)}`));
    if (t.epeLocations && t.epeLocations.length) {
      lines.push(dash(`LOCATION(S): ${t.epeLocations.map(up).join(', ')}`));
    }
  }

  // 8. Bladder neck invasion — only if present
  if (!isNeg(t.bladderNeckInvasion)) {
    lines.push(dash(`URINARY BLADDER NECK INVASION: ${up(t.bladderNeckInvasion)}`));
  }

  // 9. Seminal vesicle invasion — only if present
  if (!isNeg(t.seminalVesicleInvasion)) {
    lines.push(dash(`SEMINAL VESICLE INVASION: ${up(t.seminalVesicleInvasion)}`));
  }

  // 10. LVI — only if present
  if (!isNeg(t.lvi)) {
    lines.push(dash(`LYMPHATIC AND/OR VASCULAR INVASION: ${up(t.lvi)}`));
  };

  // 11. Perineural invasion (render if set)
  if (t.perineumralInvasion) {
    lines.push(dash(`PERINEURAL INVASION: ${up(t.perineumralInvasion)}`));
  }

  // 12. Margins
  if (/positive|present at margin/i.test(m.status || '')) {
    const parts = [];
    if (m.marginsInvolved && m.marginsInvolved.length) {
      parts.push(`${m.marginsInvolved.map(up).join(', ')} MARGIN${m.marginsInvolved.length > 1 ? 'S' : ''}`);
    }
    if (m.marginLinearMm)  parts.push(up(m.marginLinearMm));
    if (m.marginFocality)  parts.push(up(m.marginFocality));
    lines.push(dash(`INVASIVE CARCINOMA AT MARGIN${parts.length ? ': ' + parts.join('; ') : ''}`));
  } else {
    lines.push(dash('ALL MARGINS NEGATIVE FOR INVASIVE CARCINOMA'));
  }


  // 14. Pathologic stage
  if (st.ptCategory) {
    const pfx = `${st.yPrefix ? 'y' : ''}${st.rPrefix ? 'r' : ''}`;
    let stageLine = `PATHOLOGIC STAGE ${pfx}${st.ptCategory}`;
    if (st.pnCategory && st.pnCategory !== 'pN not assigned') {
      stageLine += ` ${pfx}${st.pnCategory}`;
    }
    if (st.pmCategory && st.pmCategory !== 'Not applicable') {
      stageLine += ` ${st.pmCategory}`;
    }
    lines.push(dash(stageLine));
  }

  // 15. See case summary
  lines.push(dash('SEE CASE SUMMARY FOR TUMOR CHARACTERISTICS'));

  return lines.join('\n');
}

// ── CAP synoptic ──────────────────────────────────────────────────────────────

function buildCapSynoptic(c) {
  const lines = [];
  const sp = c.cap.specimen;
  const t  = c.cap.tumor;
  const q  = c.cap.quantitation;
  const m  = c.cap.margins;
  const n  = c.cap.nodes;
  const st = c.cap.stage;

  const SYN = '      '; // 6 spaces — matches other CAP synoptics
  const SUB = '         '; // 9 spaces for sub-items

  function syn(s) { lines.push(`${SYN}${s}`); }
  function sub(s) { lines.push(`${SUB}${s}`); }

  lines.push('CAP RADICAL PROSTATECTOMY SYNOPTIC (CAP v4.3.0.0)');
  lines.push('');

  // SPECIMEN
  syn('SPECIMEN');
  syn(`   Procedure: ${sp.procedure || 'Radical prostatectomy'}`);
  if (sp.prostateWeightG != null) syn(`   Prostate Weight: ${sp.prostateWeightG} g`);
  if (sp.prostateSizeCm)          syn(`   Prostate Size: ${sp.prostateSizeCm}`);
  lines.push('');

  // TUMOR
  syn('TUMOR');
  const types = t.histologicTypes && t.histologicTypes.length
    ? t.histologicTypes
    : ['Acinar adenocarcinoma, conventional (usual) type'];
  syn(`   Histologic Type: ${types.join('; ')}`);

  if (t.gradeGroupLabel) {
    syn(`   Histologic Grade: ${t.gradeGroupLabel}`);
    if (t.pattern4Pct) {
      sub(`Percentage of Pattern 4: ${t.pattern4Pct}`);
    }
    sub(`Minor Tertiary Pattern 5: ${t.minorTertiaryPattern5 || 'Not applicable / not identified'}`);

    const idcVal = t.idc || 'Not identified';
    sub(`Intraductal Carcinoma (IDC-P): ${idcVal}`);
    if (/present/i.test(idcVal)) {
      lines.push(`            IDC Incorporated into Grade: ${t.idcIncorporatedIntoGrade || 'Cannot be determined'}`);
    }

    const gg = t.gradeGroup;
    if (gg && gg >= 2 && gg <= 4) {
      sub(`Cribriform Glands: ${t.cribriformGlands || 'Not identified'}`);
    } else {
      sub('Cribriform Glands: Not applicable');
    }

    const te = t.treatmentEffect && t.treatmentEffect.length
      ? t.treatmentEffect.join('; ')
      : 'No known prior treatment';
    sub(`Treatment Effect: ${te}`);
  }

  // Extent — part of TUMOR section per CAP v4.3.0.0
  const epeVal = t.epe || 'Not identified';
  syn(`   Extraprostatic Extension: ${epeVal}`);
  if (/present/i.test(epeVal) && t.epeLocations && t.epeLocations.length) {
    sub(`Location(s): ${t.epeLocations.join(', ')}`);
  }
  syn(`   Urinary Bladder Neck Invasion: ${t.bladderNeckInvasion || 'Not identified'}`);
  syn(`   Seminal Vesicle Invasion: ${t.seminalVesicleInvasion || 'Not identified'}`);
  syn(`   Lymphatic and/or Vascular Invasion: ${t.lvi || 'Not identified'}`);
  syn(`   Perineural Invasion: ${t.perineumralInvasion || 'Not identified'}`);
  lines.push('');

  // TUMOR QUANTITATION
  syn('TUMOR QUANTITATION');
  if (q.tumorPctInvolved) {
    syn(`   Estimated Percentage of Prostate Involved: ${q.tumorPctInvolved}`);
  }
  if (q.dominantNoduleMm != null) {
    syn(`   Greatest Dimension of Dominant Nodule: ${q.dominantNoduleMm} mm`);
    if (q.dominantNoduleLocation) {
      syn(`   Location of Dominant Nodule: ${q.dominantNoduleLocation}`);
    }
  }
  lines.push('');

  // MARGINS
  syn('MARGINS');
  const marginStatus = m.status || 'All margins negative for invasive carcinoma';
  syn(`   Margins: ${marginStatus}`);
  if (/positive|present at margin/i.test(marginStatus)) {
    if (m.marginsInvolved && m.marginsInvolved.length) {
      sub(`Margin(s) Involved: ${m.marginsInvolved.join(', ')}`);
    }
    if (m.marginLinearMm) {
      sub(`Linear Length: ${m.marginLinearMm}`);
    }
    if (m.marginFocality) {
      sub(`Focality: ${m.marginFocality}`);
    }
    if (m.gleassonPatternAtMargin && m.gleassonPatternAtMargin.length) {
      sub(`Gleason Pattern at Margin: ${m.gleassonPatternAtMargin.join(', ')}`);
    }
    if (m.marginInAreaOfEpe) {
      sub(`Margin in Area of EPE: ${m.marginInAreaOfEpe}`);
    }
  }
  lines.push('');

  // REGIONAL LYMPH NODES
  syn('REGIONAL LYMPH NODES');
  const nodeStatus = n.status || (n.nodesExamined != null ? 'No tumor seen' : 'No lymph nodes submitted');
  syn(`   Lymph Nodes: ${nodeStatus}`);
  if (n.nodesPositive != null && n.nodesPositive > 0) {
    sub(`Number of Nodes with Tumor: ${n.nodesPositive}`);
    if (n.nodalSitesWithTumor && n.nodalSitesWithTumor.length) {
      sub(`Nodal Site(s) with Tumor: ${n.nodalSitesWithTumor.join(', ')}`);
    }
    if (n.extranodalExtension) {
      sub(`Extranodal Extension: ${n.extranodalExtension}`);
    }
  }
  if (n.nodesExamined != null) {
    sub(`Number of Nodes Examined: ${n.nodesExamined}`);
  }
  lines.push('');

  // DISTANT METASTASIS
  syn('DISTANT METASTASIS');
  if (st.distantSitesStatus && /present/i.test(st.distantSitesStatus)) {
    syn('   Distant Metastasis: Present');
    if (st.distantSites && st.distantSites.length) {
      sub(`Site(s): ${st.distantSites.join(', ')}`);
    }
  } else {
    syn('   Distant Metastasis: Not applicable');
  }
  lines.push('');

  // pTNM CLASSIFICATION
  syn('pTNM CLASSIFICATION (AJCC 8th Edition)');

  const pfx = st.yPrefix ? 'y' : st.rPrefix ? 'r' : null;
  syn(`   Modified Classification: ${pfx || 'Not applicable'}`);

  const ptDesc = {
    pT2:  'Organ confined',
    pT3a: 'Extraprostatic extension or microscopic bladder neck invasion',
    pT3b: 'Seminal vesicle invasion',
    pT3:  'Extraprostatic tumor (NOS)',
    pT4:  'Invasion of rectum, external sphincter, levator ani, or pelvic wall',
  };
  if (st.ptCategory) {
    const p = pfx || '';
    syn(`   Primary Tumor (pT): ${p}${st.ptCategory} — ${ptDesc[st.ptCategory] || ''}`);
  }

  const pnDesc = {
    'pN not assigned': 'Regional lymph nodes not sampled',
    pN0:               'No positive regional nodes',
    pN1:               'Metastasis in regional node(s)',
  };
  if (st.pnCategory) {
    const p = st.pnCategory !== 'pN not assigned' ? (pfx || '') : '';
    syn(`   Regional Lymph Nodes (pN): ${p}${st.pnCategory} — ${pnDesc[st.pnCategory] || ''}`);
  }

  if (st.pmCategory && st.pmCategory !== 'Not applicable') {
    const pmDesc = {
      pM1a: 'Nonregional lymph node(s)',
      pM1b: 'Bone(s)',
      pM1c: 'Other site(s)',
    };
    syn(`   Distant Metastasis (pM): ${st.pmCategory} — ${pmDesc[st.pmCategory] || ''}`);
  }
  lines.push('');

  // ADDITIONAL FINDINGS
  syn('ADDITIONAL FINDINGS');
  const af = c.cap.additionalFindings || [];
  if (af.length) {
    for (const f of af) syn(`   ${f}`);
  } else {
    syn('   No additional findings identified');
  }

  return lines.join('\n');
}

// ── CPT summary ───────────────────────────────────────────────────────────────

function buildCptSummary(specimens) {
  if (!specimens.length) return '';
  const CPT_LABELS = {
    '88309': 'Radical prostatectomy',
    '88307': 'Lymph node / regional excision',
    '88305': 'Tissue specimen',
    '88331': 'Frozen section — first site',
    '88332': 'Frozen section — additional site (add-on)',
  };
  const counts = new Map();
  const lines = ['CPT BILLING SUMMARY'];
  for (const s of specimens) {
    const cpt = s.cpt || '88309';
    lines.push(`   ${s.letter}. ${s.designation || ''} — ${cpt}`);
    counts.set(cpt, (counts.get(cpt) || 0) + 1);
    for (const addon of (s.cptAddons || [])) {
      lines.push(`      Add-on: ${addon}${CPT_LABELS[addon] ? ` (${CPT_LABELS[addon]})` : ''}`);
      counts.set(addon, (counts.get(addon) || 0) + 1);
    }
  }
  const totalParts = [...counts.entries()].sort().map(
    ([code, count]) => `${code} × ${count}${CPT_LABELS[code] ? ` (${CPT_LABELS[code]})` : ''}`
  );
  if (totalParts.length) {
    lines.push('');
    lines.push(`   TOTALS: ${totalParts.join(', ')}`);
  }
  return lines.join('\n');
}

// ── Main assembler ────────────────────────────────────────────────────────────

export function assembleProstateResectionReport(caseData) {
  const parts = [];
  const specimens = (caseData.specimens || []).sort((a, b) => a.letter.localeCompare(b.letter));

  parts.push('FINAL DIAGNOSIS:');
  parts.push('');

  for (const spec of specimens) {
    const header = `${spec.letter}. ${up(spec.designation || '')}:`;
    if (spec.isPrimary) {
      parts.push(`${header}\n${buildPrimaryDxLines(caseData)}`);
    } else if (spec.diagnosisLines) {
      parts.push(`${header}\n${dash(up(norm(spec.diagnosisLines)))}`);
    } else {
      parts.push(`${header}\n${dash('(PENDING)')}`);
    }
  }

  if (caseData.caseComment?.trim()) {
    parts.push(`Comment: ${caseData.caseComment.trim()}`);
  }

  parts.push('---');
  parts.push(buildCapSynoptic(caseData));

  const cpt = buildCptSummary(specimens);
  if (cpt) {
    parts.push('---');
    parts.push(cpt);
  }

  return parts.join('\n\n');
}
