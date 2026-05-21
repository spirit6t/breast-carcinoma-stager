/**
 * Case model for the general pathology / cytology module.
 * Covers any organ, any specimen type (surgical path + cytology).
 */

export function createEmptyPathologyCase() {
  return {
    version: 1,
    organ: 'pathology',
    mode: 'pathology',
    receivedDate: null,
    signoutDate: null,
    priorHistory: { clinicalHistory: '' },
    specimens: [],   // PathologySpecimen[]
    ihc: [],
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Each specimen in a pathology case.
 * specimenCategory: 'surgical' | 'cytology'
 * diagnosisLines: array of bullet strings for cytology,
 *                 or single-item array for surgical path
 * comment: the paragraph text (from Airtable or AI-generated)
 * commentSource: 'airtable' | 'ai' | null
 * cpt: primary CPT code (string)
 * cptAddons: additional CPT codes (e.g. cell block on top of FNA)
 */
export const emptySpecimen = () => ({
  letter: '',
  designation: '',
  specimenCategory: null,  // 'surgical' | 'cytology' — auto-detected
  organ: '',               // extracted organ keyword for Airtable lookup
  diagnosisLine: '',       // surgical: "ADENOCARCINOMA"
  diagnosisLines: [],      // cytology: ["NEGATIVE FOR MALIGNANCY", "ALVEOLAR MACROPHAGES"]
  comment: '',
  commentSource: null,
  cpt: null,
  cptAddons: [],
});

export function setAtPathPathology(obj, path, value) {
  if (!path || typeof path !== 'string') {
    throw new Error(`set_path_field: path must be a non-empty string (got ${JSON.stringify(path)})`);
  }
  const parts = path.replace(/^\./, '').split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
  obj.updatedAt = new Date().toISOString();
  return obj;
}
