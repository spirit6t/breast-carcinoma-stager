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

  // Pattern 4 % — show ONE line only.
  // GG2/GG3: categorical value takes priority; suppress if high-grade elsewhere per CAP note.
  // GG4+: numeric value only.
  if (s.pattern4Pct && !hasHighGradeElsewhere) {
    lines.push(indent(`PERCENTAGE OF PATTERN 4: ${up(s.pattern4Pct)}`));
  } else if (s.pattern4PctNumeric != null) {
    lines.push(indent(`PERCENTAGE OF PATTERN 4: ${s.pattern4PctNumeric}%`));
  }
  if (s.pattern5PctNumeric != null) {
    lines.push(indent(`PERCENTAGE OF PATTERN 5: ${s.pattern5PctNumeric}%`));
  }

  // IDC — "IDC INCORPORATED INTO GRADE" only shown when IDC is present
  const idcVal = s.idc || 'Not identified';
  lines.push(indent(`INTRADUCTAL CARCINOMA: ${up(idcVal)}`));
  if (/present/i.test(idcVal)) {
    lines.push(indent(`IDC INCORPORATED INTO GRADE: ${up(s.idcIncorporatedIntoGrade || 'No')}`));
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

  // PIN4 IHC — full standardized paragraph
  if (s.pin4Performed) {
    const blockRef  = s.pin4Block  ? `block ${s.pin4Block}`  : 'block ***';
    const isPositive = /positive|amacr\+/i.test(s.pin4Result || '');
    const isNegative = /negative/i.test(s.pin4Result || '');
    let pin4Para;
    if (isPositive) {
      pin4Para =
        `Specimen ${s.letter} was evaluated with a PIN immunohistochemical multiplex stain ` +
        `(p63, cytokeratin 34betaE12, AMACR) performed on ${blockRef} to assess small infiltrating glands. ` +
        `These glands have no identifiable basal cells by p63 and cytokeratin 34betaE12 with positive ` +
        `luminal AMACR staining confirming the diagnosis above. All controls stain appropriately.`;
    } else if (isNegative) {
      pin4Para =
        `Specimen ${s.letter} was evaluated with a PIN immunohistochemical multiplex stain ` +
        `(p63, cytokeratin 34betaE12, AMACR) performed on ${blockRef} to assess small infiltrating glands. ` +
        `These glands demonstrate intact basal cells by p63 and cytokeratin 34betaE12 with absent AMACR ` +
        `staining, not supporting carcinoma. All controls stain appropriately.`;
    } else {
      // Fallback: use whatever the agent captured
      pin4Para =
        `Specimen ${s.letter} was evaluated with a PIN immunohistochemical multiplex stain ` +
        `(p63, cytokeratin 34betaE12, AMACR) performed on ${blockRef}. ` +
        `${(s.pin4Result || '').trim()} All controls stain appropriately.`;
    }
    lines.push('');
    lines.push(indent(`PIN4 IMMUNOHISTOCHEMISTRY: ${pin4Para}`));
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

function renderMipsSummary(specimens) {
  const entries = specimens.flatMap(s =>
    (s.mips || []).map(m => ({ letter: s.letter, ...m }))
  );
  if (!entries.length) return '';
  const lines = ['MIPS QUALITY MEASURES:'];
  for (const e of entries) {
    lines.push(`   Spec. ${e.letter} — Measure #${e.measureNumber}: ${e.code}${e.codeLabel ? ` (${e.codeLabel})` : ''}`);
  }
  return lines.join('\n');
}

function renderCptSummary(specimens) {
  if (!specimens.length) return '';

  // Tally all CPT codes across specimens
  const counts = new Map();
  const labels = {
    '88305': 'Tissue biopsy',
    '88344': 'PIN4 IHC — multiplex antibody stain',
  };

  for (const s of specimens) {
    const primary = s.cpt || '88305';
    counts.set(primary, (counts.get(primary) || 0) + 1);
    for (const addon of (s.cptAddons || [])) {
      counts.set(addon, (counts.get(addon) || 0) + 1);
    }
  }

  const lines = ['CPT BILLING SUMMARY'];
  for (const [code, count] of [...counts.entries()].sort()) {
    const label = labels[code] ? ` (${labels[code]})` : '';
    lines.push(`   ${code} × ${count}${label}`);
  }
  return lines.join('\n');
}

export function assembleProstateBiopsyReport(caseData) {
  const parts = [];
  const specimens = (caseData.specimens || []).sort((a, b) => a.letter.localeCompare(b.letter));

  // Procedure
  if (caseData.procedure?.length) {
    parts.push(`PROCEDURE: ${caseData.procedure.map(p => p.toUpperCase()).join(', ')}`);
  }

  if (!specimens.length) return parts.join('\n\n') || '(No specimens added)';

  // Determine if any specimen has GG ≥ 4 (score ≥ 8) → suppress pattern 4 % in lower-grade ones
  const hasHighGradeElsewhere = specimens.some(s => s.hasCarcinoma && (s.gradeGroup ?? 0) >= 4);

  parts.push('FINAL DIAGNOSIS:');

  // Render all specimens in designation order (A, B, C, ...)
  for (const s of specimens) {
    if (s.hasCarcinoma === true) {
      parts.push(renderMalignantSpecimen(s, hasHighGradeElsewhere && (s.gradeGroup ?? 0) < 4));
    } else if (s.hasCarcinoma === false) {
      parts.push(renderBenignSpecimen(s));
    } else {
      parts.push(`${s.letter}. ${up(s.designation)}:\n${indent('(PENDING)')}`);
    }
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

  // MIPS
  const mips = renderMipsSummary(specimens);
  if (mips) {
    parts.push('');
    parts.push(mips);
  }

  return parts.join('\n\n');
}
