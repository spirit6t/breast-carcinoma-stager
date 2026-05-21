/**
 * Airtable PathPattern client.
 * Reads/writes the "Diagnostic comment" table in base app6vyZndScBt10Hl.
 *
 * Requires env var:  AIRTABLE_API_KEY  (Personal Access Token)
 */

const BASE_ID    = 'app6vyZndScBt10Hl';
const COMMENT_TABLE = 'tblnrwntUpZ7uRo9S';

// Field IDs in "Diagnostic comment" table
const F_NAME       = 'fldXdayAe85gv97UQ';  // Name (primary key / search field)
const F_ORGAN      = 'fldKbyCKrRezS1bxC';  // Organ (linked)
const F_DIAGNOSIS  = 'fldJgb3oAzONMVJzQ';  // Diagnosis (linked)
const F_COMMENT    = 'fldsUn9cUwS9K4aln';  // Diagnostic comment (multilineText)
const F_NOTE       = 'fld5XIIGxkcTm7PA6';  // Note

function airtableHeaders() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error('AIRTABLE_API_KEY environment variable is not set');
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Search the "Diagnostic comment" table for records matching
 * the given diagnosis keyword (and optionally organ).
 *
 * Returns the best match: { name, comment, diagnoses[], recordId }
 * or null if nothing found or AIRTABLE_API_KEY not set.
 */
export async function lookupDiagnosticComment(diagnosisKeyword, organKeyword = '') {
  if (!process.env.AIRTABLE_API_KEY) return null;
  if (!diagnosisKeyword) return null;

  // Build a formula that searches the Name field for both keyword fragments
  const kw = diagnosisKeyword.replace(/"/g, '').replace(/'/g, '').toLowerCase();
  const org = (organKeyword || '').replace(/"/g, '').replace(/'/g, '').toLowerCase();

  // SEARCH is case-insensitive in Airtable, OR search across keyword + organ
  let formula;
  if (org) {
    formula = `OR(SEARCH("${kw}", LOWER({Name})) > 0, AND(SEARCH("${kw.split(' ')[0]}", LOWER({Name})) > 0, SEARCH("${org}", LOWER({Name})) > 0))`;
  } else {
    formula = `SEARCH("${kw}", LOWER({Name})) > 0`;
  }

  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${COMMENT_TABLE}`);
  url.searchParams.set('filterByFormula', formula);
  url.searchParams.set('maxRecords', '8');
  url.searchParams.append('fields[]', F_NAME);
  url.searchParams.append('fields[]', F_COMMENT);
  url.searchParams.append('fields[]', F_DIAGNOSIS);
  url.searchParams.append('fields[]', F_NOTE);

  let data;
  try {
    const resp = await fetch(url.toString(), { headers: airtableHeaders() });
    if (!resp.ok) {
      console.error('[airtable] lookup failed:', resp.status, await resp.text().catch(() => ''));
      return null;
    }
    data = await resp.json();
  } catch (e) {
    console.error('[airtable] lookup error:', e);
    return null;
  }

  const records = data.records || [];
  if (!records.length) return null;

  // Score: prefer records whose Name also mentions the organ keyword
  const orgLower = org.toLowerCase();
  const kwLower  = kw.toLowerCase();
  const scored = records.map(r => {
    const name  = (r.fields[F_NAME] || '').toLowerCase();
    const score = (orgLower && name.includes(orgLower) ? 2 : 0)
                + (name.includes(kwLower) ? 1 : 0);
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0].r;
  const comment = best.fields[F_COMMENT] || '';
  const linkedDiagnoses = (best.fields[F_DIAGNOSIS] || []).map(d => d.name || '');

  return {
    name:      best.fields[F_NAME] || '',
    comment,
    diagnoses: linkedDiagnoses,
    note:      best.fields[F_NOTE] || '',
    recordId:  best.id,
  };
}

/**
 * Create a new record in the "Diagnostic comment" table.
 * Returns { success: true, recordId } or throws.
 */
export async function saveDiagnosticComment({ name, commentText, note = '' }) {
  const fields = {
    [F_NAME]:    name,
    [F_COMMENT]: commentText,
  };
  if (note) fields[F_NOTE] = note;

  const resp = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${COMMENT_TABLE}`, {
    method: 'POST',
    headers: airtableHeaders(),
    body: JSON.stringify({ records: [{ fields }] }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Airtable save failed (${resp.status}): ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  const created = data.records?.[0];
  return { success: true, recordId: created?.id, name };
}
