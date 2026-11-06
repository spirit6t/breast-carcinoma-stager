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

function up(s) {
  return s ? String(s).toUpperCase() : '';
}

function buildPrimaryDxLine(t) {
  const typeStr = up(t.histologicType || 'Carcinoma');
  const gradeStr = t.histologicGrade ? `, ${up(t.histologicGrade)}` : '';
  const siteStr = t.site ? `, ${up(t.site)}` : '';
  const sizeStr = t.sizeCm != null ? `, ${t.sizeCm} CM` : '';
  return `${typeStr}${gradeStr}${siteStr}${sizeStr}`;
}

function buildExtentLine(t) {
  const parts = [];
  if (t.ovarianSurfaceInvolvement && !/not identified/i.test(t.ovarianSurfaceInvolvement)) {
    parts.push(`OVARIAN SURFACE INVOLVEMENT: ${up(t.ovarianSurfaceInvolvement)}`);
  }
  if (t.ftSurfaceInvolvement && !/not identified/i.test(t.ftSurfaceInvolvement)) {
    parts.push(`FALLOPIAN TUBE SURFACE INVOLVEMENT: ${up(t.ftSurfaceInvolvement)}`);
  }
  if (t.otherOrganInvolvement?.length) {
    parts.push(`INVOLVEMENT OF ${t.otherOrganInvolvement.map(up).join(', ')}`);
  }
  if (t.largestExtrapelvicFocus && !/not applicable/i.test(t.largestExtrapelvicFocus)) {
    parts.push(`EXTRAPELVIC PERITONEAL DISEASE: ${up(t.largestExtrapelvicFocus)}`);
  }
  return parts.length ? parts.join('; ') : null;
}

function buildNodeDxLine(n) {
  if (!n.status || /not applicable/i.test(n.status)) return null;
  const pos = Number(n.nodesPositive) || 0;
  const exam = Number(n.nodesExamined) || 0;
  if (/all.*negative/i.test(n.status) || pos === 0) {
    return `ALL ${exam > 0 ? numToWords(exam) + ' ' : ''}LYMPH NODES NEGATIVE FOR TUMOR (0/${exam || '?'})`;
  }
  if (pos > 0) {
    return `${numToWords(pos)} OUT OF ${numToWords(exam)} LYMPH NODES POSITIVE FOR CARCINOMA (${pos}/${exam})`;
  }
  return null;
}

