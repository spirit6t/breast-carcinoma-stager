/**
 * Report assembler for prostate needle core biopsy cases.
 * CAP Protocol: Prostate.Needle.Case.Bx_1.1.0.0 (Sep 2023, WHO 5th Ed)
 *
 * FORMAT (per user specification):
 *
 *   A. PROSTATE, LEFT APEX, CORE NEEDLE BIOPSY:
 *         ACINAR ADENOCARCINOMA, CONVENTIONAL (USUAL) TYPE
 *         GRADE GROUP 2 (GLEASON SCORE 3 + 4 = 7)
 *         PERCENTAGE OF PATTERN 4: <5%
 *         INTRADUCTAL CARCINOMA: NOT IDENTIFIED
 *         IDC INCORPORATED INTO GRADE: NO
 *         CRIBRIFORM GLANDS (APPLICABLE TO GLEASON SCORE 7-8 CANCER ONLY): NOT IDENTIFIED
 *         TUMOR PRESENT IN 2 OUT OF 3 CORES
 *            - PERCENTAGE OF PROSTATIC TISSUE INVOLVED BY TUMOR: 40%, 20%
 *
 *   B. PROSTATE, RIGHT APEX, CORE NEEDLE BIOPSY:
 *         BENIGN PROSTATIC TISSUE
 */

function up(s) { return s ? String(s).toUpperCase() : ''; }
function indent(s) { return `      ${s}`; }
function bullet(s) { return `         - ${up(s)}`; }

function renderMalignantSpecimen(s, hasHighGradeElsewhere) {
  const lines = [];
  lines.push(`${s.letter}. ${up(s.designation)}:`);

  // Histologic type
  lines.push(indent(up(s.histologicType || 'ACINAR ADENOCARCINOMA, CONVENTIONAL (USUAL) TYPE')));

  // Grade group
  if (s.gradeGroupLabel) {
    lines.push(indent(up(s.gradeGroupLabel)));
  }

  // Pattern 4 % — GG2 (3+4) and GG3 (4+3); omit if high-grade elsewhere per CAP note
  if (s.pattern4Pct && !hasHighGradeElsewhere) {
    lines.push(indent(`PERCENTAGE OF PATTERN 4: ${up(s.pattern4Pct)}`));
  }
  // Pattern 4/5 numeric for GG4+
  if (s.pattern4PctNumeric != null) {
    lines.push(indent(`PERCENTAGE OF PATTERN 4: ${s.pattern4PctNumeric}%`));
  }
  if (s.pattern5PctNumeric != null) {
    lines.push(indent(`PERCENTAGE OF PATTERN 5: ${s.pattern5PctNumeric}%`));
  }

  // IDC
  const idcVal = s.idc || 'Not identified';
  lines.push(indent(`INTRADUCTAL CARCINOMA: ${up(idcVal)}`));
  if (idcVal.toLowerCase() === 'present') {
    lines.push(indent(`IDC INCORPORATED INTO GRADE: ${up(s.idcIncorporatedIntoGrade || 'No')}`));
  } else {
    lines.push(indent('IDC INCORPORATED INTO GRADE: NO'));
  }

  // Cribriform glands — applicable to GG2/GG3/GG4 (score 7–8)
  const gg = s.gradeGroup;
  if (gg && gg >= 2 && gg <= 4) {
    const crib = s.cribriformGlands || 'Not identified';
    lines.push(indent(`CRIBRIFORM GLANDS (APPLICABLE TO GLEASON SCORE 7-8 CANCER ONLY): ${up(crib)}`));
  }

  // Tumor quantitation
  const pos  = s.coresPositive ?? '?';
  const tot  = s.coresTotal    ?? '?';
  lines.push(indent(`TUMOR PRESENT IN ${pos} OUT OF ${tot} CORES`));

  const pcts = (s.corePctInvolvement || []).filter(p => p != null && p !== '');
  if (pcts.length) {
    lines.push(bullet(`PERCENTAGE OF PROSTATIC TISSUE INVOLVED BY TUMOR: ${pcts.map(p => `${p}%`).join(', ')}`));
  }

  // Perineural invasion (optional — only render if set)
  if (s.perineumralInvasion) {
    lines.push(indent(`PERINEURAL INVASION: ${up(s.perineumralInvasion)}`));
  }

  // LVI (optional)
  if (s.lvi) {
    lines.push(indent(`LYMPHOVASCULAR INVASION: ${up(s.lvi)}`));
  }

  // PIN4 IHC
  if (s.pin4Performed && s.pin4Result) {
    lines.push('');
    lines.push(indent(`PIN4 IMMUNOHISTOCHEMISTRY: ${s.pin4Result.trim()}`));
  }

  return lines.join('\n');
}

