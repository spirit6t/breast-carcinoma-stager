const ONES = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
               'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN',
               'SEVENTEEN','EIGHTEEN','NINETEEN'];
const TENS = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];

function numToWords(n) {
  n = Number(n) || 0;
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
}

function extentToDxPhrase(tumorExtent) {
  if (!tumorExtent) return '';
  const e = tumorExtent.toLowerCase();
  if (e.includes('intramucosal') || e.includes('lamina propria')) return 'INTRAMUCOSAL';
  if (e.includes('submucosa')) return 'THROUGH THE MUSCULARIS MUCOSAE INTO THE SUBMUCOSA';
  if (e.includes('through muscularis propria') || e.includes('pericolic') || e.includes('perirectal'))
    return 'THROUGH THE MUSCULARIS PROPRIA INTO THE PERICOLIC/PERIRECTAL SOFT TISSUE';
  if (e.includes('muscularis propria')) return 'INTO THE MUSCULARIS PROPRIA';
  if (e.includes('visceral peritoneum')) return 'THROUGH THE VISCERAL PERITONEUM';
  if (e.includes('adjacent') || e.includes('adheres')) return 'INTO THE ADJACENT ORGAN/STRUCTURE';
  return tumorExtent.toUpperCase();
}

function buildPrimaryDxLine(t) {
  const typeRaw = t.histologicType || 'Adenocarcinoma';
  const typeStr = typeRaw.toUpperCase();
  const prefix = /^INVASIVE\b/.test(typeStr) ? '' : 'INVASIVE ';
  const gradePhrase = t.histologicGrade ? `, ${t.histologicGrade.toUpperCase()}` : '';

  const extentPhrase = extentToDxPhrase(t.tumorExtent);
  const polypPhrase = t.polyp && !/none/i.test(t.polyp) ? ` ARISING IN THE ${t.polyp.toUpperCase()}` : '';
  const sizePhrase = t.sizeCm != null ? ` AND MEASURING ${t.sizeCm} CM` : '';

  let line = `${prefix}${typeStr}${gradePhrase}`;
  if (extentPhrase) line += ` INVADING ${extentPhrase}`;
  line += polypPhrase;
  line += sizePhrase;
  return line;
}

function buildMarginDxLine(m) {
  if (!m.invasiveStatus) return null;
  if (/negative/i.test(m.invasiveStatus) || /all margins negative/i.test(m.invasiveStatus)) {
    const margins = m.closestMargins && m.closestMargins.length > 0
      ? m.closestMargins.map(x => x.toUpperCase())
      : ['PROXIMAL', 'DISTAL', 'MESENTERIC'];
    const dysplasia = m.nonInvasiveStatus && /negative/i.test(m.nonInvasiveStatus) ? ' & DYSPLASIA' : '';
    return `ALL RESECTION MARGINS (${margins.join(', ')}) NEGATIVE FOR CARCINOMA${dysplasia}`;
  }
  if (/positive/i.test(m.invasiveStatus) || /present at margin/i.test(m.invasiveStatus)) {
    const inv = (m.involvedMargins || []).map(x => x.toUpperCase());
    return inv.length
      ? `${inv.join(', ')} MARGIN${inv.length > 1 ? 'S' : ''} POSITIVE FOR INVASIVE CARCINOMA`
      : 'RESECTION MARGIN(S) POSITIVE FOR INVASIVE CARCINOMA';
  }
  return null;
}

