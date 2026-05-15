/**
 * Case shape for breast carcinoma stager.
 * v1 = breast excision with DCIS only (other modes stubbed at wizard level).
 */

export const MODES = Object.freeze({
  EXCISION_DCIS: 'excision-DCIS',
  EXCISION_INVASIVE: 'excision-invasive', // stub
  BIOPSY_DCIS: 'biopsy-DCIS',             // stub
  BIOPSY_INVASIVE: 'biopsy-invasive',     // stub
});

export function createEmptyCase(mode = MODES.EXCISION_DCIS) {
  return {
    version: 1,
    mode,
    receivedDate: null,
    signoutDate: null,
    priorHistory: {
      previousBiopsyResult: '',
      previousBiopsyLocation: '',
      radiology: '',
      radiologicSizeMm: null,
      previousCarcinomaMarkers: '',
      clipType: '',
    },
    specimens: [
      // { letter: 'A', designation: 'Left lumpectomy', cpt: '88307' }
    ],
    cap: {
      specimen: {
        procedure: null,       // 'Lumpectomy' | 'Mastectomy' | ...
        laterality: null,      // 'Left' | 'Right'
        integrity: null,       // 'Intact' | 'Sliced' | 'Fragmented'
      },
      tumor: {
        site: [],              // ['Upper outer quadrant', ...]
        histologicType: null,  // 'Ductal carcinoma in situ' | 'Invasive ductal carcinoma' | ...
        histologicTypeOther: '',
        // DCIS / size-of-extent fields (used in DCIS mode):
        sizeExtentMm: null,
        additionalDimMm: null, // "15 x 10"
        cannotDetermineSize: '',
        blocksWithDCIS: null,
        blocksExamined: null,
        architecturalPatterns: [], // DCIS architectural patterns
        nuclearGrade: null,    // DCIS nuclear grade
        necrosis: null,        // DCIS necrosis
        microcalcifications: [],
        microcalcificationsOther: '',
        // Invasive-specific fields:
        grossSizeMm: null,
        invasiveSizeMm: null,
        invasiveAdditionalDimMm: null,
        invasiveSizeCannotBeDetermined: '',
        focality: null,             // 'Single focus of invasive carcinoma' | 'Multiple foci of invasive carcinoma' | 'Cannot be determined'
        numberOfFoci: null,
        sizeOfLargestFocus: null,
        nottingham: {
          tubuleFormation: null,    // 1 | 2 | 3
          nuclearPleomorphism: null,// 1 | 2 | 3
          mitoticCount: null,       // 1 | 2 | 3
          mitosesPer10HPF: null,
          fieldDiameterMm: null,
          totalScore: null,         // 3..9
          overallGrade: null,       // 'Grade 1 (well differentiated)' | ...
        },
        lymphovascularInvasion: null, // 'Not identified' | 'Present' | 'Cannot be determined'
        dermalLymphovascularInvasion: null,
        dcisAssociated: null,         // 'Present' | 'Not identified' | 'Cannot be determined'
        dcisExtentMm: null,
        dcisPercentage: null,         // <25% | 25–50% | >50%
        dcisGrade: null,
        dcisArchitecturalPatterns: [],
        dcisNecrosis: null,
        extensiveIntraductalComponent: null, // boolean (EIC)
        skinInvolvement: [],          // ['Paget disease','Dermal lymphovascular invasion','Skin/dermal invasion','Skin ulceration','Skin satellite nodules']
        nippleInvolvement: null,
        chestWallInvolvement: null,
        treatmentEffect: null,        // 'No known presurgical therapy' | 'No definite response...' | 'Probable or definite response...' | 'No residual invasive carcinoma...'
        treatmentEffectNodes: null,   // 'Not applicable' | 'No definite response...' | 'Probable or definite response...' | 'No lymph node metastases...'
      },
      margins: {
        // DCIS-mode margins:
        status: null,
        distanceMm: null,
        closestMargins: [],
        involvedMargins: [],
        // Invasive-mode margins:
        invasiveStatus: null,        // 'All margins negative for invasive carcinoma' | 'Invasive carcinoma present at margin' | 'Cannot be assessed'
        invasiveDistanceMm: null,
        invasiveClosestMargins: [],
        invasiveInvolvedMargins: [], // [{side, extent}]
        dcisStatus: null,            // 'All margins negative for DCIS' | 'DCIS present at margin' | 'No DCIS' | 'Cannot be assessed'
        dcisDistanceMm: null,
        dcisClosestMargins: [],
        dcisInvolvedMargins: [],
      },
      nodes: {
        status: 'Not applicable', // 'Not applicable' | 'Regional lymph nodes present'
        allNegative: null,
        macroCount: null,
        microCount: null,
        itcCount: null,
        largestDepositMm: null,
        extranodalExtension: null,    // 'Not identified' | 'Present, ≤2 mm' | 'Present, >2 mm' | 'Cannot be determined'
        totalExamined: null,
        sentinelExamined: null,
        nSuffix: [], // ['sn'], ['f']
      },
      metastasis: {
        distantSites: 'Not applicable',
        pmCategory: null, // 'Not applicable' | 'pM1'
      },
      stage: {
        ptCategory: null, // 'pTis (DCIS)' | 'pT1mi' | 'pT1a' | 'pT1b' | 'pT1c' | 'pT2' | 'pT3' | 'pT4a' | ...
        pnCategory: null,
        pmCategory: null,
        yPrefix: false,   // post-neoadjuvant (yp)
        rPrefix: false,   // recurrent
        mModifier: false, // multifocal (m)
      },
      additionalFindings: '',
      specialStudies: {
        // DCIS mode (free text since ER/PR/HER2 are sent out):
        erPrHer2Text: '',
        // Invasive mode (structured biomarkers performed on this specimen):
        biomarkersSource: null, // 'Performed on this specimen' | 'Performed on prior biopsy' | 'Pending'
        priorBiopsyAccession: '',
        er: {
          status: null,        // 'Positive' | 'Negative' | 'Cannot be determined'
          percentPositive: null,
          intensity: null,     // 'Weak' | 'Moderate' | 'Strong'
          internalControl: null, // 'Present, intact' | 'Absent' | 'Not applicable'
        },
        pr: {
          status: null,
          percentPositive: null,
          intensity: null,
          internalControl: null,
        },
        her2Ihc: {
          score: null,         // '0' | '1+' | '2+' | '3+' | 'Cannot be determined'
          interpretation: null,// 'Negative' | 'Equivocal' | 'Positive' | 'Cannot be determined'
        },
        her2Ish: {
          performed: null,     // boolean
          method: null,        // 'Dual-probe' | 'Single-probe'
          ratio: null,
          her2SignalsPerCell: null,
          cep17SignalsPerCell: null,
          interpretation: null,// 'Not amplified' | 'Amplified' | 'Equivocal' | 'Cannot be determined'
        },
        ki67Percent: null,
      },
    },
    ihc: [
      // { specimenLetter, block, antibody, finding, sentence, cpt }
    ],
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function cloneCase(c) {
  return JSON.parse(JSON.stringify(c));
}

export function setAtPath(obj, path, value) {
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
