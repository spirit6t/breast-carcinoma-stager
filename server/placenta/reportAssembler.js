/**
 * Report assembler for singleton placenta examination cases.
 * Pure function — no side effects.
 *
 * Terminology: Amsterdam Placental Workshop Group Consensus Statement.
 * Weight percentiles: Atlas of Placental Pathology, Appendices A-1 / A-2.
 */

import {
  trimesterLabel,
  DELIVERY_LABELS,
  DEFAULT_PLACENTA_REFERENCES,
  WEIGHT_REFERENCES,
} from './caseModel.js';

function up(s) { return s ? String(s).toUpperCase() : ''; }
function norm(s) { return s ? String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t') : ''; }

// Diagnosis lines are indented without a leading dash.
function bullet(s) { return `      ${s}`; }

function buildHeader(c) {
  if (c.specimenDesignation && c.specimenDesignation.trim()) {
    const d = up(norm(c.specimenDesignation.trim()));
    return d.endsWith(':') ? d : `${d}:`;
  }
  const parts = ['PLACENTA'];
  if (c.gestationalAgeWeeks != null) parts.push(`${c.gestationalAgeWeeks} WEEKS`);
  const dm = c.deliveryMethod === 'other'
    ? up(c.deliveryMethodOther || 'DELIVERY')
    : (DELIVERY_LABELS[c.deliveryMethod] || '');
  if (dm) parts.push(dm);
  return `${parts.join(', ')}:`;
}

function buildWeightLines(c) {
  const lines = [];
  const trimester = trimesterLabel(c.gestationalAgeWeeks);
  const wp = c.weightPercentile;

  if (c.placentaWeightG != null) {
    let line = `${trimester} PLACENTA, WEIGHT ${c.placentaWeightG} GRAMS (UNFIXED, TRIMMED)`;
    if (wp && wp.band) {
      line += `, CORRESPONDING TO ${wp.band} FOR GESTATIONAL AGE`;
    }
    lines.push(bullet(line));

    if (wp?.isSmall) lines.push(bullet('SMALL PLACENTA FOR GESTATIONAL AGE'));
    else if (wp?.isLarge) lines.push(bullet('LARGE PLACENTA FOR GESTATIONAL AGE'));
  } else {
    lines.push(bullet(`${trimester} PLACENTA`));
  }
  return lines;
}

function cordLine(c) {
  const f = c.findings?.cord || {};
  if (f.normal === false && f.line && f.line.trim()) return up(norm(f.line.trim()));
  const vesselWord = Number(c.cordVessels) === 2
    ? 'TWO-VESSEL UMBILICAL CORD (SINGLE UMBILICAL ARTERY)'
    : 'TRIVASCULAR UMBILICAL CORD';
  return `${vesselWord}, NEGATIVE FOR FUNISITIS OR VASCULITIS`;
}

function componentLine(f, normalText) {
  if (f && f.normal === false && f.line && f.line.trim()) return up(norm(f.line.trim()));
  return normalText;
}

export function assemblePlacentaReport(caseData) {
  const c = caseData;
  const parts = [];

  if (c.clinicalHistory && c.clinicalHistory.trim()) {
    parts.push(['CLINICAL INFORMATION', c.clinicalHistory.trim()].join('\n'));
  }

  // Final diagnosis
  const dx = [];
  dx.push(buildHeader(c));
  dx.push(...buildWeightLines(c));
  dx.push(bullet(cordLine(c)));
  dx.push(bullet(componentLine(c.findings?.membranes, 'PLACENTAL MEMBRANES WITH NO EVIDENCE OF ACUTE CHORIOAMNIONITIS')));
  dx.push(bullet(componentLine(c.findings?.disc, 'PLACENTAL DISC INTACT, NEGATIVE FOR INFARCT AND HEMATOMAS')));
  dx.push(bullet(componentLine(c.findings?.villiDecidua, 'NEGATIVE FOR VILLITIS AND DECIDUAL VASCULOPATHY')));

  for (const extra of (c.additionalDiagnosisLines || [])) {
    if (extra && String(extra).trim()) dx.push(bullet(up(norm(String(extra).trim()))));
  }

  parts.push(['FINAL DIAGNOSIS:', '', dx.join('\n')].join('\n'));

  if (c.caseComment && c.caseComment.trim()) {
    parts.push(`Comment: ${c.caseComment.trim()}`);
  }

  // References — ensure weight-standard citation is present for the table used.
  const refs = (c.references && c.references.length) ? [...c.references] : [...DEFAULT_PLACENTA_REFERENCES];
  const src = c.weightPercentile?.source;
  if (src && WEIGHT_REFERENCES[src] && !refs.includes(WEIGHT_REFERENCES[src])) {
    refs.push(WEIGHT_REFERENCES[src]);
  }
  if (refs.length) {
    parts.push(['REFERENCES:', ...refs.map((r, i) => `${i + 1}. ${r}`)].join('\n'));
  }

  // CPT
  if (c.cpt) {
    parts.push(['CPT BILLING SUMMARY', `   ${c.cpt} × 1 (Placenta${c.cpt === '88307' ? ', third trimester' : ''})`].join('\n'));
  }

  return parts.join('\n\n');
}
