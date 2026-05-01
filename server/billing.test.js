import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestSpecimenCpt, computeIhcBilling } from './billing.js';

test('specimen: lumpectomy → 88307', () => {
  assert.equal(suggestSpecimenCpt('Left lumpectomy').cpt, '88307');
});

test('specimen: mastectomy → 88309', () => {
  assert.equal(suggestSpecimenCpt('Right mastectomy').cpt, '88309');
});

test('specimen: sentinel LN → 88307', () => {
  assert.equal(suggestSpecimenCpt('Left axillary sentinel lymph node').cpt, '88307');
});

test('specimen: additional margin → 88305', () => {
  assert.equal(suggestSpecimenCpt('Additional superior margin').cpt, '88305');
  assert.equal(suggestSpecimenCpt('Additional medial margin').cpt, '88305');
});

test('ihc: first antibody 88342, next 88341', () => {
  const r = computeIhcBilling([
    { specimenLetter: 'A', block: 'A1', antibody: 'SMM' },
    { specimenLetter: 'A', block: 'A3', antibody: 'E-cadherin' },
  ]);
  assert.deepEqual(r[0].entries, [
    { antibody: 'SMM', cpt: '88342' },
    { antibody: 'E-cadherin', cpt: '88341' },
  ]);
});

test('ihc: same antibody repeated on same specimen counted once', () => {
  const r = computeIhcBilling([
    { specimenLetter: 'A', block: 'A1', antibody: 'SMM' },
    { specimenLetter: 'A', block: 'A3', antibody: 'SMM' },
  ]);
  assert.equal(r[0].entries.length, 1);
  assert.equal(r[0].entries[0].cpt, '88342');
});

test('ihc: Ki-67 billed as 88360, not in 88342/88341 chain', () => {
  const r = computeIhcBilling([
    { specimenLetter: 'A', block: 'A1', antibody: 'SMM' },
    { specimenLetter: 'A', block: 'A2', antibody: 'Ki-67' },
    { specimenLetter: 'A', block: 'A3', antibody: 'E-cadherin' },
  ]);
  const cpts = r[0].entries.map((e) => e.cpt).sort();
  assert.deepEqual(cpts, ['88341', '88342', '88360']);
});

test('ihc: per-specimen scoping (A and B both start at 88342)', () => {
  const r = computeIhcBilling([
    { specimenLetter: 'A', block: 'A1', antibody: 'SMM' },
    { specimenLetter: 'B', block: 'B1', antibody: 'SMM' },
  ]);
  assert.equal(r.find((x) => x.specimenLetter === 'A').entries[0].cpt, '88342');
  assert.equal(r.find((x) => x.specimenLetter === 'B').entries[0].cpt, '88342');
});