function renderBenignSpecimen(s) {
  const lines = [];
  lines.push(`${s.letter}. ${up(s.designation)}:`);
  lines.push(indent('BENIGN PROSTATIC TISSUE'));

  const af = (s.additionalFindings || []).filter(Boolean);
  for (const f of af) {
    lines.push(indent(up(f)));
  }

  // PIN4 on benign specimen
  if (s.pin4Performed && s.pin4Result) {
    lines.push('');
    lines.push(indent(`PIN4 IMMUNOHISTOCHEMISTRY: ${s.pin4Result.trim()}`));
  }

  return lines.join('\n');
}

function renderCaseSummary(caseData, specimens) {
  // Compute case-level highest grade from all malignant specimens
  const malignant = specimens.filter(s => s.hasCarcinoma);
  if (!malignant.length) return '';

  const highest = malignant.reduce((best, s) => {
    if (!best || (s.gradeGroup ?? 0) > (best.gradeGroup ?? 0)) return s;
    return best;
  }, null);

  const totalCores    = specimens.reduce((sum, s) => sum + (s.coresTotal    || 0), 0) || null;
  const positiveCores = malignant.reduce((sum, s) => sum + (s.coresPositive || 0), 0) || null;

  // Greatest % in any single core across all malignant specimens
  let greatestPct = null;
  let greatestSite = '';
  for (const s of malignant) {
    for (const pct of (s.corePctInvolvement || [])) {
      const num = parseFloat(pct);
      if (!isNaN(num) && (greatestPct === null || num > greatestPct)) {
        greatestPct = num;
        greatestSite = s.letter;
      }
    }
  }

  // Case-level PNI (true if any specimen has it)
  const casePni = malignant.some(s => /present/i.test(s.perineumralInvasion || ''))
    ? 'Present'
    : malignant.some(s => s.perineumralInvasion)
    ? 'Not identified'
    : null;

  const caseLvi = malignant.some(s => /present/i.test(s.lvi || ''))
    ? 'Present'
    : malignant.some(s => s.lvi)
    ? 'Not identified'
    : null;

  const caseIdc = malignant.some(s => /present/i.test(s.idc || ''))
    ? 'Present'
    : 'Not identified';

  const lines = ['CASE SUMMARY:'];

  if (highest?.gradeGroupLabel) {
    lines.push(indent(`HIGHEST GRADE: ${up(highest.gradeGroupLabel)}`));
    lines.push(indent(`SITE(S): ${up(highest.designation?.match(/PROSTATE,\s*([^,]+)/i)?.[1]?.trim() || highest.letter)} (SPECIMEN ${highest.letter})`));
  }

  if (positiveCores != null && totalCores != null) {
    const pct = Math.round((positiveCores / totalCores) * 100);
    lines.push(indent(`TOTAL POSITIVE CORES: ${positiveCores} OF ${totalCores} (${pct}%)`));
  }

  if (greatestPct !== null) {
    lines.push(indent(`GREATEST PERCENTAGE OF CORE INVOLVEMENT IN ANY CORE: ${greatestPct}% (SPECIMEN ${greatestSite})`));
  }

  if (casePni)  lines.push(indent(`PERINEURAL INVASION: ${up(casePni)}`));
  if (caseLvi)  lines.push(indent(`LYMPHOVASCULAR INVASION: ${up(caseLvi)}`));

  lines.push(indent(`INTRADUCTAL CARCINOMA: ${up(caseIdc)}`));

  if (caseData.periprosataticFatInvasion) {
    lines.push(indent(`PERIPROSTATIC FAT INVASION: ${up(caseData.periprosataticFatInvasion)}`));
  }
  if (caseData.seminalVesicleInvasion) {
    lines.push(indent(`SEMINAL VESICLE INVASION: ${up(caseData.seminalVesicleInvasion)}`));
  }
  if (caseData.treatmentEffect && !/no known/i.test(caseData.treatmentEffect)) {
    lines.push(indent(`TREATMENT EFFECT: ${up(caseData.treatmentEffect)}`));
  }

  return lines.join('\n');
}

