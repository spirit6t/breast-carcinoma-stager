/**
 * Report assembler for the general pathology / cytology module.
 *
 * Surgical path format:
 *   A. DESIGNATION: DIAGNOSIS, see comment.
 *   Comment: [paragraph]
 *
 * Cytology format:
 *   A. DESIGNATION:
 *         -     DIAGNOSIS LINE 1
 *         -     DIAGNOSIS LINE 2
 *   Comment: [paragraph if present]
 */

import { formatCptSummary } from './cptBilling.js';

function upper(s) {
  return s ? String(s).toUpperCase() : '';
}

function renderSpecimen(s) {
  const lines = [];
  const designation = upper(s.designation || '');
  const cat = s.specimenCategory || 'surgical';

  if (cat === 'cytology') {
    // Cytology: header then bullet lines
    lines.push(`${s.letter}. ${designation}:`);
    const dxLines = Array.isArray(s.diagnosisLines) ? s.diagnosisLines : [];
    if (dxLines.length) {
      for (const dl of dxLines) {
        lines.push(`      -     ${upper(dl)}`);
      }
    } else if (s.diagnosisLine) {
      lines.push(`      -     ${upper(s.diagnosisLine)}`);
    }
    if (s.comment && s.comment.trim()) {
      lines.push('');
      lines.push(`Comment: ${s.comment.trim()}`);
    }
  } else {
    // Surgical path: "DESIGNATION: DIAGNOSIS, see comment."
    const dx = upper(s.diagnosisLine || (s.diagnosisLines || [])[0] || '');
    const hasComment = s.comment && s.comment.trim();
    const seeComment = hasComment ? ', see comment.' : '.';
    lines.push(`${s.letter}. ${designation}: ${dx}${seeComment}`);
    if (hasComment) {
      lines.push('');
      lines.push(`Comment: ${s.comment.trim()}`);
    }
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
