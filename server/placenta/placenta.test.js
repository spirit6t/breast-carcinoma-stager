import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyPlacentaCase, computePlacentaWeightPercentile, placentaCpt, trimesterLabel } from './caseModel.js';
import { executePlacentaTool } from './agentTools.js';
import { assemblePlacentaReport } from './reportAssembler.js';

async function runSteps(steps) {
  let c = createEmptyPlacentaCase();
  for (const [name, args] of steps) {
    const res = await executePlacentaTool(name, args, c);
    assert.ok(!res.error, `tool ${name} errored: ${res.error}`);
    if (res.case) c = res.case;
  }
  return c;
}

test('percentile: below 10th flags small for gestational age', () => {
  const r = computePlacentaWeightPercentile(39, 350);
  assert.equal(r.isSmall, true);
  assert.equal(r.isLarge, false);
  assert.equal(r.source, 'A-2');
});

test('percentile: median maps to ~50th, not small/large', () => {
  const r = computePlacentaWeightPercentile(39, 490); // p50 = 490
  assert.match(r.band, /50TH PERCENTILE/);
  assert.equal(r.isSmall, false);
  assert.equal(r.isLarge, false);
});

test('percentile: above 90th flags large for gestational age', () => {
  const r = computePlacentaWeightPercentile(39, 700); // p90=635, p97=713
  assert.equal(r.isLarge, true);
  assert.equal(r.isSmall, false);
});

test('percentile: 23-27 weeks uses Appendix A-1', () => {
  const r = computePlacentaWeightPercentile(25, 145); // A-1 p10=142,p25=169
  assert.equal(r.source, 'A-1');
  assert.match(r.band, /10TH TO 25TH/);
});

test('percentile: out-of-range gestational age reported, not crashing', () => {
  const r = computePlacentaWeightPercentile(50, 400);
  assert.equal(r.outOfRange, true);
  assert.equal(r.band, null);
});

test('cpt: third trimester is 88307, earlier is 88305', () => {
  assert.equal(placentaCpt(39), '88307');
  assert.equal(placentaCpt(20), '88305');
});

test('trimester label tracks gestational age', () => {
  assert.equal(trimesterLabel(39), 'THIRD TRIMESTER');
  assert.equal(trimesterLabel(20), 'SECOND TRIMESTER');
});

test('report: normal placenta renders the five standard negative lines', async () => {
  const c = await runSteps([
    ['set_clinical', { gestationalAgeWeeks: 39, deliveryMethod: 'vaginal' }],
    ['set_weight', { placentaWeightG: 490 }],
    ['assemble_report', {}],
  ]);
  const report = assemblePlacentaReport(c);
  assert.match(report, /PLACENTA, 39 WEEKS, VAGINAL DELIVERY:/);
  assert.match(report, /THIRD TRIMESTER PLACENTA, WEIGHT 490 GRAMS \(UNFIXED, TRIMMED\), CORRESPONDING TO .* FOR GESTATIONAL AGE/);
  assert.match(report, /TRIVASCULAR UMBILICAL CORD, NEGATIVE FOR FUNISITIS OR VASCULITIS/);
  assert.match(report, /PLACENTAL MEMBRANES WITH NO EVIDENCE OF ACUTE CHORIOAMNIONITIS/);
  assert.match(report, /PLACENTAL DISC INTACT, NEGATIVE FOR INFARCT AND HEMATOMAS/);
  assert.match(report, /NEGATIVE FOR VILLITIS AND DECIDUAL VASCULOPATHY/);
  assert.match(report, /88307/);
  // weight-standard reference auto-appended
  assert.match(report, /Atlas of Placental Pathology, Appendix A-2/);
  assert.doesNotMatch(report, /SMALL PLACENTA/);
});

test('report: small placenta adds the SGA line and abnormal overrides render', async () => {
  const c = await runSteps([
    ['set_clinical', { gestationalAgeWeeks: 39, deliveryMethod: 'cesarean' }],
    ['set_weight', { placentaWeightG: 350 }],
    ['set_cord', { vessels: 2 }],
    ['set_membranes', { normal: false, line: 'acute chorioamnionitis, maternal inflammatory response stage 2' }],
    ['assemble_report', {}],
  ]);
  const report = assemblePlacentaReport(c);
  assert.match(report, /CESAREAN SECTION:/);
  assert.match(report, /SMALL PLACENTA FOR GESTATIONAL AGE/);
  assert.match(report, /TWO-VESSEL UMBILICAL CORD \(SINGLE UMBILICAL ARTERY\)/);
  assert.match(report, /ACUTE CHORIOAMNIONITIS, MATERNAL INFLAMMATORY RESPONSE STAGE 2/);
});

test('set_weight without gestational age returns an error', async () => {
  const c = createEmptyPlacentaCase();
  const res = await executePlacentaTool('set_weight', { placentaWeightG: 400 }, c);
  assert.ok(res.error);
});
