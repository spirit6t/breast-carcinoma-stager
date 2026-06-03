/**
 * Report assembler for lung carcinoma resection cases.
 * CAP Protocol: Lung.Resection v5.1.0.0 — AJCC 9th Edition
 */

import { RESECTION_LABELS, LOBE_LABELS, RESECTION_CPT } from './caseModel.js';
import { computePathologyIhcBilling } from '../pathology/cptBilling.js';

function up(s) { return s ? String(s).toUpperCase() : ''; }
function norm(s) { return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : ''; }
function tc(s) { return s ? String(s).replace(/\b\w/g, c => c.toUpperCase()) : ''; }
function ind(s) { return `   ${s}`; }
function row(label, value) { return value ? `${label}: ${value}` : null; }

// ── Final diagnosis block ─────────────────────────────────────────────────────

function buildPrimaryDxBlock(c, letter) {
  const lines = [];

  // Use stored designation if available, otherwise build from fields
  const primarySpec = (c.specimens || []).find(s => s.letter === letter);
  const designation = primarySpec?.designation
    || (() => {
        const lat  = up(c.laterality || '');
        const lobe = LOBE_LABELS[c.lobe] ? up(LOBE_LABELS[c.lobe]) : up(c.lobe || '');
        const proc = c.resectionType ? up(RESECTION_LABELS[c.resectionType] || c.resectionType) : '';
        return ['LUNG', lat, lobe, proc].filter(Boolean).join(', ');
      })();

  lines.push(`${letter}. ${designation}:`);

  // Histologic type + grade
  if (c.histologicType) {
    let typeStr = up(c.histologicType.replace(/_/g, ' '));
    if (c.mucinous === true) typeStr += ', MUCINOUS';
    if (c.histologicGrade && c.histologicGrade !== 'not_applicable' && c.histologicGrade !== 'GX') {
      const gradeMap = { G1: 'WELL DIFFERENTIATED', G2: 'MODERATELY DIFFERENTIATED', G3: 'POORLY DIFFERENTIATED', G4: 'UNDIFFERENTIATED' };
      typeStr += `, ${gradeMap[c.histologicGrade] || c.histologicGrade}`;
    }
    if (c.histologicPatterns?.trim()) typeStr += ` (${c.histologicPatterns.trim().toUpperCase()})`;
    lines.push(ind(`- ${typeStr}`));
    // IASLC grade rationale (non-mucinous adeno only)
    if (c.iaslcGradeLabel) {
      lines.push(ind(`  IASLC GRADE: ${up(c.iaslcGradeLabel)}${c.iaslcGradeRationale ? ' — ' + c.iaslcGradeRationale : ''}`));
    }
  }

  // Size
  if (c.invasiveSizeCm != null) {
    const hasBothSizes = c.totalSizeCm != null && c.lepidic;
    const sizeStr = hasBothSizes
      ? `INVASIVE COMPONENT: ${c.invasiveSizeCm} CM; TOTAL TUMOR SIZE: ${c.totalSizeCm} CM`
      : `TUMOR MEASURES ${c.invasiveSizeCm} CM`;
    lines.push(ind(`- ${sizeStr}`));
  }

  // Visceral pleural invasion (only PL1/PL2)
  if (c.pleuralInvasion === 'PL1') {
    lines.push(ind('- VISCERAL PLEURAL INVASION: PL1 (INVASION BEYOND ELASTIC LAYER, NOT REACHING PLEURAL SURFACE)'));
  } else if (c.pleuralInvasion === 'PL2') {
    lines.push(ind('- VISCERAL PLEURAL INVASION: PL2 (TUMOR AT VISCERAL PLEURAL SURFACE)'));
  }

  // STAS (only if present)
  if (c.stas === 'present') {
    lines.push(ind('- SPREAD THROUGH AIR SPACES (STAS): PRESENT'));
  }

  // Adjacent structure invasion
  if (c.adjacentStructureInvasion && c.adjacentStructures?.length) {
    lines.push(ind(`- DIRECT INVASION: ${c.adjacentStructures.map(up).join(', ')}`));
  }

  // Margins
  if (c.margins?.invasiveStatus === 'involved' && c.margins.involvedMargins?.length) {
    lines.push(ind(`- MARGIN(S) INVOLVED: ${c.margins.involvedMargins.map(up).join(', ')}`));
  } else if (c.margins?.invasiveStatus === 'all_negative') {
    let closestStr = '';
    if (c.margins.closestMargin && c.margins.closestDistanceCm != null) {
      closestStr = ` (CLOSEST: ${up(c.margins.closestMargin)}, ${c.margins.closestDistanceCm} CM)`;
    } else if (c.margins.closestMargin) {
      closestStr = ` (CLOSEST: ${up(c.margins.closestMargin)})`;
    } else if (c.margins.closestDistanceCm != null) {
      closestStr = ` (CLOSEST MARGIN: ${c.margins.closestDistanceCm} CM)`;
    }
    lines.push(ind(`- ALL MARGINS NEGATIVE${closestStr}`));
  }

  // Stage
  const s = c.stage || {};
  if (s.ptCategory && s.pnCategory) {
    const prefix = s.yPrefix ? 'yp' : s.rPrefix ? 'r' : 'p';
    const pt = s.ptCategory.startsWith('p') ? `${prefix}${s.ptCategory.slice(1)}` : s.ptCategory;
    const pn = s.pnCategory.startsWith('p') ? `${prefix}${s.pnCategory.slice(1)}` : s.pnCategory;
    const pm = s.pmCategory && s.pmCategory !== 'pM0' && s.pmCategory !== 'not_applicable'
      ? ` ${s.pmCategory}` : '';
    const sg = s.stageGroup ? ` — STAGE ${s.stageGroup}` : '';
    lines.push(ind(`- PATHOLOGIC STAGE: ${pt} ${pn}${pm}${sg}`));
  }

  // Molecular pending
  if (c.specialStudies?.molecularPending) {
    const markers = c.specialStudies.molecularMarkers?.length
      ? ` (${c.specialStudies.molecularMarkers.join(', ')})`
      : '';
    lines.push(ind(`- PENDING FOR MOLECULAR TESTING${markers}`));
  }

  return lines.join('\n');
}

