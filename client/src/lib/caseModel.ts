import type { CaseData, EndometrialCaseData, PathologyCaseData, ProstateCaseData, LungCaseData, PlacentaCaseData, KidneyCaseData, Mode } from './types';

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
        dcisExtentCategories: [],
        dcisAdmixedPercent: null,
        dcisExtentOther: '',
        dcisExtentCannotDetermine: '',
        dcisExtentMm: null,
        dcisPercentage: null,
        dcisGrade: null,
        dcisArchitecturalPatterns: [],
        dcisPatternOther: '',
        dcisNecrosis: null,
        dcisNecrosisCannotExclude: '',
        dcisComment: '',
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
        invasiveAtInk: [],
        invasiveLt1mm: [],
        invasive1to2mm: [],
        invasiveGt2mm: [],
        invasiveOther: '',
        invasiveComment: '',
        dcisStatus: null,
        dcisAtInk: [],
        dcisLt1mm: [],
        dcis1to2mm: [],
        dcisGt2mm: [],
        dcisOther: '',
        dcisComment: '',
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
      margins: { status: null, distanceQualifier: null, closestMm: null, closestLocations: [], involvedLocations: [] },
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
    mips: [],
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyLungCase(): LungCaseData {
  return {
    version: 1, organ: 'lung', mode: 'lung-resection', receivedDate: null,
    resectionType: null, treatmentStatus: 'p', laterality: null, lobe: null,
    histologicType: null, histologicTypeOther: '', mucinous: null,
    lepidic: null, lepidic_predominant: null, histologicPatterns: '',
    histologicGrade: null, patternDetails: null, iaslcGradeLabel: '', iaslcGradeRationale: '',
    invasiveSizeCm: null, totalSizeCm: null,
    pleuralInvasion: null, stas: null, lvi: null, lviSubtypes: [],
    adjacentStructureInvasion: false, adjacentStructures: [],
    multifocal: false, multifocalNodules: [], treatmentEffect: 'No known presurgical therapy',
    margins: { invasiveStatus: null, involvedMargins: [], closestMargin: '', closestDistanceCm: null, nonInvasiveStatus: null },
    nodes: { pnCategory: null, positiveStations: [], examinedStations: [], nodesPositive: null, nodesExamined: null, extranodalExtension: null, largestDepositMm: null },
    metastasis: { pmCategory: 'not_applicable', sites: [] },
    stage: { ptCategory: null, pnCategory: null, pmCategory: null, stageGroup: null, yPrefix: false, rPrefix: false, ptRationale: '', pnRationale: '' },
    additionalFindings: [],
    specialStudies: { molecularPending: false, molecularMarkers: [], ihcPerformed: false, ihcDescription: '' },
    primarySpecimenLetter: 'A', specimens: [],
    ihc: [], ihcModifier: '', mips: [], caseComment: '', reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyProstateCase(): ProstateCaseData {
  return {
    version:     1,
    organ:       'prostate',
    mode:        'prostate-biopsy',
    receivedDate: null,
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

export function createEmptyKidneyCase(): KidneyCaseData {
  return {
    version: 1,
    organ: 'kidney',
    mode: 'kidney-nephrectomy',
    receivedDate: null,
    signoutDate: null,
    specimens: [],
    cap: {
      specimen: { procedure: null, laterality: null, procedureOther: '' },
      tumor: {
        focality: null, multifocalCount: null, site: [], siteOther: '',
        sizeCm: null, otherSizesCm: [], sizeCannotBeDetermined: '',
        histologicType: null, histologicTypeOther: '',
        histologicGrade: null,
        tumorExtent: [],
        rhabdoidFeatures: null, rhabdoidPct: null,
        sarcomatoidFeatures: null, sarcomatoidPct: null,
        necrosis: null, necrosisPct: null,
        lvi: null, tumorComment: '',
      },
      margins: { status: null, involvedLocations: [], involvedOther: '', marginComment: '' },
      nodes: { status: null, nodesPositive: null, nodesExamined: null, sites: [], largestDepositCm: null, extranodalExtension: null },
      metastasis: { sites: [] },
      stage: { ptCategory: null, pnCategory: null, pmCategory: null, tSuffix: '', yPrefix: false, rPrefix: false },
      additionalFindings: '',
      specialStudies: { ihcPerformed: false, ihcDescription: '', molecularPending: false, molecularMarkers: [] },
    },
    caseComment: '',
    ihc: [],
    ihcModifier: '',
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyPlacentaCase(): PlacentaCaseData {
  return {
    version: 1,
    organ: 'placenta',
    mode: 'placenta-singleton',
    receivedDate: null,
    specimenDesignation: '',
    gestationalAgeWeeks: null,
    deliveryMethod: null,
    deliveryMethodOther: '',
    clinicalHistory: '',
    placentaWeightG: null,
    weightPercentile: null,
    cordVessels: 3,
    findings: {
      cord:         { normal: true, line: '' },
      membranes:    { normal: true, line: '' },
      disc:         { normal: true, line: '' },
      villiDecidua: { normal: true, line: '' },
    },
    additionalDiagnosisLines: [],
    caseComment: '',
    references: [
      'Khong TY, Mooney EE, Ariel I, et al. Sampling and Definitions of Placental Lesions: Amsterdam Placental Workshop Group Consensus Statement. Arch Pathol Lab Med. 2016;140(7):698-713.',
    ],
    cpt: '88307',
    reportText: '',
    updatedAt: new Date().toISOString(),
  };
}
