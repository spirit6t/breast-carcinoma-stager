export function createEmptyEndometrialCase() {
  return {
    version: 1,
    organ: 'endometrium',
    mode: 'hysterectomy',
    receivedDate: null,
    signoutDate: null,
    priorHistory: {
      clinicalHistory: '',
      previousBiopsyResult: '',
      radiologicFindings: '',
    },
    specimens: [],
    cap: {
      specimen: {
        procedure: null,
        integrity: null,
      },
      tumor: {
        histologicType: null,
        histologicGrade: null,
        tumorSizeMm: null,
        myometrialInvasion: null,        // 'Not identified' | 'Inner half (<50%)' | 'Outer half (≥50%)'
        myometrialInvasionPercent: null,
        myometrialComment: '',
        adenomyosis: null,               // 'Not identified' | 'Present, uninvolved' | 'Present, involved'
        uterineSerosal: null,            // 'Not identified' | 'Present'
        lowerUterineSegment: null,       // 'Not identified' | 'Present, non-myoinvasive' | 'Present, myoinvasive'
        cervicalInvolvement: null,       // 'Not identified' | 'Endocervical glandular involvement' | 'Cervical stromal invasion'
        otherOrganInvolvement: '',
        peritonealWashings: null,        // 'Not submitted' | 'Negative' | 'Positive' | 'Atypical' | 'Suspicious'
        lvi: null,                       // 'Not identified' | 'Present, ≤4 foci' | 'Present, ≥5 foci'
        lviFoci: null,
        fallopianTubes: null,            // 'Benign bilateral' | 'Involved by carcinoma' | ...
        ovaries: null,                   // 'Benign bilateral' | 'Involved by carcinoma' | ...
        adnexalInvolvement: null,
      },
      margins: {
        status: null,                    // 'Not applicable' | 'All margins negative' | 'Carcinoma present at margin'
        closestMm: null,
        closestLocations: [],
        involvedLocations: [],
      },
      nodes: {
        pelvis: {
          status: null,                  // 'Not submitted' | 'All negative' | 'Positive'
          macroCount: null,
          microCount: null,
          itcCount: null,
          totalExamined: null,
          sentinelExamined: null,
          largestDepositMm: null,
          laterality: [],
        },
        paraAortic: {
          status: null,
          macroCount: null,
          microCount: null,
          itcCount: null,
          totalExamined: null,
          sentinelExamined: null,
          largestDepositMm: null,
          laterality: [],
        },
        nSuffix: [],
      },
      metastasis: {
        sites: [],
      },
      stage: {
        ptCategory: null,
        pnCategory: null,
        pmCategory: null,
        figoStage2009: null,
        figoStage2023: null,
        yPrefix: false,
        rPrefix: false,
      },
      additionalFindings: '',
      specialStudies: {
        biomarkersSource: null,          // 'Performed on this specimen' | 'Pending'
        er: null,
        pr: null,
        mmr: null,                       // e.g. 'MLH1 lost, MSH2 intact, MSH6 intact, PMS2 lost'
        p53: null,                       // 'Wild-type (normal)' | 'Abnormal (overexpression)' | 'Abnormal (null)' | 'Equivocal'
        representativeBlock: '',
      },
    },
    ihc: [],
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function setAtPathEndo(obj, path, value) {
  if (!path || typeof path !== 'string') throw new Error(`set_endo_field: path must be a non-empty string (got ${JSON.stringify(path)})`);
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