// ── Synoptic body ─────────────────────────────────────────────────────────────

function buildSynoptic(c) {
  const sections = [];
  const s = c.stage || {};
  const nodes = c.nodes || {};
  const meta = c.metastasis || {};
  const margins = c.margins || {};
  const ss = c.specialStudies || {};

  // Header
  sections.push('CASE SUMMARY: (LUNG CARCINOMA)\n\nSTANDARD(S): AJCC 9th EDITION');

  // Specimen
  const specimenLines = ['SPECIMEN'];
  const procLabel = c.resectionType ? tc(RESECTION_LABELS[c.resectionType] || c.resectionType) : 'Not specified';
  specimenLines.push(ind(row('Procedure', procLabel)));
  specimenLines.push(ind(row('Treatment Status', c.treatmentStatus === 'yp' ? 'Post-neoadjuvant (yp)' : c.treatmentStatus === 'r' ? 'Recurrence (r)' : 'Primary (p)')));
  specimenLines.push(ind(row('Specimen Laterality', tc(c.laterality || ''))));
  specimenLines.push(ind(row('Lobe', LOBE_LABELS[c.lobe] || tc(c.lobe || ''))));
  sections.push(specimenLines.filter(Boolean).join('\n'));

  // Tumor
  const tumorLines = ['TUMOR'];
  if (c.histologicType) {
    let typeStr = tc(c.histologicType.replace(/_/g, ' '));
    if (c.mucinous === true) typeStr += ', mucinous';
    if (c.mucinous === false && c.lepidic != null) typeStr += c.lepidic ? ', with lepidic component' : ', without lepidic component';
    tumorLines.push(ind(row('Histologic Type', typeStr)));
  }
  if (c.histologicPatterns?.trim()) {
    tumorLines.push(ind(row('Histologic Pattern(s)', c.histologicPatterns)));
  }
  if (c.histologicGrade) {
    const gradeLabel = { G1: 'G1 — Well differentiated', G2: 'G2 — Moderately differentiated', G3: 'G3 — Poorly differentiated', G4: 'G4 — Undifferentiated', GX: 'GX — Cannot be assessed', not_applicable: 'Not applicable' };
    const gradeStr = c.iaslcGradeLabel
      ? `${c.iaslcGradeLabel}${c.iaslcGradeRationale ? ' (' + c.iaslcGradeRationale + ')' : ''}`
      : (gradeLabel[c.histologicGrade] || c.histologicGrade);
    tumorLines.push(ind(row('Histologic Grade (IASLC)', gradeStr)));
  }
  if (c.invasiveSizeCm != null) tumorLines.push(ind(row('Invasive Tumor Size', `${c.invasiveSizeCm} cm`)));
  if (c.totalSizeCm != null)    tumorLines.push(ind(row('Total Tumor Size', `${c.totalSizeCm} cm`)));
  if (c.pleuralInvasion) {
    const plDesc = {
      PL0: 'PL0 — No visceral pleural invasion (tumor within parenchyma)',
      PL1: 'PL1 — Invasion beyond elastic layer, not reaching pleural surface',
      PL2: 'PL2 — Invasion to visceral pleural surface',
    };
    tumorLines.push(ind(row('Visceral Pleural Invasion', plDesc[c.pleuralInvasion] || c.pleuralInvasion)));
  }
  if (c.stas) {
    tumorLines.push(ind(row('Spread Through Air Spaces (STAS)', tc(c.stas.replace(/_/g, ' ')))));
  }
  if (c.lvi) {
    const lviStr = c.lvi === 'present' && c.lviSubtypes?.length
      ? `Present (${c.lviSubtypes.join(', ')})`
      : tc(c.lvi.replace(/_/g, ' '));
    tumorLines.push(ind(row('Lymphatic and/or Vascular Invasion', lviStr)));
  }
  if (c.adjacentStructureInvasion != null) {
    tumorLines.push(ind(row('Direct Invasion of Adjacent Structures', c.adjacentStructureInvasion ? 'Yes' : 'No')));
    if (c.adjacentStructureInvasion && c.adjacentStructures?.length) {
      tumorLines.push(ind(row('Involved Structures', c.adjacentStructures.join(', '))));
    }
  }
  if (c.multifocal) {
    tumorLines.push(ind(row('Multifocal Tumors', 'Yes')));
    for (const n of (c.multifocalNodules || [])) {
      tumorLines.push(ind(`   Nodule: ${n.location || '?'}, ${n.sizeCm} cm, ${n.sameLobe ? 'same lobe' : 'different lobe'}`));
    }
  }
  if (c.treatmentEffect && c.treatmentEffect !== 'No known presurgical therapy') {
    tumorLines.push(ind(row('Treatment Effect', c.treatmentEffect)));
  }
  sections.push(tumorLines.join('\n'));

  // Margins
  const marginLines = ['MARGINS'];
  if (margins.invasiveStatus) {
    if (margins.invasiveStatus === 'all_negative') {
      marginLines.push(ind('Margin Status for Invasive Tumor: All margins negative'));
      // Closest margin — show even if distance is missing
      if (margins.closestMargin) {
        const distStr = margins.closestDistanceCm != null
          ? `${margins.closestDistanceCm} cm`
          : 'distance not specified';
        marginLines.push(ind(`Closest Margin to Invasive Tumor: ${tc(margins.closestMargin)} (${distStr})`));
      }
      if (margins.closestDistanceCm != null && !margins.closestMargin) {
        marginLines.push(ind(`Distance of Invasive Tumor to Closest Margin: ${margins.closestDistanceCm} cm`));
      }
    } else {
      marginLines.push(ind('Margin Status for Invasive Tumor: Margin(s) involved'));
      if ((margins.involvedMargins || []).length) {
        marginLines.push(ind(`Margin(s) Involved: ${margins.involvedMargins.join(', ')}`));
      }
    }
  }
  if (margins.nonInvasiveStatus && margins.nonInvasiveStatus !== 'not_applicable') {
    marginLines.push(ind(row('Non-invasive Tumor Margins', tc(margins.nonInvasiveStatus.replace(/_/g, ' ')))));
  }
  sections.push(marginLines.join('\n'));

  // Nodes
  const nodeLines = ['REGIONAL LYMPH NODES'];
  if (nodes.nodesPositive != null) nodeLines.push(ind(row('Number of Nodes with Tumor', nodes.nodesPositive)));
  if (nodes.positiveStations?.length) nodeLines.push(ind(row('Nodal Site(s) with Tumor', nodes.positiveStations.join(', '))));
  if (nodes.nodesExamined != null) nodeLines.push(ind(row('Number of Nodes Examined', nodes.nodesExamined)));
  if (nodes.examinedStations?.length) nodeLines.push(ind(row('Examined Stations', nodes.examinedStations.join(', '))));
  if (nodes.extranodalExtension) nodeLines.push(ind(row('Extranodal Extension', tc(nodes.extranodalExtension.replace(/_/g, ' ')))));
  if (nodes.largestDepositMm != null) nodeLines.push(ind(row('Largest Metastatic Deposit', `${nodes.largestDepositMm} mm`)));
  if (nodeLines.length === 1) nodeLines.push(ind('Not applicable / no nodes submitted'));
  sections.push(nodeLines.join('\n'));

  // Metastasis
  if (meta.pmCategory && meta.pmCategory !== 'not_applicable') {
    const mLines = ['DISTANT METASTASIS'];
    mLines.push(ind(row('Sites', meta.sites?.join(', ') || 'See below')));
    sections.push(mLines.join('\n'));
  }

  // pTNM
  const stageLines = ['pTNM CLASSIFICATION (AJCC 9th Edition)'];
  const prefix = s.yPrefix ? 'yp' : s.rPrefix ? 'r' : 'p';
  if (s.ptCategory) {
    const pt = `${prefix}${s.ptCategory.replace(/^p/, '')}`;
    stageLines.push(ind(`pT Category: ${pt}${s.ptRationale ? ' — ' + s.ptRationale : ''}`));
  }
  if (s.pnCategory) {
    const pn = `${prefix}${s.pnCategory.replace(/^p/, '')}`;
    stageLines.push(ind(`pN Category: ${pn}${s.pnRationale ? ' — ' + s.pnRationale : ''}`));
  }
  if (s.pmCategory && s.pmCategory !== 'not_applicable') {
    stageLines.push(ind(`pM Category: ${s.pmCategory}`));
  } else {
    stageLines.push(ind('pM Category: pM0'));
  }
  if (s.stageGroup) stageLines.push(ind(`Stage Group: ${s.stageGroup}`));
  sections.push(stageLines.join('\n'));

  // Additional findings
  const af = (c.additionalFindings || []).filter(Boolean);
  if (af.length) {
    sections.push(['ADDITIONAL FINDINGS', ...af.map(f => ind(`- ${f}`))].join('\n'));
  }

  // Special studies
  const ssLines = ['SPECIAL STUDIES'];
  ssLines.push(ind(`Molecular testing ordered: ${ss.molecularPending ? 'Yes' : 'No'}`));
  if (ss.molecularPending && ss.molecularMarkers?.length) {
    ssLines.push(ind(`Markers: ${ss.molecularMarkers.join(', ')}`));
  }
  ssLines.push(ind(`Immunohistochemistry performed: ${ss.ihcPerformed ? 'Yes' : 'No'}`));
  if (ss.ihcPerformed && ss.ihcDescription?.trim()) {
    ssLines.push(ind(`IHC: ${ss.ihcDescription}`));
  }
  sections.push(ssLines.join('\n'));

  return sections.join('\n\n');
}

