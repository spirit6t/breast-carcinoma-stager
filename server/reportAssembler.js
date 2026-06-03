import { buildFinalDiagnosisBlock } from './finalDx.js';
import { renderCapSynopticDCIS } from './cap/excisionDCIS.js';
import { renderCapSynopticInvasive } from './cap/excisionInvasive.js';
import { computeIhcBilling } from './billing.js';
import { assembleEndometrialReport } from './endometrial/reportAssembler.js';
import { assemblePathologyReport } from './pathology/reportAssembler.js';
import { assembleProstateBiopsyReport } from './prostate/reportAssembler.js';
import { assembleLungReport } from './lung/reportAssembler.js';

function renderClinicalInfo(caseData) {
  const h = caseData.priorHistory || {};
  const lines = [];
  if (h.previousBiopsyResult && h.previousBiopsyResult.trim()) {
    const loc = h.previousBiopsyLocation && h.previousBiopsyLocation.trim();
    lines.push(`Prior biopsy pathology: ${h.previousBiopsyResult.trim()}${loc ? ` (${loc})` : ''}`);
  }
  if (h.radiology && h.radiology.trim()) {
    const sz = h.radiologicSizeMm != null ? ` Radiologic size: ${h.radiologicSizeMm} mm.` : '';
    lines.push(`Radiology: ${h.radiology.trim()}${sz}`);
  }
  if (h.previousCarcinomaMarkers && h.previousCarcinomaMarkers.trim()) {
    lines.push(`Prior biomarkers: ${h.previousCarcinomaMarkers.trim()}`);
  }
  if (h.clipType && h.clipType.trim()) {
    lines.push(`Biopsy clip: ${h.clipType.trim()}`);
  }
  if (!lines.length) return '';
  return ['CLINICAL INFORMATION', ...lines].join('\n');
}

function renderIhcComments(caseData) {
  const entries = (caseData.ihc || []).filter((e) => e.sentence && e.sentence.trim());
  if (!entries.length) return '';

  // Group by normalized antibody+finding to consolidate repeated stains
  const groups = new Map();
  for (const e of entries) {
    const key = `${(e.antibody || '').trim().toLowerCase()}||${(e.finding || '').trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, { antibody: (e.antibody || '').trim(), finding: (e.finding || '').trim(), blocks: [], sentence: e.sentence.trim() });
    }
    const block = (e.block || '').trim();
    if (block && !groups.get(key).blocks.includes(block)) {
      groups.get(key).blocks.push(block);
    }
  }

  const lines = [];
  for (const g of groups.values()) {
    if (g.blocks.length > 0) {
      const blockStr = g.blocks.length === 1
        ? `block ${g.blocks[0]}`
        : `blocks ${g.blocks.slice(0, -1).join(', ')} and ${g.blocks[g.blocks.length - 1]}`;
      lines.push(`${g.antibody} (${blockStr}): ${g.sentence}`);
    } else {
      lines.push(g.sentence);
    }
  }

  return ['IMMUNOHISTOCHEMISTRY', ...lines].join('\n');
}

function renderCptSummary(caseData) {
  const specimens = caseData.specimens || [];
  const ihcBilling = computeIhcBilling(caseData.ihc);
  const lines = ['CPT BILLING SUMMARY'];

  const totals = {};
  const addCode = (cpt) => { if (cpt) totals[cpt] = (totals[cpt] || 0) + 1; };

  // Per-specimen lines (specimen CPT + inline IHC display)
  const matchedIhcLetters = new Set();
  for (const s of specimens) {
    const base = `${s.letter}. ${s.designation || ''}${s.cpt ? ` — ${s.cpt}` : ''}`.trim();
    lines.push(base);
    addCode(s.cpt);

    const block = ihcBilling.find((x) => x.specimenLetter === String(s.letter).toUpperCase());
    if (block) {
      const ihcLine = block.entries.map((e) => `${e.antibody} ${e.cpt}`).join(', ');
      lines.push(`   IHC: ${ihcLine}`);
      matchedIhcLetters.add(block.specimenLetter);
    }
  }

  // Show IHC for any unmatched specimen letters (e.g. letter not in specimens list)
  for (const block of ihcBilling) {
    if (!matchedIhcLetters.has(block.specimenLetter)) {
      const label = block.specimenLetter ? `Spec. ${block.specimenLetter}` : 'IHC';
      const ihcLine = block.entries.map((e) => `${e.antibody} ${e.cpt}`).join(', ');
      lines.push(`   ${label} IHC: ${ihcLine}`);
    }
  }

  // Count ALL IHC codes regardless of specimen matching
  for (const block of ihcBilling) {
    for (const e of block.entries) {
      addCode(e.cpt);
    }
  }

  // Totals — all codes sorted
  const totalParts = Object.keys(totals).sort().map((cpt) => `${cpt} × ${totals[cpt]}`);
  if (totalParts.length) {
    lines.push('');
    lines.push(`TOTALS: ${totalParts.join(', ')}`);
  }

  return lines.join('\n');
}

function assembleBreastReport(caseData) {
  const parts = [];

  if (caseData.receivedDate) {
    parts.push(`Specimen received: ${caseData.receivedDate}`);
  }

  const clinicalInfo = renderClinicalInfo(caseData);
  if (clinicalInfo) parts.push(clinicalInfo);

  parts.push('FINAL DIAGNOSIS:');
  const fd = buildFinalDiagnosisBlock(caseData);
  if (fd) parts.push(fd);

  parts.push('---');
  parts.push(
    caseData.mode === 'excision-invasive'
      ? renderCapSynopticInvasive(caseData)
      : renderCapSynopticDCIS(caseData)
  );

  const ihc = renderIhcComments(caseData);
  if (ihc) {
    parts.push('---');
    parts.push(ihc);
  }

  const cpt = renderCptSummary(caseData);
  if (cpt) {
    parts.push('---');
    parts.push(cpt);
  }

  return parts.join('\n\n');
}

export function assembleReport(caseData) {
  if (caseData?.organ === 'endometrium') return assembleEndometrialReport(caseData);
  if (caseData?.organ === 'pathology')   return assemblePathologyReport(caseData);
  if (caseData?.organ === 'prostate')    return assembleProstateBiopsyReport(caseData);
  if (caseData?.organ === 'lung')        return assembleLungReport(caseData);
  return assembleBreastReport(caseData);
}