function buildNodeDxLine(n) {
  if (!n.status || /not applicable/i.test(n.status)) return null;
  const pos = Number(n.nodesPositive) || 0;
  const exam = Number(n.nodesExamined) || 0;
  if (/all.*negative/i.test(n.status) || (n.status && pos === 0 && !n.tumorDeposits)) {
    return `ALL ${exam > 0 ? numToWords(exam) + ' ' : ''}LYMPH NODES NEGATIVE FOR CARCINOMA (0/${exam || '?'})`;
  }
  if (pos > 0) {
    return `${numToWords(pos)} OUT OF ${numToWords(exam)} LYMPH NODES POSITIVE FOR CARCINOMA (${pos}/${exam})`;
  }
  if (n.tumorDeposits === 'Present') {
    const cnt = n.tumorDepositCount ? ` (${n.tumorDepositCount})` : '';
    return `TUMOR DEPOSIT(S) PRESENT${cnt}; ALL ${exam > 0 ? exam + ' ' : ''}LYMPH NODES NEGATIVE (0/${exam || '?'})`;
  }
  return null;
}

function buildFinalDiagnosis(caseData) {
  const specimens = (caseData.specimens || []).slice().sort((a, b) => a.letter.localeCompare(b.letter));
  const t = caseData.cap.tumor;
  const m = caseData.cap.margins;
  const n = caseData.cap.nodes;
  const ss = caseData.cap.specialStudies;
  const lines = [];

  for (const spec of specimens) {
    lines.push(`${spec.letter}. ${(spec.designation || '').toUpperCase()}`);

    if (spec.diagnosis) {
      // Secondary specimen — verbatim diagnosis
      lines.push(`      -     ${spec.diagnosis.toUpperCase()}`);
    } else {
      // Primary specimen — build from cap data
      const primaryLine = buildPrimaryDxLine(t);
      lines.push(`      -     ${primaryLine}`);

      const marginLine = buildMarginDxLine(m);
      if (marginLine) lines.push(`      -     ${marginLine}`);

      const nodeLine = buildNodeDxLine(n);
      if (nodeLine) lines.push(`      -     ${nodeLine}`);

      lines.push('      -     SEE CASE SUMMARY FOR TUMOR CHARACTERISTICS');
      if (ss.mmrPending) lines.push('      -     PENDING FOR MMR IMMUNOHISTOCHEMISTRY');
      if (ss.molecularPending) lines.push('      -     PENDING FOR MOLECULAR STUDIES');
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function pTExplanation(pt) {
  const map = {
    'pT0':  'No evidence of primary tumor',
    'pTis': 'Carcinoma in situ / intramucosal carcinoma (lamina propria, no extension through muscularis mucosae)',
    'pT1':  'Tumor invades the submucosa (through muscularis mucosae, not into muscularis propria)',
    'pT2':  'Tumor invades the muscularis propria',
    'pT3':  'Tumor invades through the muscularis propria into pericolorectal tissues',
    'pT4a': 'Tumor invades through the visceral peritoneum',
    'pT4b': 'Tumor directly invades or adheres to adjacent organs or structures',
  };
  return map[pt] || '';
}

function pNExplanation(pn, nodesPos, nodesExam, depositCount) {
  if (pn === 'pN0') return `No regional lymph node metastasis (0/${nodesExam || '?'})`;
  if (pn === 'pN1a') return `1 regional lymph node positive (${nodesPos}/${nodesExam || '?'})`;
  if (pn === 'pN1b') return `2-3 regional lymph nodes positive (${nodesPos}/${nodesExam || '?'})`;
  if (pn === 'pN1c') return `Tumor deposits${depositCount ? ` (${depositCount})` : ''}, no positive nodes`;
  if (pn === 'pN2a') return `4-6 regional lymph nodes positive (${nodesPos}/${nodesExam || '?'})`;
  if (pn === 'pN2b') return `7 or more regional lymph nodes positive (${nodesPos}/${nodesExam || '?'})`;
  return '';
}

function renderCapSynoptic(caseData) {
  const cap = caseData.cap;
  const sp = cap.specimen;
  const t = cap.tumor;
  const m = cap.margins;
  const n = cap.nodes;
  const stg = cap.stage;
  const ss = cap.specialStudies;
  const add = [];

  function line(label, value) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
    add.push(`${label}: ${value}`);
  }

  add.push('COLON AND RECTUM: RESECTION');
  add.push('(CAP Protocol v4.4.0.1 — AJCC 8th Edition)');
  add.push('');

  add.push('SPECIMEN');
  line('Procedure', sp.procedure);
  if (sp.mesorectumEval && !/not applicable/i.test(sp.mesorectumEval)) {
    line('Macroscopic Evaluation of Mesorectum', sp.mesorectumEval);
  }
  add.push('');

  add.push('TUMOR');
  line('Tumor Site', (t.site || []).join('; '));
  if (t.rectalLocation && !/not applicable/i.test(t.rectalLocation)) {
    line('Rectal Tumor Location', t.rectalLocation);
  }
  line('Histologic Type', t.histologicType);
  line('Histologic Grade', t.histologicGrade);
  if (t.sizeCm != null) line('Tumor Size', `${t.sizeCm} cm`);
  line('Tumor Extent', t.tumorExtent);
  if (t.perforation && !/not identified/i.test(t.perforation)) {
    line('Macroscopic Tumor Perforation', t.perforation);
  }
  const lviStr = (t.lvi || []).join('; ');
  if (lviStr) line('Lymphovascular Invasion', lviStr || 'Not identified');
  if (t.pni) line('Perineural Invasion', t.pni);
  if (t.tumorBudding && !/not applicable/i.test(t.tumorBudding)) line('Tumor Budding', t.tumorBudding);
  if (t.polyp && !/none/i.test(t.polyp)) line('Type of Polyp', t.polyp);
  if (t.treatmentEffect && !/no known/i.test(t.treatmentEffect)) line('Treatment Effect', t.treatmentEffect);
  if (t.tumorComment?.trim()) line('Tumor Comment', t.tumorComment.trim());

  if (n.tumorDeposits === 'Present') {
    const cnt = n.tumorDepositCount != null ? ` (${n.tumorDepositCount})` : '';
    line('Tumor Deposits', `Present${cnt}`);
  } else if (n.tumorDeposits) {
    line('Tumor Deposits', n.tumorDeposits);
  }
  add.push('');

  add.push('MARGINS');
  if (m.invasiveStatus) {
    add.push(`Margin Status for Invasive Carcinoma: ${m.invasiveStatus}`);
    if (/negative/i.test(m.invasiveStatus)) {
      if (m.closestMargins?.length) line('Closest Margin(s)', m.closestMargins.join(', '));
      if (m.closestDistanceCm != null) line('Distance to Closest Margin', `${m.closestDistanceCm} cm`);
      if (m.radialMarginCm != null) line('Radial (Circumferential) Margin', `${m.radialMarginCm} cm`);
      if (m.distalMarginCm != null) line('Distal Margin', `${m.distalMarginCm} cm`);
    } else if (/positive/i.test(m.invasiveStatus)) {
      if (m.involvedMargins?.length) line('Margin(s) Involved', m.involvedMargins.join(', '));
    }
  }
  if (m.nonInvasiveStatus) {
    add.push(`Margin Status for Non-Invasive Tumor: ${m.nonInvasiveStatus}`);
    if (m.nonInvasiveInvolvedMargins?.length) {
      line('Non-Invasive Margin(s) Involved', m.nonInvasiveInvolvedMargins.join(', '));
    }
  }
  if (m.marginComment?.trim()) line('Margin Comment', m.marginComment.trim());
  add.push('');

  add.push('REGIONAL LYMPH NODES');
  if (n.status) {
    add.push(`Regional Lymph Node Status: ${n.status}`);
    if (n.nodesPositive != null) line('Number of Lymph Nodes with Tumor', n.nodesPositive);
    if (n.nodesExamined != null) line('Number of Lymph Nodes Examined', n.nodesExamined);
    if (n.nodeComment?.trim()) line('Lymph Node Comment', n.nodeComment.trim());
  } else {
    add.push('Regional Lymph Node Status: Not specified');
  }
  add.push('');

  add.push('DISTANT METASTASIS');
  const pm = stg.pmCategory;
  if (!pm || /not applicable/i.test(pm)) {
    add.push('Distant Metastasis: Not applicable — pM cannot be determined from specimen(s)');
  } else {
    add.push(`Distant Metastasis: ${pm}`);
    if (cap.metastasis?.sites?.length) {
      add.push(`Distant Site(s): ${cap.metastasis.sites.join('; ')}`);
    }
  }
  add.push('');

  add.push('PATHOLOGIC STAGE CLASSIFICATION (AJCC 8th Edition)');
  const pfx = [stg.yPrefix && 'y', stg.rPrefix && 'r'].filter(Boolean).join('');
  const pt = stg.ptCategory;
  const pn = stg.pnCategory;
  if (pt) {
    const exp = pTExplanation(pt);
    add.push(`pT Category: ${pfx}${pt}${exp ? ' — ' + exp : ''}`);
  } else {
    add.push('pT Category: pT not assigned');
  }
  if (pn) {
    const exp = pNExplanation(pn, n.nodesPositive, n.nodesExamined, n.tumorDepositCount);
    add.push(`pN Category: ${pfx}${pn}${exp ? ' — ' + exp : ''}`);
  } else {
    add.push('pN Category: pN not assigned');
  }
  if (pm && !/not applicable/i.test(pm)) {
    add.push(`pM Category: ${pm}`);
  }
  if (stg.mModifier) add.push('T Suffix: (m) — multiple synchronous primary tumors');
  add.push('');

  if (cap.additionalFindings?.length && !cap.additionalFindings.every(f => /none/i.test(f))) {
    add.push('ADDITIONAL FINDINGS');
    for (const f of cap.additionalFindings) {
      if (!/none/i.test(f)) add.push(f);
    }
    add.push('');
  }

  add.push('SPECIAL STUDIES');
  if (ss.mmrPerformed && ss.mmrResult) {
    add.push(`MMR immunohistochemistry: ${ss.mmrResult}`);
  } else if (ss.mmrPending) {
    add.push('MMR immunohistochemistry pending');
  } else {
    add.push('MMR immunohistochemistry: Not performed');
  }
  if (ss.molecularPending) {
    add.push('Molecular Studies: Pending');
  } else if (ss.molecularMarkers?.length) {
    for (const mk of ss.molecularMarkers) {
      add.push(`Molecular: ${mk}`);
    }
  }

  return add.join('\n');
}

function renderCptSummary(caseData) {
  const specimens = (caseData.specimens || []).slice().sort((a, b) => a.letter.localeCompare(b.letter));
  const lines = ['CPT BILLING SUMMARY'];
  const totals = {};
  const addCode = (cpt) => { if (cpt) totals[cpt] = (totals[cpt] || 0) + 1; };

  for (const s of specimens) {
    lines.push(`${s.letter}. ${s.designation || ''}${s.cpt ? ` — ${s.cpt}` : ''}`);
    addCode(s.cpt);
    for (const addon of (s.cptAddons || [])) {
      addCode(addon);
      lines.push(`   Add-on: ${addon}`);
    }
  }

  const totalParts = Object.keys(totals).sort().map(cpt => `${cpt} × ${totals[cpt]}`);
  if (totalParts.length) {
    lines.push('');
    lines.push(`TOTALS: ${totalParts.join(', ')}`);
  }

  return lines.join('\n');
}

export function assembleColonReport(caseData) {
  const parts = [];

  if (caseData.receivedDate) parts.push(`Specimen received: ${caseData.receivedDate}`);

  parts.push('FINAL DIAGNOSIS:');
  parts.push(buildFinalDiagnosis(caseData));

  if (caseData.caseComment?.trim()) {
    parts.push('COMMENT:');
    parts.push(caseData.caseComment.trim());
  }

  parts.push('---');
  parts.push(renderCapSynoptic(caseData));

  const cpt = renderCptSummary(caseData);
  if (cpt) {
    parts.push('---');
    parts.push(cpt);
  }

  return parts.join('\n\n');
}