// ── CPT billing summary ───────────────────────────────────────────────────────

function buildCptSummary(c) {
  const counts = {};          // cpt → count
  const labels = {};          // cpt → first-seen label

  const addCode = (cpt, label) => {
    counts[cpt] = (counts[cpt] || 0) + 1;
    if (!labels[cpt]) labels[cpt] = label;
  };

  // Primary resection specimen
  const CPT_LABELS = {
    '88309': 'Lung lobectomy/pneumonectomy',
    '88307': 'Lung wedge/segmentectomy or lymph node, regional excision',
    '88305': 'Tissue specimen',
    '88331': 'Frozen section consultation (intraoperative)',
  };

  const primaryCpt   = RESECTION_CPT[c.resectionType] || '88309';
  const primaryLabel = CPT_LABELS[primaryCpt] || primaryCpt;
  addCode(primaryCpt, primaryLabel);

  // Secondary specimens
  for (const spec of (c.specimens || [])) {
    if (spec.isPrimary) continue;
    const cpt   = spec.cpt || '88305';
    const label = spec.cptLabel || CPT_LABELS[cpt] || 'Tissue specimen';
    addCode(cpt, label);
  }

  // IHC stains
  const ihcBilling = computePathologyIhcBilling(c.ihc || [], c.ihcModifier || '');
  for (const spec of ihcBilling) {
    for (const e of spec.entries) {
      addCode(e.cpt, '');
    }
  }

  const lines = ['CPT BILLING SUMMARY'];
  // Sort: primary CPT first, then ascending
  const sorted = Object.keys(counts).sort((a, b) => {
    if (a === primaryCpt) return -1;
    if (b === primaryCpt) return 1;
    return a.localeCompare(b);
  });
  for (const cpt of sorted) {
    const label = labels[cpt] ? ` (${labels[cpt]})` : '';
    lines.push(`   ${cpt} × ${counts[cpt]}${label}`);
  }
  return lines.join('\n');
}

