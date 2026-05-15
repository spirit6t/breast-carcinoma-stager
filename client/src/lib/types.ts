export type Mode =
  | 'excision-DCIS'
  | 'excision-invasive'
  | 'biopsy-DCIS'
  | 'biopsy-invasive';

export interface Specimen {
  letter: string;
  designation: string;
  cpt: string | null;
  diagnosis: string;
}

export interface InvolvedMargin {
  side: string;
  extent?: string;
}

export interface IhcEntry {
  specimenLetter: string;
  block: string;
  antibody: string;
  finding: string;
  sentence: string;
}

export interface Nottingham {
  tubuleFormation: 1 | 2 | 3 | null;
  nuclearPleomorphism: 1 | 2 | 3 | null;
  mitoticCount: 1 | 2 | 3 | null;
  mitosesPer10HPF: number | null;
  fieldDiameterMm: number | null;
  totalScore: number | null;
  overallGrade: string | null;
}

export interface BiomarkerER {
  status: string | null;
  percentPositive: number | null;
  intensity: string | null;
  internalControl: string | null;
}

export interface BiomarkerHER2Ihc {
  score: string | null;
  interpretation: string | null;
}

export interface BiomarkerHER2Ish {
  performed: boolean | null;
  method: string | null;
  ratio: number | null;
  her2SignalsPerCell: number | null;
  cep17SignalsPerCell: number | null;
  interpretation: string | null;
}

export interface CaseData {
  version: number;
  mode: Mode;
  receivedDate: string | null;
  signoutDate: string | null;
  priorHistory: {
    previousBiopsyResult: string;
    previousBiopsyLocation: string;
    radiology: string;
    radiologicSizeMm: number | null;
    previousCarcinomaMarkers: string;
    clipType: string;
  };
  specimens: Specimen[];
  cap: {
    specimen: { procedure: string | null; laterality: string | null; integrity: string | null };
    tumor: {
      site: string[];
      histologicType: string | null;
      histologicTypeOther: string;
      sizeExtentMm: number | null;
      additionalDimMm: string | null;
      cannotDetermineSize: string;
      blocksWithDCIS: number | null;
      blocksExamined: number | null;
      architecturalPatterns: string[];
      nuclearGrade: string | null;
      necrosis: string | null;
      microcalcifications: string[];
      microcalcificationsOther: string;
      grossSizeMm: number | null;
      invasiveSizeMm: number | null;
      invasiveAdditionalDimMm: string | null;
      invasiveSizeCannotBeDetermined: string;
      focality: string | null;
      numberOfFoci: number | null;
      sizeOfLargestFocus: number | null;
      nottingham: Nottingham;
      lymphovascularInvasion: string | null;
      dermalLymphovascularInvasion: string | null;
      dcisAssociated: string | null;
      dcisExtentMm: number | null;
      dcisPercentage: string | null;
      dcisGrade: string | null;
      dcisArchitecturalPatterns: string[];
      dcisNecrosis: string | null;
      extensiveIntraductalComponent: boolean | null;
      skinInvolvement: string[];
      nippleInvolvement: string | null;
      chestWallInvolvement: string | null;
      treatmentEffect: string | null;
      treatmentEffectNodes: string | null;
    };
    margins: {
      status: string | null;
      distanceMm: number | null;
      closestMargins: string[];
      involvedMargins: InvolvedMargin[];
      invasiveStatus: string | null;
      invasiveDistanceMm: number | null;
      invasiveClosestMargins: string[];
      invasiveInvolvedMargins: InvolvedMargin[];
      dcisStatus: string | null;
      dcisDistanceMm: number | null;
      dcisClosestMargins: string[];
      dcisInvolvedMargins: InvolvedMargin[];
    };
    nodes: {
      status: string;
      allNegative: boolean | null;
      macroCount: number | string | null;
      microCount: number | string | null;
      itcCount: number | string | null;
      largestDepositMm: number | null;
      extranodalExtension: string | null;
      totalExamined: number | null;
      sentinelExamined: number | null;
      nSuffix: string[];
    };
    metastasis: { distantSites: string; pmCategory: string | null };
    stage: {
      ptCategory: string | null;
      pnCategory: string | null;
      pmCategory: string | null;
      yPrefix: boolean;
      rPrefix: boolean;
      mModifier: boolean;
    };
    additionalFindings: string;
    specialStudies: {
      erPrHer2Text: string;
      biomarkersSource: string | null;
      priorBiopsyAccession: string;
      er: BiomarkerER;
      pr: BiomarkerER;
      her2Ihc: BiomarkerHER2Ihc;
      her2Ish: BiomarkerHER2Ish;
      ki67Percent: number | null;
    };
  };
  ihc: IhcEntry[];
  reportText: string;
  updatedAt: string;
}

export interface Settings {
  provider: 'anthropic' | 'openai';
  claudeApiKey: string;
  openaiApiKey: string;
  claudeModel: string;
  openaiModel: string;
}

