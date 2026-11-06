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

  for (const spec of specimens) {
    lines.push(`${spec.letter}. ${up(spec.designation)}`);

    if (spec.diagnosis) {
      lines.push(`      -     ${up(spec.diagnosis)}`);
    } else {
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

      const uf = caseData.cap.uterineFindings;
      if (uf) {
        lines.push(`      -     CERVIX: ${up(uf.cervix)}`);
        lines.push(`      -     ENDOMETRIUM: ${up(uf.endometrium)}`);
        lines.push(`      -     MYOMETRIUM: ${up(uf.myometrium)}`);
        if (uf.fallopianTube) lines.push(`      -     FALLOPIAN TUBE: ${up(uf.fallopianTube)}`);
        lines.push(`      -     SEROSA: ${up(uf.serosa)}`);
      }

      lines.push('      -     SEE CASE SUMMARY FOR TUMOR CHARACTERISTICS');

      if (ss.p53Pending) lines.push('      -     PENDING FOR p53 IMMUNOHISTOCHEMISTRY');
      if (ss.additionalPending?.length) {
        for (const p of ss.additionalPending) {
          lines.push(`      -     PENDING FOR ${up(p)}`);
        }
      }
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
  if (t.otherOrganInvolvement?.length) line('Other Tissue / Organ Involvement', t.otherOrganInvolvement.join('; '));
  if (t.largestExtrapelvicFocus) line('Largest Extrapelvic Peritoneal Focus', t.largestExtrapelvicFocus);
  if (t.peritonealCytology) line('Peritoneal / Ascitic Fluid', t.peritonealCytology);
  if (t.implants && !/not applicable/i.test(t.implants)) line('Implants', t.implants);
  if (t.crs && !/not applicable/i.test(t.crs)) line('Chemotherapy Response Score (CRS)', t.crs);
  if (t.tumorComment?.trim()) line('Tumor Comment', t.tumorComment.trim());
  add.push('');

  add.push('REGIONAL LYMPH NODES');
  if (n.status && !/not applicable/i.test(n.status)) {
    add.push(`Regional Lymph Node Status: ${n.status}`);
    if (n.nodesPositive != null) line('Number of Nodes with Metastasis', n.nodesPositive);
    if (n.nodesExamined != null) line('Number of Lymph Nodes Examined', n.nodesExamined);
    if (n.nodesGt10mm != null) line('Nodes with Metastasis >10 mm', n.nodesGt10mm);
    if (n.nodesLe10mm != null) line('Nodes with Metastasis ≤10 mm', n.nodesLe10mm);
    if (n.nodesItc != null) line('Nodes with Isolated Tumor Cells (≤0.2 mm)', n.nodesItc);
    if (n.nodeComment?.trim()) line('Lymph Node Comment', n.nodeComment.trim());
  } else {
    add.push('Regional Lymph Node Status: Not applicable (no regional lymph nodes submitted or found)');
  }
  add.push('');

  add.push('DISTANT METASTASIS');
  const pm = stg.pmCategory;
  if (!pm || /not applicable/i.test(pm)) {
    add.push('Distant Metastasis: Not applicable — pM cannot be determined from specimen(s)');
  } else {
    add.push(`Distant Metastasis: ${pm}`);
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
    const exp = pNExplanation(pn);
    add.push(`pN Category: ${pfx}${pn}${exp ? ' — ' + exp : ''}`);
  } else {
    add.push('pN Category: pN not assigned');
  }
  if (pm && !/not applicable/i.test(pm)) {
    add.push(`pM Category: ${pm}`);
  }
  if (stg.figoStage) {
    add.push(`FIGO Stage (2021): ${stg.figoStage}`);
  }
  add.push('');

  if (cap.additionalFindings?.length && !cap.additionalFindings.every(f => /none/i.test(f))) {
    add.push('ADDITIONAL FINDINGS');
    for (const f of cap.additionalFindings) {
      if (!/none/i.test(f)) add.push(f);
    }
    add.push('');
  }

  add.push('SPECIAL STUDIES');
  if (ss.p53Pending) {
    add.push('p53 immunohistochemistry pending');
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
