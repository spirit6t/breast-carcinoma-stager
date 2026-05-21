/**
 * Report assembler for the general pathology / cytology module.
 *
 * All specimens use bullet-dash format:
 *
 *   A. DESIGNATION:
 *         -     MAIN DIAGNOSIS, SEE COMMENT
 *         -     ANCILLARY LINE (e.g. H. PYLORI, DYSPLASIA STATUS)
 *         -     ADDITIONAL LINE
 *
 *   Comment: [paragraph if present]
 */

import { formatCptSummary } from './cptBilling.js';

function upper(s) {
  return s ? String(s).toUpperCase() : '';
}

function renderSpecimen(s) {
  const lines = [];
  const designation = upper(s.designation || '');

  lines.push(`${s.letter}. ${designation}:`);

  // Collect all diagnosis lines (diagnosisLines takes priority; fall back to diagnosisLine)
  const hasComment = s.comment && s.comment.trim();
  let dxLines = Array.isArray(s.diagnosisLines) && s.diagnosisLines.length
    ? s.diagnosisLines
    : s.diagnosisLine
    ? [s.diagnosisLine]
    : [];

  // Append SEE COMMENT to the first line if there is a comment and it isn't already there
  if (hasComment && dxLines.length > 0) {
    const first = dxLines[0];
    if (!/SEE COMMENT/i.test(first)) {
      dxLines = [`${first}, SEE COMMENT`, ...dxLines.slice(1)];
    }
  }

  for (const dl of dxLines) {
    lines.push(`      -     ${upper(dl)}`);
  }

  // Biomarker bullet — auto-injected after diagnosis lines
  const m = s.markers;
  if (m && m.status && Array.isArray(m.list) && m.list.length) {
    if (m.status === 'pending') {
      lines.push(`      -     PENDING FOR BIOMARKERS (${m.list.map(x => x.toUpperCase()).join(', ')})`);
    } else if (m.status === 'available' && m.results && m.results.trim()) {
      lines.push(`      -     ${upper(m.results.trim())}`);
    }
  }

  if (hasComment) {
    lines.push('');
    lines.push(`Comment: ${s.comment.trim()}`);
  }

  return lines.join('\n');
}

export function assemblePathologyReport(caseData) {
  const parts = [];
  const specimens = (caseData.specimens || []).sort((a, b) =>
    a.letter.localeCompare(b.letter)
  );

  if (caseData.receivedDate) {
    parts.push(`Specimen received: ${caseData.receivedDate}`);
  }

  const h = caseData.priorHistory || {};
  if (h.clinicalHistory && h.clinicalHistory.trim()) {
    parts.push(`CLINICAL INFORMATION\n${h.clinicalHistory.trim()}`);
  }

  if (!specimens.length) return parts.join('\n\n') || '(No specimens added)';

  // Gross description section — only rendered when at least one specimen has one
  const specsWithGross = specimens.filter(s => s.grossDescription && s.grossDescription.trim());
  if (specsWithGross.length) {
    const grossLines = ['GROSS DESCRIPTION:'];
    for (const s of specsWithGross) {
      grossLines.push(`${s.letter}. ${upper(s.designation)}: ${s.grossDescription.trim()}`);
    }
    parts.push(grossLines.join('\n'));
  }

  parts.push('FINAL DIAGNOSIS:');
  for (const s of specimens) {
    parts.push(renderSpecimen(s));
  }

  // IHC section
  const ihcEntries = (caseData.ihc || []).filter(e => e.sentence && e.sentence.trim());
  if (ihcEntries.length) {
    const ihcLines = ['IMMUNOHISTOCHEMISTRY'];
    for (const e of ihcEntries) {
      const blockPart = e.block ? ` (block ${e.block})` : '';
      ihcLines.push(`${e.antibody}${blockPart}: ${e.sentence}`);
    }
    parts.push('---');
    parts.push(ihcLines.join('\n'));
  }

  // CPT summary
  const cptText = formatCptSummary(specimens);
  if (cptText) {
    parts.push('---');
    parts.push(cptText);
  }

  return parts.join('\n\n');
}
