export function createEmptyKidneyCase() {
  return {
    version: 1,
    organ: 'kidney',
    mode: 'kidney-nephrectomy',
    receivedDate: null,
    signoutDate: null,
    specimens: [],          // secondary specimens (lymph nodes, margins submitted separately)
    cap: {
      specimen: {
        procedure: null,    // 'Partial nephrectomy' | 'Total (simple) nephrectomy' | 'Radical nephrectomy' | 'Other'
        laterality: null,   // 'Right' | 'Left' | 'Not specified'
        procedureOther: '',
      },
      tumor: {
        focality: null,               // 'Unifocal' | 'Multifocal'
        multifocalCount: null,        // number of tumors if multifocal
        site: [],                     // ['Upper pole','Middle','Lower pole','Other']
        siteOther: '',
        sizeCm: null,                 // greatest dimension in cm
        otherSizesCm: [],             // sizes of additional tumors
        sizeCannotBeDetermined: '',
        histologicType: null,         // see HISTOLOGIC_TYPES list
        histologicTypeOther: '',
        histologicTypeComment: '',
        histologicGrade: null,        // 'G1'|'G2'|'G3'|'G4'|'GX'|'Not applicable'
        histologicGradeComment: '',
        tumorExtent: [],              // select all that apply — see TUMOR_EXTENT list
        tumorExtentOther: '',
        rhabdoidFeatures: null,       // 'Not identified' | 'Present' | 'Cannot be determined'
        rhabdoidPct: null,
        sarcomatoidFeatures: null,    // 'Not identified' | 'Present' | 'Cannot be determined'
        sarcomatoidPct: null,
        necrosis: null,               // 'Not identified' | 'Present' | 'Cannot be determined'
        necrosisPct: null,
        lvi: null,                    // 'Not identified' | 'Present' | 'Cannot be determined'
        tumorComment: '',
      },
      margins: {
        status: null,         // 'All margins negative' | 'Carcinoma present at margin' | 'Cannot be determined' | 'Not applicable'
        involvedLocations: [], // 'Renal parenchymal' | 'Renal capsular' | 'Renal sinus soft tissue' | 'Renal hilar soft tissue' | 'Renal vein' | 'Ureteral' | 'Perinephric fat' | "Gerota's fascia" | 'Other'
        involvedOther: '',
        marginComment: '',
      },
      nodes: {
        status: null,           // 'Not applicable' | 'All negative' | 'Tumor present'
        nodesPositive: null,
        nodesExamined: null,
        nodesPositiveQualifier: null, // 'Exact' | 'At least'
        nodesExaminedQualifier: null,
        sites: [],              // nodal sites with tumor
        largestDepositCm: null,
        extranodalExtension: null, // 'Not identified' | 'Present' | 'Cannot be determined'
        nodeComment: '',
      },
      metastasis: {
        sites: [],
      },
      stage: {
        ptCategory: null,
        pnCategory: null,
        pmCategory: null,
        tSuffix: '',            // '(m)' if multiple synchronous tumors
        yPrefix: false,
        rPrefix: false,
      },
      additionalFindings: '',
      specialStudies: {
        ihcPerformed: false,
        ihcDescription: '',
        molecularPending: false,
        molecularMarkers: [],
      },
    },
    caseComment: '',
    ihc: [],
    ihcModifier: '',
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

// Auto-compute pT from extent array and size
export function computeKidneyPT(tumorExtent = [], sizeCm = null) {
  const ext = tumorExtent.map(e => (e || '').toLowerCase());
  const hasExtent = s => ext.some(e => e.includes(s));

  if (hasExtent('gerota') || hasExtent('beyond gerota') || hasExtent('directly invades adrenal'))
    return 'pT4';
  if (hasExtent('inferior vena cava above') || hasExtent('wall of the vena cava') || hasExtent('above the diaphragm'))
    return 'pT3c';
  if (hasExtent('inferior vena cava below') || hasExtent('below the diaphragm') || hasExtent('vena cava below'))
    return 'pT3b';
  if (hasExtent('renal vein') || hasExtent('renal sinus') || hasExtent('perinephric') || hasExtent('pelvicalyceal'))
    return 'pT3a';
  // Limited to kidney — size-based
  if (sizeCm == null) return null;
  if (sizeCm <= 4) return 'pT1a';
  if (sizeCm <= 7) return 'pT1b';
  if (sizeCm <= 10) return 'pT2a';
  return 'pT2b';
}

export function setAtPathKidney(obj, path, value) {
  if (!path || typeof path !== 'string') throw new Error(`set_kidney_field: path must be a non-empty string (got ${JSON.stringify(path)})`);
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