function renderCptSummary(specimens) {
  if (!specimens.length) return '';
  const lines = ['CPT BILLING SUMMARY'];
  for (const s of specimens) {
    lines.push(`${s.letter}. ${up(s.designation)} — ${s.cpt || '88305'}`);
    if (s.cptAddons && s.cptAddons.length) {
      lines.push(`   Add-on: ${s.cptAddons.join(', ')}${s.cptAddons.includes('88344') ? ' (PIN4 IHC — multiplex antibody)' : ''}`);
    }
  }
  return lines.join('\n');
}

export function assembleProstateBiopsyReport(caseData) {
  const parts = [];
  const specimens = (caseData.specimens || []).sort((a, b) => a.letter.localeCompare(b.letter));

  // Clinical information
  const h = caseData.priorHistory || {};
  const clinLines = [];
  if (h.clinicalHistory?.trim()) clinLines.push(h.clinicalHistory.trim());
  if (h.psaLevel?.trim())        clinLines.push(`PSA: ${h.psaLevel.trim()}`);
  if (h.clinicalStage?.trim())   clinLines.push(`Clinical stage: ${h.clinicalStage.trim()}`);
  if (h.imagingFindings?.trim()) clinLines.push(`Imaging: ${h.imagingFindings.trim()}`);
  if (clinLines.length) parts.push(`CLINICAL INFORMATION\n${clinLines.join('\n')}`);

  // Procedure
  if (caseData.procedure?.length) {
    parts.push(`PROCEDURE: ${caseData.procedure.map(p => p.toUpperCase()).join(', ')}`);
  }

  if (!specimens.length) return parts.join('\n\n') || '(No specimens added)';

  // Determine if any specimen has GG ≥ 4 (score ≥ 8) → suppress pattern 4 % in lower-grade ones
  const hasHighGradeElsewhere = specimens.some(s => s.hasCarcinoma && (s.gradeGroup ?? 0) >= 4);

  parts.push('FINAL DIAGNOSIS:');

  // Positive specimens first, then benign
  const malignant = specimens.filter(s => s.hasCarcinoma);
  const benign    = specimens.filter(s => s.hasCarcinoma === false);

  if (malignant.length) {
    for (const s of malignant) {
      parts.push(renderMalignantSpecimen(s, hasHighGradeElsewhere && (s.gradeGroup ?? 0) < 4));
    }
  }

  if (benign.length) {
    const benignHeader = benign.length > 1 ? 'BENIGN SPECIMEN(S):' : null;
    if (benignHeader) parts.push(benignHeader);
    for (const s of benign) {
      parts.push(renderBenignSpecimen(s));
    }
  }

  // Unprocessed specimens (hasCarcinoma still null)
  const pending = specimens.filter(s => s.hasCarcinoma === null);
  for (const s of pending) {
    parts.push(`${s.letter}. ${up(s.designation)}:\n${indent('(PENDING)')}`);
  }

  // Case summary
  const summary = renderCaseSummary(caseData, specimens);
  if (summary) parts.push(summary);

  // Case comment
  if (caseData.caseComment?.trim()) {
    parts.push(`Comment: ${caseData.caseComment.trim()}`);
  }

  // CPT
  const cpt = renderCptSummary(specimens);
  if (cpt) {
    parts.push('---');
    parts.push(cpt);
  }

  return parts.join('\n\n');
}