function buildFinalDiagnosis(caseData) {
  const specimens = (caseData.specimens || []).slice().sort((a, b) => a.letter.localeCompare(b.letter));
  const t = caseData.cap.tumor;
  const n = caseData.cap.nodes;
  const stg = caseData.cap.stage;
  const ss = caseData.cap.specialStudies;
  const lines = [];

  const uf = caseData.cap.uterineFindings;
  // Uterine findings belong under whichever specimen names the uterus/hysterectomy.
  // Fall back to the primary specimen only if no specimen mentions the uterus.
  const hasUterusSpec = specimens.some(s => /uterus|hysterectomy/i.test(s.designation));

  function renderUterineFindings() {
    if (!uf) return;
    lines.push(`      -     CERVIX: ${up(uf.cervix)}`);
    lines.push(`      -     ENDOMETRIUM: ${up(uf.endometrium)}`);
    lines.push(`      -     MYOMETRIUM: ${up(uf.myometrium)}`);
    if (uf.fallopianTube) lines.push(`      -     FALLOPIAN TUBE: ${up(uf.fallopianTube)}`);
    lines.push(`      -     SEROSA: ${up(uf.serosa)}`);
  }

  let primaryRendered = false;

  for (const spec of specimens) {
    lines.push(`${spec.letter}. ${up(spec.designation)}`);
    const isUterusSpec = /uterus|hysterectomy/i.test(spec.designation);

    if (spec.diagnosis) {
      // Agent supplied a brief dx for this specimen — render it as-is
      lines.push(`      -     ${up(spec.diagnosis)}`);
      // If this is the uterus specimen, append uterine findings here
      if (isUterusSpec) renderUterineFindings();
    } else if (!primaryRendered) {
      // First specimen without an explicit diagnosis = primary — full workup
      primaryRendered = true;

      lines.push(`      -     ${buildPrimaryDxLine(t)}`);

      const extentLine = buildExtentLine(t);
      if (extentLine) lines.push(`      -     ${extentLine}`);

      const nodeLine = buildNodeDxLine(n);
      if (nodeLine) lines.push(`      -     ${nodeLine}`);

      const stageParts = [stg.ptCategory, stg.pnCategory, stg.pmCategory].filter(Boolean);
      if (stageParts.length) {
        const pfx = [stg.yPrefix && 'y', stg.rPrefix && 'r'].filter(Boolean).join('');
        lines.push(`      -     PATHOLOGIC STAGE ${pfx}${stageParts.join(' ')}`);
      }
      if (stg.figoStage) {
        lines.push(`      -     FIGO STAGE ${up(stg.figoStage)}`);
      }

      // Uterine findings: render here only if this specimen names the uterus,
      // or if no specimen in the list names the uterus (fallback)
      if (isUterusSpec || !hasUterusSpec) renderUterineFindings();

      lines.push('      -     SEE CASE SUMMARY FOR TUMOR CHARACTERISTICS');

      if (ss.p53Pending) lines.push('      -     PENDING FOR p53 IMMUNOHISTOCHEMISTRY');
      if (ss.additionalPending?.length) {
        for (const p of ss.additionalPending) {
          lines.push(`      -     PENDING FOR ${up(p)}`);
        }
      }
    } else {
      // Additional specimen without explicit diagnosis — auto-generate brief involvement line
      const typeStr = up(t.histologicType || 'CARCINOMA');
      lines.push(`      -     INVOLVED BY ${typeStr}`);
      if (isUterusSpec) renderUterineFindings();
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function pTExplanation(pt) {
  const map = {
    'pT1a':  'tumor limited to one ovary, capsule intact, no surface tumor, no malignant cells in fluids',
    'pT1b':  'tumor limited to both ovaries, capsules intact',
    'pT1c1': 'surgical spill',
    'pT1c2': 'capsule ruptured before surgery or tumor on surface',
    'pT1c3': 'malignant cells in ascites or peritoneal washings',
    'pT2a':  'extension/implants on uterus and/or fallopian tubes and/or ovaries',
    'pT2b':  'extension to other pelvic tissues',
    'pT3a':  'microscopic extrapelvic peritoneal involvement ± retroperitoneal nodes',
    'pT3b':  'macroscopic peritoneal metastasis beyond pelvis ≤2 cm',
    'pT3c':  'macroscopic peritoneal metastasis beyond pelvis >2 cm (includes liver/splenic capsule)',
  };
  return map[pt] || '';
}

function figoExplanation(stage) {
  const map = {
    'IA':        'tumor limited to one ovary, capsule intact, no surface tumor, no malignant cells in fluids',
    'IB':        'tumor limited to both ovaries, capsules intact, no surface tumor, no malignant cells in fluids',
    'IC1':       'surgical spill',
    'IC2':       'capsule ruptured before surgery or tumor on ovarian/fallopian tube surface',
    'IC3':       'malignant cells in ascites or peritoneal washings',
    'IIA':       'extension and/or implants on uterus and/or fallopian tubes and/or ovaries',
    'IIB':       'extension to other pelvic intraperitoneal tissues',
    'IIIA1(i)':  'positive retroperitoneal lymph nodes only — metastasis ≤10 mm',
    'IIIA1(ii)': 'positive retroperitoneal lymph nodes only — metastasis >10 mm',
    'IIIA2':     'microscopic extrapelvic peritoneal involvement ± positive retroperitoneal lymph nodes',
    'IIIB':      'macroscopic peritoneal metastasis beyond pelvis ≤2 cm ± retroperitoneal lymph nodes',
    'IIIC':      'macroscopic peritoneal metastasis beyond pelvis >2 cm ± retroperitoneal lymph nodes (includes liver/splenic capsule)',
    'IVA':       'pleural effusion with positive cytology',
    'IVB':       'parenchymal liver or splenic metastasis; extra-abdominal metastasis (including inguinal lymph nodes outside the abdominal cavity)',
  };
  return map[stage?.toUpperCase()] || map[stage] || '';
}

function pNExplanation(pn) {
  const map = {
    'pN0':     'no regional lymph node metastasis',
    'pN0(i+)': 'isolated tumor cells in regional lymph node(s) ≤0.2 mm',
    'pN1a':    'metastasis ≤10 mm in greatest dimension',
    'pN1b':    'metastasis >10 mm in greatest dimension',
  };
  return map[pn] || '';
}

function renderCapSynoptic(caseData) {
  const cap = caseData.cap;
  const sp = cap.specimen;
  const t = cap.tumor;
  const n = cap.nodes;
  const stg = cap.stage;
  const ss = cap.specialStudies;
  const add = [];

  function line(label, value) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
    add.push(`${label}: ${value}`);
  }

  add.push('OVARY, FALLOPIAN TUBE, AND PRIMARY PERITONEAL TUMORS: RESECTION');
  add.push('(CAP Protocol v1.5.0.0 — AJCC 8th Edition / FIGO 2021)');
  add.push('');

  add.push('SPECIMEN');
  line('Procedure', sp.procedure);
  if (sp.hysterectomyType) line('Hysterectomy Type', sp.hysterectomyType);

  const hasIntegrity = sp.rightOvaryIntegrity || sp.leftOvaryIntegrity ||
                       sp.rightFTIntegrity || sp.leftFTIntegrity || sp.uterusIntegrity;
  if (hasIntegrity) {
    add.push('Specimen Integrity');
    if (sp.rightOvaryIntegrity) {
      let ri = `Right Ovary: ${sp.rightOvaryIntegrity}`;
      if (/ruptured/i.test(sp.rightOvaryIntegrity) && sp.rightOvaryRuptureTime)
        ri += ` (${sp.rightOvaryRuptureTime})`;
      add.push(ri);
    }
    if (sp.leftOvaryIntegrity) {
      let li = `Left Ovary: ${sp.leftOvaryIntegrity}`;
      if (/ruptured/i.test(sp.leftOvaryIntegrity) && sp.leftOvaryRuptureTime)
        li += ` (${sp.leftOvaryRuptureTime})`;
      add.push(li);
    }
    if (sp.rightFTIntegrity) add.push(`Right Fallopian Tube: ${sp.rightFTIntegrity}`);
    if (sp.leftFTIntegrity) add.push(`Left Fallopian Tube: ${sp.leftFTIntegrity}`);
    if (sp.uterusIntegrity) add.push(`Uterus: ${sp.uterusIntegrity}`);
  }
  add.push('');

  add.push('TUMOR');
  line('Tumor Site', t.site);
  line('Histologic Type', t.histologicType);
  if (t.histologicGrade) line('Histologic Grade', t.histologicGrade);
  if (t.sizeCm != null) line('Tumor Size', `${t.sizeCm} cm`);
  if (t.ovarianSurfaceInvolvement) line('Ovarian Surface Involvement', t.ovarianSurfaceInvolvement);
  if (t.ftSurfaceInvolvement) line('Fallopian Tube Surface Involvement', t.ftSurfaceInvolvement);
  if (t.implants) line('Implants', t.implants);
  if (t.otherOrganInvolvement?.length) line('Other Tissue / Organ Involvement', t.otherOrganInvolvement.join('; '));
  if (t.largestExtrapelvicFocus) line('Largest Extrapelvic Peritoneal Focus', t.largestExtrapelvicFocus);
  if (t.peritonealCytology) line('Peritoneal / Ascitic Fluid', t.peritonealCytology);
  if (t.crs && !/not applicable/i.test(t.crs)) line('Chemotherapy Response Score (CRS)', t.crs);
  if (t.tumorComment?.trim()) line('Tumor Comment', t.tumorComment.trim());
  add.push('');

  add.push('REGIONAL LYMPH NODES');
  add.push(`Regional Lymph Node Status: ${n.status || 'Not applicable (no regional lymph nodes submitted or found)'}`);
  if (n.status && /tumor present/i.test(n.status)) {
    if (n.nodesGt10mm != null) line('Number of Nodes with Metastasis Greater than 10 mm', n.nodesGt10mm);
    if (n.nodesLe10mm != null) line('Number of Nodes with Metastasis 10 mm or Less (excluding ITCs)', n.nodesLe10mm);
    if (n.nodesItc != null) line('Number of Nodes with Isolated Tumor Cells (ITCs) (0.2 mm or less)', n.nodesItc);
    if (n.nodalSitesWithTumor?.length) line('Nodal Site(s) with Tumor', n.nodalSitesWithTumor.join('; '));
    if (n.largestDepositMm) line('Size of Largest Nodal Metastatic Deposit', `${n.largestDepositMm} mm`);
    if (n.largestDepositLocation) line('Location of Largest Nodal Metastatic Deposit', n.largestDepositLocation);
  }
  if (n.nodesExamined != null) line('Number of Lymph Nodes Examined', n.nodesExamined);
  if (n.nodalSitesExamined?.length) line('Nodal Site(s) Examined', n.nodalSitesExamined.join('; '));
  if (n.nodeComment?.trim()) line('Regional Lymph Node Comment', n.nodeComment.trim());
  add.push('');

  add.push('pM CATEGORY');
  const pm = stg.pmCategory;
  const pmLabel = {
    'pM1a': 'pM1a: Pleural effusion with positive cytology',
    'pM1b': 'pM1b: Liver or splenic parenchymal metastases; metastases to extra-abdominal organs (including inguinal lymph nodes and lymph nodes outside the abdominal cavity); transmural involvement of intestine',
    'pM1':  'pM1 (subcategory cannot be determined)',
  };
  if (!pm || /not applicable/i.test(pm)) {
    add.push('pM Category: Not applicable — pM cannot be determined from the submitted specimen(s)');
  } else {
    add.push(`pM Category: ${pmLabel[pm] || pm}`);
  }
  add.push('');

  add.push('pTNM CLASSIFICATION (AJCC 8th Edition)');
  const modifiers = [stg.yPrefix && 'y (post-neoadjuvant therapy)', stg.rPrefix && 'r (recurrence)'].filter(Boolean);
  add.push(`Modified Classification: ${modifiers.length ? modifiers.join('; ') : 'Not applicable'}`);
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
    const exp = pNExplanation(pn);
    add.push(`pN Category: ${pfx}${pn}${exp ? ' — ' + exp : ''}`);
  } else {
    add.push('pN Category: pN not assigned');
  }
  if (pm && !/not applicable/i.test(pm)) {
    add.push(`pM Category: ${pmLabel[pm] || pm}`);
  }
  if (stg.figoStage) {
    const fexp = figoExplanation(stg.figoStage);
    add.push(`FIGO Stage (2021): ${stg.figoStage}${fexp ? ' — ' + fexp : ''}`);
  }
  add.push('');

  if (cap.additionalFindings?.length && !cap.additionalFindings.every(f => /none/i.test(f))) {
    add.push('ADDITIONAL FINDINGS');
    for (const f of cap.additionalFindings) {
      if (!/none/i.test(f)) add.push(f);
    }
    add.push('');
  }

  add.push('SPECIAL STUDIES (Note N)');
  if (ss.p53Pending) {
    add.push('p53 Immunohistochemistry: Pending');
  } else if (ss.p53Status) {
    add.push(`p53 Immunohistochemistry: ${ss.p53Status}`);
  } else {
    add.push('p53 Immunohistochemistry: Not performed');
  }
  if (ss.additionalPending?.length) {
    for (const p of ss.additionalPending) {
      add.push(`${p}: Pending`);
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

export function assembleOvaryReport(caseData) {
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