// ── MIPS section ──────────────────────────────────────────────────────────────

function buildMipsSummary(c) {
  const entries = c.mips || [];
  if (!entries.length) return '';
  const lines = ['MIPS QUALITY MEASURES:'];
  for (const m of entries) {
    lines.push(`   Measure #${m.measureNumber}: ${m.code}${m.codeLabel ? ` (${m.codeLabel})` : ''}`);
  }
  return lines.join('\n');
}

// ── Main assembler ────────────────────────────────────────────────────────────

function renderSecondarySpecimen(spec) {
  const lines = [];
  lines.push(`${spec.letter}. ${up(spec.designation)}:`);
  const dxLines = (spec.diagnosisLines || []).filter(Boolean);
  for (const dl of dxLines) {
    lines.push(ind(`- ${up(norm(dl))}`));
  }
  if (spec.comment?.trim()) {
    lines.push('');
    lines.push(ind(`Comment: ${spec.comment.trim()}`));
  }
  return lines.join('\n');
}

export function assembleLungReport(caseData) {
  const c = caseData;
  const parts = [];
  const primaryLetter = c.primarySpecimenLetter || 'A';

  // Sort all specimens alphabetically
  const allSpecimens = (c.specimens || []).slice().sort((a, b) => a.letter.localeCompare(b.letter));

  parts.push('FINAL DIAGNOSIS:\n');

  if (allSpecimens.length === 0) {
    // No specimens entered yet — render primary from case fields
    parts.push(buildPrimaryDxBlock(c, primaryLetter));
  } else {
    for (const spec of allSpecimens) {
      if (spec.isPrimary) {
        parts.push(buildPrimaryDxBlock(c, spec.letter));
      } else {
        parts.push(renderSecondarySpecimen(spec));
      }
    }
  }

  parts.push('---');
  parts.push(buildSynoptic(c));

  if (c.caseComment?.trim()) {
    parts.push(`Comment: ${c.caseComment.trim()}`);
  }

  parts.push('---');
  parts.push(buildCptSummary(c));

  const mips = buildMipsSummary(c);
  if (mips) {
    parts.push('');
    parts.push(mips);
  }

  return parts.join('\n\n');
}
