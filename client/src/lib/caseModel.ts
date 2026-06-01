import type { CaseData, EndometrialCaseData, PathologyCaseData, ProstateCaseData, Mode } from './types';

export function computeDCISStage(
  cap: CaseData['cap']
): { ptCategory: string | null; pnCategory: string | null } {
  const t = cap.tumor;
  const n = cap.nodes;

  let ptCategory: string | null = null;
  if (t.histologicType) {
    ptCategory = /paget/i.test(t.histologicType) ? 'pTis (Paget)' : 'pTis (DCIS)';
  }

  let pnCategory: string | null = null;
  if (/not applicable/i.test(n.status)) {
    pnCategory = 'pN not assigned (no nodes submitted or found)';
  } else if (n.status === 'Regional lymph nodes present') {
    const macro = Number(n.macroCount) || 0;
    const micro = Number(n.microCount) || 0;
    const itc   = Number(n.itcCount)   || 0;
    const exam  = Number(n.totalExamined) || 0;
    if      (macro >= 10)               pnCategory = 'pN3a';
    else if (macro >= 4)                pnCategory = 'pN2a';
    else if (macro >= 1)                pnCategory = 'pN1a';
    else if (micro >= 1)                pnCategory = 'pN1mi';
    else if (itc >= 1)                  pnCategory = 'pN0 (i+)';
    else if (exam > 0 || n.allNegative) pnCategory = 'pN0';
  }

  return { ptCategory, pnCategory };
}

export function computeInvasiveStage(
  cap: CaseData['cap']
): { ptCategory: string | null; pnCategory: string | null } {
  const t = cap.tumor;
  const n = cap.nodes;

  // pT
  let ptCategory: string | null = null;
  const skin = t.skinInvolvement || [];
  const hasSkinT4 = skin.includes('Skin ulceration') || skin.includes('Skin satellite nodules');
  const hasChestWall =
    t.chestWallInvolvement === 'Skeletal muscle invasion' ||
    t.chestWallInvolvement === 'Rib invasion';

  if (t.histologicType === 'Inflammatory carcinoma') {
    ptCategory = 'pT4d';
  } else if (hasSkinT4 && hasChestWall) {
    ptCategory = 'pT4c';
  } else if (hasSkinT4) {
    ptCategory = 'pT4b';
  } else if (hasChestWall) {
    ptCategory = 'pT4a';
  } else {
    const sizeMm =
      t.focality === 'Multiple foci of invasive carcinoma' && t.sizeOfLargestFocus != null
        ? t.sizeOfLargestFocus
        : t.invasiveSizeMm;
    if (sizeMm != null) {
      if      (sizeMm <= 1)  ptCategory = 'pT1mi';
      else if (sizeMm <= 5)  ptCategory = 'pT1a';
      else if (sizeMm <= 10) ptCategory = 'pT1b';
      else if (sizeMm <= 20) ptCategory = 'pT1c';
      else if (sizeMm <= 50) ptCategory = 'pT2';
      else                   ptCategory = 'pT3';
    }
  }

  // pN (identical logic to DCIS)
  let pnCategory: string | null = null;
  if (/not applicable/i.test(n.status)) {
    pnCategory = 'pN not assigned (no nodes submitted or found)';
  } else if (n.status === 'Regional lymph nodes present') {
    const macro = Number(n.macroCount) || 0;
    const micro = Number(n.microCount) || 0;
    const itc   = Number(n.itcCount)   || 0;
    const exam  = Number(n.totalExamined) || 0;
    if      (macro >= 10)               pnCategory = 'pN3a';
    else if (macro >= 4)                pnCategory = 'pN2a';
    else if (macro >= 1)                pnCategory = 'pN1a';
    else if (micro >= 1)                pnCategory = 'pN1mi';
    else if (itc >= 1)                  pnCategory = 'pN0 (i+)';
    else if (exam > 0 || n.allNegative) pnCategory = 'pN0';
  }

  return { ptCategory, pnCategory };
}

