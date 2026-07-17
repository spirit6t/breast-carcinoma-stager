/**
 * CAP synoptic renderer for Breast Excision with Invasive Carcinoma.
 * Standard: AJCC-UICC 8 — exact CAP protocol output format.
 */

const NUCLEAR_PLEOMORPHISM_DESC = {
  1: 'Small nuclei with little increase in size in comparison with normal breast epithelial cells, regular outlines, uniform nuclear chromatin, little variation in size',
  2: 'Cells larger than normal with open vesicular nuclei, visible nucleoli, moderate variability in size and shape',
  3: 'Vesicular nuclei, often with prominent nucleoli, exhibiting marked variation in size and shape, occasionally with very large and bizarre forms',
};

const PT_DESC = {
  'pTis (DCIS)': 'Ductal carcinoma in situ',
  'pTis (Paget)': "Paget disease of the nipple not associated with invasive carcinoma and/or carcinoma in situ in the underlying breast parenchyma",
  'pT1mi': 'Tumor measuring ≤1 mm in greatest dimension (microinvasion)',
  'pT1a': 'Tumor measuring >1 mm but ≤5 mm in greatest dimension',
  'pT1b': 'Tumor measuring >5 mm but ≤10 mm in greatest dimension',
  'pT1c': 'Tumor measuring >10 mm but ≤20 mm in greatest dimension',
  'pT2':  'Tumor measuring >20 mm but ≤50 mm in greatest dimension',
  'pT3':  'Tumor measuring >50 mm in greatest dimension',
  'pT4a': 'Extension to chest wall, not including only pectoralis muscle adherence/invasion',
  'pT4b': "Ulceration and/or ipsilateral satellite nodule(s) and/or edema (including peau d'orange) of the skin, which does not meet the criteria for inflammatory carcinoma",
  'pT4c': 'Both T4a and T4b criteria are present',
  'pT4d': 'Inflammatory carcinoma',
};

const PN_DESC = {
  'pN0':       'No regional lymph node metastasis identified or ITCs only',
  'pN0(i+)':  'Malignant cells in regional lymph node(s) ≤0.2 mm (detected by H&E or IHC including isolated tumor cell clusters)',
  'pN0(mol+)':'Positive molecular findings; no ITCs detected by H&E or IHC',
  'pN1mi':    'Micrometastases (>0.2 mm and/or >200 cells, but none >2.0 mm)',
  'pN1a':     'Metastases in 1–3 axillary lymph nodes, at least one metastasis >2.0 mm',
  'pN1b':     'Metastases in ipsilateral internal mammary sentinel nodes, excluding ITCs',
  'pN1c':     'pN1a and pN1b combined',
  'pN2a':     'Metastases in 4–9 axillary lymph nodes (at least one tumor deposit >2.0 mm)',
  'pN2b':     'Metastases in clinically detected ipsilateral internal mammary lymph nodes in the absence of axillary lymph node metastases',
  'pN3a':     'Metastases in ≥10 axillary lymph nodes (at least one tumor deposit >2.0 mm); or metastases to the infraclavicular (level III axillary) lymph nodes',
  'pN3b':     'Metastases in clinically detected ipsilateral internal mammary lymph nodes in the presence of ≥1 positive axillary lymph node(s); or in >3 axillary lymph nodes and in internal mammary lymph nodes with micrometastases or macrometastases detected by sentinel lymph node biopsy but not clinically detected',
  'pN3c':     'Metastases in ipsilateral supraclavicular lymph nodes',
};

const N_SUFFIX_DESC = {
  sn: 'Sentinel node(s) evaluated. If 6 or more nodes (sentinel or nonsentinel) are removed, this modifier should not be used',
  f:  'Based on fine-needle aspiration or core biopsy',
};

function normalizePt(raw) {
  if (!raw) return null;
  return raw.startsWith('p') ? raw : `p${raw}`;
}

function normalizePn(raw) {
  if (!raw) return null;
  return raw.startsWith('p') ? raw : `p${raw}`;
}

