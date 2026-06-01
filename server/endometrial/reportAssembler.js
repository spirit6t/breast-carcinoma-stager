import { buildEndometrialFinalDx } from './finalDx.js';
import { renderCapSynopticEndometrial } from './capSynoptic.js';
import { computeIhcBilling } from '../billing.js';

function renderIhcSection(caseData) {
  const entries = (caseData.ihc || []).filter(e => e.sentence && e.sentence.trim());
  if (!entries.length) return '';

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

  const ss = caseData.cap?.specialStudies || {};
  if (ss.representativeBlock) {
    lines.push(`\nMost representative tissue block for molecular studies: ${ss.representativeBlock}`);
  }

  return ['IMMUNOHISTOCHEMISTRY', ...lines].join('\n');
}

function renderCptSummary(caseData) {
  const specimens = caseData.specimens || [];
  const ihc = computeIhcBilling(caseData.ihc);
  if (!specimens.length) return '';

  const lines = ['CPT BILLING SUMMARY'];
  for (const s of specimens) {
    lines.push(`${s.letter}. ${s.designation || ''}${s.cpt ? ` — ${s.cpt}` : ''}`);
    const block = ihc.find(x => x.specimenLetter === String(s.letter).toUpperCase());
    if (block) {
      lines.push(`   IHC: ${block.entries.map(e => `${e.antibody} ${e.cpt}`).join(', ')}`);
    }
  }
  return lines.join('\n');
}

export function assembleEndometrialReport(caseData) {
  const parts = [];

  if (caseData.receivedDate) {
    parts.push(`Specimen received: ${caseData.receivedDate}`);
  }

  const h = caseData.priorHistory || {};
  if (h.clinicalHistory && h.clinicalHistory.trim()) {
    parts.push(`CLINICAL INFORMATION\nClinical History: ${h.clinicalHistory.trim()}`);
  }

  parts.push('FINAL DIAGNOSIS:');
  const fd = buildEndometrialFinalDx(caseData);
  if (fd) parts.push(fd);

  const ihc = renderIhcSection(caseData);
  if (ihc) {
    parts.push('---');
    parts.push(ihc);
  }

  parts.push('---');
  parts.push(renderCapSynopticEndometrial(caseData));

  const cpt = renderCptSummary(caseData);
  if (cpt) {
    parts.push('---');
    parts.push(cpt);
  }

  // MIPS quality measures
  const mipsEntries = caseData.mips || [];
  if (mipsEntries.length) {
    const mipsLines = ['MIPS QUALITY MEASURES:'];
    for (const m of mipsEntries) {
      mipsLines.push(`   Measure #${m.measureNumber}: ${m.code}${m.codeLabel ? ` (${m.codeLabel})` : ''}`);
    }
    parts.push(mipsLines.join('\n'));
  }

  return parts.join('\n\n');
}