export function createEmptyCase(mode: Mode = 'excision-DCIS'): CaseData {
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
    specimens: [],
    cap: {
      specimen: { procedure: null, laterality: null, integrity: null },
      tumor: {
        site: [],
        histologicType: null,
        histologicTypeOther: '',
        sizeExtentMm: null,
        additionalDimMm: null,
        cannotDetermineSize: '',
        blocksWithDCIS: null,
        blocksExamined: null,
        architecturalPatterns: [],
        nuclearGrade: null,
        necrosis: null,
        microcalcifications: [],
        microcalcificationsOther: '',
        grossSizeMm: null,
        invasiveSizeMm: null,
        invasiveAdditionalDimMm: null,
        invasiveSizeCannotBeDetermined: '',
        focality: null,
        numberOfFoci: null,
        sizeOfLargestFocus: null,
        nottingham: {
          tubuleFormation: null,
          nuclearPleomorphism: null,
          mitoticCount: null,
          mitosesPer10HPF: null,
          fieldDiameterMm: null,
          totalScore: null,
          overallGrade: null,
        },
        lymphovascularInvasion: null,
        dermalLymphovascularInvasion: null,
        dcisAssociated: null,
        dcisExtentMm: null,
        dcisPercentage: null,
        dcisGrade: null,
        dcisArchitecturalPatterns: [],
        dcisNecrosis: null,
        extensiveIntraductalComponent: null,
        skinInvolvement: [],
        nippleInvolvement: null,
        chestWallInvolvement: null,
        treatmentEffect: null,
        treatmentEffectNodes: null,
      },
      margins: {
        status: null,
        distanceMm: null,
        closestMargins: [],
        involvedMargins: [],
        invasiveStatus: null,
        invasiveDistanceMm: null,
        invasiveClosestMargins: [],
        invasiveInvolvedMargins: [],
        dcisStatus: null,
        dcisDistanceMm: null,
        dcisClosestMargins: [],
        dcisInvolvedMargins: [],
      },
      nodes: {
        status: 'Not applicable',
        allNegative: null,
        macroCount: null,
        microCount: null,
        itcCount: null,
        largestDepositMm: null,
        extranodalExtension: null,
        totalExamined: null,
        sentinelExamined: null,
        nSuffix: [],
      },
      metastasis: { distantSites: 'Not applicable', pmCategory: null },
      stage: {
        ptCategory: null,
        pnCategory: null,
        pmCategory: null,
        yPrefix: false,
        rPrefix: false,
        mModifier: false,
      },
      additionalFindings: '',
      specialStudies: {
        erPrHer2Text: '',
        biomarkersSource: null,
        priorBiopsyAccession: '',
        er: { status: null, percentPositive: null, intensity: null, internalControl: null },
        pr: { status: null, percentPositive: null, intensity: null, internalControl: null },
        her2Ihc: { score: null, interpretation: null },
        her2Ish: {
          performed: null,
          method: null,
          ratio: null,
          her2SignalsPerCell: null,
          cep17SignalsPerCell: null,
          interpretation: null,
        },
        ki67Percent: null,
      },
    },
    ihc: [],
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyEndometrialCase(): EndometrialCaseData {
  return {
    version: 1,
    organ: 'endometrium',
    mode: 'hysterectomy',
    receivedDate: null,
    signoutDate: null,
    priorHistory: { clinicalHistory: '', previousBiopsyResult: '', radiologicFindings: '' },
    specimens: [],
    cap: {
      specimen: { procedure: null, integrity: null },
      tumor: {
        histologicType: null, histologicGrade: null, tumorSizeMm: null,
        myometrialInvasion: null, myometrialInvasionPercent: null, myometrialComment: '',
        adenomyosis: null, uterineSerosal: null, lowerUterineSegment: null,
        cervicalInvolvement: null, otherOrganInvolvement: '',
        peritonealWashings: null, lvi: null, lviFoci: null,
        fallopianTubes: null, ovaries: null, adnexalInvolvement: null,
      },
      margins: { status: null, closestMm: null, closestLocations: [], involvedLocations: [] },
      nodes: {
        pelvis: { status: null, macroCount: null, microCount: null, itcCount: null, totalExamined: null, sentinelExamined: null, largestDepositMm: null, laterality: [] },
        paraAortic: { status: null, macroCount: null, microCount: null, itcCount: null, totalExamined: null, sentinelExamined: null, largestDepositMm: null, laterality: [] },
        nSuffix: [],
      },
      metastasis: { sites: [] },
      stage: { ptCategory: null, pnCategory: null, pmCategory: null, figoStage2009: null, figoStage2023: null, yPrefix: false, rPrefix: false },
      additionalFindings: '',
      specialStudies: { biomarkersSource: null, er: null, pr: null, mmr: null, p53: null, representativeBlock: '' },
    },
    ihc: [],
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyProstateCase(): ProstateCaseData {
  return {
    version:     1,
    organ:       'prostate',
    mode:        'prostate-biopsy',
    receivedDate: null,
    priorHistory: { clinicalHistory: '', psaLevel: '', clinicalStage: '', imagingFindings: '' },
    procedure:   [],
    specimens:   [],
    periprosataticFatInvasion: null,
    seminalVesicleInvasion:    null,
    treatmentEffect:           null,
    caseComment:               '',
    reportText:  '',
    updatedAt:   new Date().toISOString(),
  };
}

export function createEmptyPathologyCase(): PathologyCaseData {
  return {
    version: 1,
    organ: 'pathology',
    mode: 'pathology',
    receivedDate: null,
    signoutDate: null,
    priorHistory: { clinicalHistory: '' },
    specimens: [],
    ihc: [],
    caseComment: '',
    ihcModifier: '',
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}