function computeTumorExtent(t) {
  const skinItems = (t.skinInvolvement || []).filter((s) => s && !/not applicable/i.test(s));
  const nipple = t.nippleInvolvement && !/not\s+identified|cannot/i.test(t.nippleInvolvement)
    ? t.nippleInvolvement : null;
  const chest = t.chestWallInvolvement && !/not\s+identified|cannot/i.test(t.chestWallInvolvement)
    ? t.chestWallInvolvement : null;

  if (!skinItems.length && !nipple && !chest) {
    return 'Not applicable (skin, nipple, and skeletal muscle are absent OR are uninvolved)';
  }
  const parts = [];
  if (skinItems.length) parts.push(`Skin involvement: ${skinItems.join(', ')}`);
  if (nipple) parts.push(`Nipple: ${nipple}`);
  if (chest) parts.push(`Chest wall: ${chest}`);
  return parts.join('; ');
}

function fmtDist(mm) {
  if (mm == null || mm === '') return null;
  const n = Number(mm);
  return n >= 10 ? `${(n / 10).toFixed(1)} cm` : `${n} mm`;
}

export function renderCapSynopticInvasive(caseData) {
  const cap = caseData.cap || {};
  const spec = cap.specimen || {};
  const t    = cap.tumor || {};
  const m    = cap.margins || {};
  const n    = cap.nodes || {};
  const met  = cap.metastasis || {};
  const stg  = cap.stage || {};
  const ss   = cap.specialStudies || {};

  const L = [];
  const add = (s) => { if (s != null && s !== '') L.push(s); };

  add('CASE SUMMARY: (INVASIVE CARCINOMA OF THE BREAST: Resection)');
  add('Standard(s): AJCC-UICC 8');
  add('');

  // ── SPECIMEN ────────────────────────────────────────────────────────────────
  add('SPECIMEN');
  if (spec.procedure)  add(`Procedure: ${spec.procedure}`);
  if (spec.laterality) add(`Specimen Laterality: ${spec.laterality}`);
  if (spec.integrity)  add(`Specimen Integrity: ${spec.integrity}`);
  add('');

  // ── TUMOR ───────────────────────────────────────────────────────────────────
  add('TUMOR');

  if ((t.site || []).length) add(`+Tumor Site: ${t.site.join(', ')}`);

  // Focality — required before Histologic Type per CAP protocol
  if (t.focality) {
    add(`Tumor Focality: ${t.focality}`);
    if (/multiple/i.test(t.focality) && t.numberOfFoci) {
      add(`+Number of Foci: ${t.numberOfFoci}`);
    }
  }

  // Histologic Type — normalize ductal/NST variants
  if (t.histologicType) {
    add('Histologic Type');
    let ht = (t.histologicType === 'Other (specify)' && t.histologicTypeOther)
      ? t.histologicTypeOther : t.histologicType;
    if (/invasive\s+(ductal|carcinoma\s*(of\s*)?no\s+special\s+type)/i.test(ht) ||
        /no\s+special\s+type/i.test(ht)) {
      ht = 'Invasive carcinoma of no special type (ductal)';
    }
    add(` - ${ht}`);
  }

  // Nottingham
  const nott = t.nottingham || {};
  if (nott.tubuleFormation != null || nott.nuclearPleomorphism != null || nott.mitoticCount != null) {
    add('Histologic Grade (Nottingham Histologic Score):');
    if (nott.tubuleFormation != null) {
      add(`- Glandular (Acinar) / Tubular Differentiation: ${nott.tubuleFormation}`);
    }
    if (nott.nuclearPleomorphism != null) {
      const desc = NUCLEAR_PLEOMORPHISM_DESC[nott.nuclearPleomorphism] || '';
      add(`- Nuclear Pleomorphism: Score ${nott.nuclearPleomorphism}${desc ? ` (${desc})` : ''}`);
    }
    if (nott.mitoticCount != null) {
      const mStr = nott.mitosesPer10HPF != null ? ` (${nott.mitosesPer10HPF} mitoses/10 HPF)` : '';
      add(`Mitotic Rate: Score ${nott.mitoticCount}${mStr}`);
    }
    if (nott.totalScore != null && nott.overallGrade) {
      const g = String(nott.overallGrade).match(/Grade\s*(\d+)/i)?.[1] || nott.totalScore;
      add(`Overall Grade: Grade ${g} (scores of ${nott.totalScore})`);
    }
  }

  // Tumor Size
  if (t.invasiveSizeMm != null && t.invasiveSizeMm !== '') {
    const addDim = t.invasiveAdditionalDimMm ? ` (additional dimensions: ${t.invasiveAdditionalDimMm} mm)` : '';
    add(`Tumor Size: ${t.invasiveSizeMm} mm in largest dimension${addDim}`);
  } else if (t.invasiveSizeCannotBeDetermined) {
    add(`Tumor Size: Cannot be determined (${t.invasiveSizeCannotBeDetermined})`);
  }

  // DCIS (Note G) — full CAP extent-of-DCIS section
  add(`Ductal Carcinoma In Situ (DCIS) (Note G): ${t.dcisAssociated || 'Not identified'}`);
  if (t.dcisAssociated === 'Present') {
    // Extent of DCIS
    const extCats = t.dcisExtentCategories || [];
    if (extCats.length || t.dcisExtentOther || t.dcisExtentCannotDetermine) {
      add('+Extent of DCIS:');
      if (extCats.includes('Admixed with invasive carcinoma')) {
        const pct = t.dcisAdmixedPercent ? `: ${t.dcisAdmixedPercent}%` : '';
        add(`   Admixed with invasive carcinoma${pct ? ` (+Specify DCIS as a Percentage of Entire Tumor${pct})` : ''}`);
      }
      if (extCats.includes('Extends beyond the invasive carcinoma')) {
        add('   Extends beyond the invasive carcinoma');
      }
      if (extCats.includes('Separate from the invasive carcinoma')) {
        add('   Separate from the invasive carcinoma');
      }
      if (t.dcisExtentOther) {
        add(`   Other: ${t.dcisExtentOther}`);
      }
      if (t.dcisExtentCannotDetermine) {
        add(`   Cannot be determined: ${t.dcisExtentCannotDetermine}`);
      }
    }
    // Estimated Size of DCIS
    if (t.dcisExtentMm != null && t.dcisExtentMm !== '') {
      add(`+Estimated Size of DCIS: ${t.dcisExtentMm} mm`);
    }
    // Patterns
    if ((t.dcisArchitecturalPatterns || []).length) {
      add(`+Architectural Pattern(s): ${t.dcisArchitecturalPatterns.join(', ')}`);
      if (t.dcisPatternOther) add(`   Other (specify): ${t.dcisPatternOther}`);
    }
    // Nuclear grade, necrosis, EIC
    if (t.dcisGrade) add(`+Nuclear Grade (DCIS): ${t.dcisGrade}`);
    if (t.dcisNecrosis) {
      add(`+Necrosis: ${t.dcisNecrosis}`);
      if (/cannot be excluded/i.test(t.dcisNecrosis) && t.dcisNecrosisCannotExclude) {
        add(`   Explain: ${t.dcisNecrosisCannotExclude}`);
      }
    }
    if (t.extensiveIntraductalComponent != null) {
      add(`+Extensive Intraductal Component (EIC): ${t.extensiveIntraductalComponent ? 'Positive for EIC' : 'Negative for EIC'}`);
    }
    if (t.dcisComment?.trim()) add(`+DCIS Comment: ${t.dcisComment.trim()}`);
  }

  // Tumor Extent (skin / nipple / chest wall summary)
  add(`Tumor Extent: ${computeTumorExtent(t)}`);

  // LVI
  if (t.lymphovascularInvasion) add(`Lymphatic and / or Vascular Invasion: ${t.lymphovascularInvasion}`);
  if (t.dermalLymphovascularInvasion && !/not applicable/i.test(t.dermalLymphovascularInvasion)) {
    add(`Dermal Lymphovascular Invasion: ${t.dermalLymphovascularInvasion}`);
  }

  // Treatment Effect
  if (t.treatmentEffect)      add(`Treatment Effect in the Breast: ${t.treatmentEffect}`);
  if (t.treatmentEffectNodes) add(`Treatment Effect in the Lymph Node: ${t.treatmentEffectNodes}`);

  add('');

  // ── MARGINS ─────────────────────────────────────────────────────────────────
  add('MARGINS');

  if (m.invasiveStatus) {
    add('Margin Status for Invasive Carcinoma (required only if residual invasive carcinoma is present in specimen)');
    add(m.invasiveStatus);
    if (m.invasiveStatus === 'All margins negative for invasive carcinoma') {
      const dist    = fmtDist(m.invasiveDistanceMm);
      const closest = (m.invasiveClosestMargins || []).join(', ');
      if (dist || closest) {
        const parts = [dist, closest ? `${closest.toLowerCase()} margin` : null].filter(Boolean);
        add(`Distance from Invasive Carcinoma to Closest Margin: ${parts.join(' ')}`);
      }
    } else if (m.invasiveStatus === 'Invasive carcinoma present at margin') {
      for (const mg of m.invasiveInvolvedMargins || []) {
        add(`Margin Involved: ${mg.side}${mg.extent ? ` (${mg.extent})` : ''}`);
      }
    }
  }

  if (m.dcisStatus && m.dcisStatus !== 'No DCIS' && m.dcisStatus !== 'Cannot be assessed') {
    add('Margin Status for DCIS (required only if DCIS is present in specimen)');
    add(m.dcisStatus);
    if (m.dcisStatus === 'All margins negative for DCIS') {
      const dist    = fmtDist(m.dcisDistanceMm);
      const closest = (m.dcisClosestMargins || []).join(', ');
      if (dist || closest) {
        const parts = [dist, closest ? `${closest.toLowerCase()} margin` : null].filter(Boolean);
        add(`Distance from DCIS to Closest Margin: ${parts.join(' ')}`);
      }
    } else if (m.dcisStatus === 'DCIS present at margin') {
      for (const mg of m.dcisInvolvedMargins || []) {
        add(`Margin Involved by DCIS: ${mg.side}${mg.extent ? ` (${mg.extent})` : ''}`);
      }
    }
  }
  add('');

  // ── REGIONAL LYMPH NODES ────────────────────────────────────────────────────
  add('REGIONAL LYMPH NODES');
  const nodesNA = !n.status || /not applicable/i.test(n.status);

  if (nodesNA) {
    add('Regional Lymph Node Status: Not applicable');
  } else {
    const macro    = Number(n.macroCount) || 0;
    const micro    = Number(n.microCount) || 0;
    const itc      = Number(n.itcCount)   || 0;
    const positive = macro + micro + itc;
    const total    = n.totalExamined != null ? n.totalExamined : null;

    if (n.allNegative === true) {
      add('Regional Lymph Node Status: All regional lymph nodes negative for tumor');
    } else if (positive > 0) {
      const frac = total != null ? `(${positive}/${total})` : String(positive);
      add(`Regional Lymph Node Status: ${positive} lymph node(s) positive for carcinoma ${frac}`);
      if (macro)  add(`  Lymph Nodes with Macrometastases (>2 mm): ${macro}`);
      if (micro)  add(`  Lymph Nodes with Micrometastases (>0.2–2 mm): ${micro}`);
      if (itc)    add(`  Lymph Nodes with Isolated Tumor Cells (≤0.2 mm): ${itc}`);
      if (n.largestDepositMm != null && n.largestDepositMm !== '') {
        add(`Size of Largest Nodal Metastatic Deposit: ${n.largestDepositMm} mm`);
      }
      if (n.extranodalExtension) add(`Extranodal Extension: ${n.extranodalExtension}`);
    }

    if (total != null && total !== '') {
      add(`Total Number of Lymph Nodes Examined (sentinel and non-sentinel): ${total}`);
    }
    if (n.sentinelExamined != null && n.sentinelExamined !== '') {
      add(`Number of Sentinel Nodes Examined: ${n.sentinelExamined}`);
    }

    // (sn) modifier: applies when sentinel nodes were submitted AND total nodes < 6
    const sentinelCount = Number(n.sentinelExamined) || 0;
    const totalCount    = total != null ? Number(total) : null;
    const snApplies     = sentinelCount > 0 && (totalCount === null || totalCount < 6);
    if (snApplies) {
      add('Regional Lymph Node Modifier: (sn) — Sentinel nodes evaluated');
      add('  Note: Fewer than 6 nodes removed; (sn) suffix applies to pN category');
    }
  }
  add('');

  // ── DISTANT METASTASIS ──────────────────────────────────────────────────────
  add('DISTANT METASTASIS');
  add(`Distant Site(s) Involved: ${met.distantSites || 'Not applicable'}`);
  add('');

  // ── pTNM CLASSIFICATION ─────────────────────────────────────────────────────
  add('pTNM CLASSIFICATION (AJCC 8th Edition)');
  const yp  = stg.yPrefix;
  const rp  = stg.rPrefix;
  const pfx = yp ? 'y' : (rp ? 'r' : '');
  if (yp) add('Modified Classification: y (post-neoadjuvant therapy)');
  else if (rp) add('Modified Classification: r (recurrent disease)');

  if (stg.ptCategory) {
    const key  = normalizePt(stg.ptCategory);          // e.g. "pT1c"
    const rawT = key.replace(/^p/, '');                // e.g. "T1c"
    const mMod = stg.mModifier ? ' (m)' : '';
    const desc = PT_DESC[key] || '';
    add(`pT Category: ${pfx}p${rawT}${mMod}${desc ? `: ${desc}` : ''}`);
    add('T Suffix: Not applicable');
  }

  if (stg.pnCategory) {
    const key  = normalizePn(stg.pnCategory);
    const rawN = key.replace(/^p/, '');
    const desc = PN_DESC[key] || '';

    // Auto-detect (sn) modifier for pN display
    const snTotal    = n.totalExamined != null ? Number(n.totalExamined) : null;
    const snSentinel = n.sentinelExamined != null ? Number(n.sentinelExamined) : 0;
    const snSuffix   = (n.nSuffix || []).includes('sn') ||
                       (snSentinel > 0 && (snTotal === null || snTotal < 6));
    const snTag      = snSuffix ? '(sn)' : '';

    add(`pN Category: ${pfx}p${rawN}${snTag}${desc ? `: ${desc}` : ''}`);

    // Render any explicitly set suffixes (f, sn) — skip (sn) if already auto-shown
    for (const suf of n.nSuffix || []) {
      if (suf === 'sn' && snSuffix) continue; // already shown inline
      const sd = N_SUFFIX_DESC[suf] || '';
      add(`N Suffix: (${suf})${sd ? `: ${sd}` : ''}`);
    }
    if (snSuffix && !(n.nSuffix || []).includes('sn')) {
      const sd = N_SUFFIX_DESC['sn'] || '';
      add(`N Suffix: (sn)${sd ? `: ${sd}` : ''}`);
    }
  }

  const pmCat = stg.pmCategory || met.pmCategory;
  if (!pmCat || /not applicable/i.test(pmCat)) {
    add('pM Category: Not applicable - pM cannot be determined from the submitted specimen(s)');
  } else {
    add(`pM Category: ${pmCat}`);
  }
  add('');

  // ── ADDITIONAL FINDINGS ─────────────────────────────────────────────────────
  const af = (cap.additionalFindings || '').trim();
  if (af) { add('ADDITIONAL FINDINGS'); add(af); add(''); }

  // ── SPECIAL STUDIES ─────────────────────────────────────────────────────────
  add('SPECIAL STUDIES');

  if (ss.biomarkersSource === 'Performed on prior biopsy') {
    add('+Breast Biomarker Testing Performed on Previous Biopsy');
    if (ss.priorBiopsyAccession) add(`  Prior Biopsy Accession: ${ss.priorBiopsyAccession}`);
  } else if (ss.biomarkersSource === 'Performed on this specimen') {
    add('+Breast Biomarker Testing Performed on This Specimen');
  } else if (ss.biomarkersSource === 'Pending') {
    add('+Breast Biomarker Testing: Pending');
  }

  if (ss.er?.status) {
    const v = ss.er.percentPositive != null ? `${ss.er.percentPositive}%` : ss.er.status;
    add(`Estrogen Receptor (ER) Status: ${v}`);
    if (ss.er.intensity) add(`Estrogen Receptor (ER) Intensity: ${ss.er.intensity}`);
  }
  if (ss.pr?.status) {
    const v = ss.pr.percentPositive != null ? `${ss.pr.percentPositive}%` : ss.pr.status;
    add(`Progesterone Receptor (PgR) Status: ${v}`);
    if (ss.pr.intensity) add(`Progesterone Receptor (PgR) Intensity: ${ss.pr.intensity}`);
  }
  if (ss.her2Ihc?.score) {
    const interp = ss.her2Ihc.interpretation
      ? `${ss.her2Ihc.interpretation} (Score ${ss.her2Ihc.score})`
      : `Score ${ss.her2Ihc.score}`;
    add(`HER2 (by immunohistochemistry): ${interp}`);
  }
  if (ss.her2Ish?.performed) {
    if (ss.her2Ish.method)  add(`HER2 (ISH) Method: ${ss.her2Ish.method}`);
    if (ss.her2Ish.ratio != null) add(`HER2/CEP17 Ratio: ${ss.her2Ish.ratio}`);
    if (ss.her2Ish.interpretation) add(`HER2 (ISH) Interpretation: ${ss.her2Ish.interpretation}`);
  }
  if (ss.ki67Percent != null && ss.ki67Percent !== '') {
    add(`Ki-67 Percentage of Positive Nuclei: ${ss.ki67Percent}%`);
  }
  if (!ss.biomarkersSource && ss.erPrHer2Text?.trim()) {
    add(ss.erPrHer2Text.trim());
  }

  return L.join('\n');
}
