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
import { formatMipsSummary } from './mipsBilling.js';

function upper(s) {
  return s ? String(s).toUpperCase() : '';
}
function norm(s) {
  return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : '';
}

/**
 * Render a single specimen block.
 * hasCaseComment: true when the case has a combined cytology comment — used
 *   to suppress per-specimen comment output and to place SEE COMMENT on the
 *   descriptive (last) bullet rather than the adequacy (first) bullet.
 */
function renderSpecimen(s, hasCaseComment) {
  const lines = [];
  const isCytology = s.specimenCategory === 'cytology';

  // Preserve prep-type parenthetical in its original case; uppercase the rest
  const designation = (s.designation || '').replace(/^([^(]+)/, m => m.toUpperCase());
  lines.push(`${s.letter}. ${designation}:`);

  // Collect diagnosis lines
  let dxLines = Array.isArray(s.diagnosisLines) && s.diagnosisLines.length
    ? [...s.diagnosisLines]
    : s.diagnosisLine
    ? [s.diagnosisLine]
    : [];

  const perSpecimenComment = !isCytology && s.comment && s.comment.trim();
  const needsSeeComment = perSpecimenComment || (isCytology && hasCaseComment);

  if (needsSeeComment && dxLines.length > 0) {
    if (isCytology) {
      // SEE COMMENT goes on the last (descriptive) bullet, not the adequacy line
      const lastIdx = dxLines.length - 1;
      if (!/SEE COMMENT/i.test(dxLines[lastIdx])) {
        dxLines[lastIdx] = `${dxLines[lastIdx]}, SEE COMMENT`;
      }
    } else {
      // Surgical: SEE COMMENT on the first (main diagnosis) bullet
      if (!/SEE COMMENT/i.test(dxLines[0])) {
        dxLines[0] = `${dxLines[0]}, SEE COMMENT`;
      }
    }
  }

  for (const dl of dxLines) {
    lines.push(`      -     ${upper(norm(dl))}`);
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

  // Per-specimen comment for surgical path only
  if (perSpecimenComment) {
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

  const hasCaseComment = Boolean(caseData.caseComment && caseData.caseComment.trim());

  parts.push('FINAL DIAGNOSIS:');
  for (const s of specimens) {
    parts.push(renderSpecimen(s, hasCaseComment));
  }

  // Combined cytology comment — rendered once after all specimens
  if (hasCaseComment) {
    parts.push(`Comment: ${caseData.caseComment.trim()}`);
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

  // CPT summary (includes IHC stain count)
  const cptText = formatCptSummary(specimens, caseData.ihc || [], caseData.ihcModifier || '');
  if (cptText) {
    parts.push('---');
    parts.push(cptText);
  }

  // MIPS quality measures
  const mipsEntries = specimens.flatMap(s =>
    (s.mips || []).map(m => ({ specimenLetter: s.letter, ...m }))
  );
  const mipsText = formatMipsSummary(mipsEntries);
  if (mipsText) {
    parts.push('');
    parts.push(mipsText);
  }

  return parts.join('\n\n');
}
