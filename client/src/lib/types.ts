export type Mode =
  | 'excision-DCIS'
  | 'excision-invasive'
  | 'biopsy-DCIS'
  | 'biopsy-invasive';

export interface Specimen {
  letter: string;
  designation: string;
  cpt: string | null;
  cptAddons?: string[];
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

export interface EndometrialCaseData {
  version: number;
  organ: 'endometrium';
  mips?: Array<{ measureNumber: string; code: string; codeLabel: string }>;
  mode: string;
  receivedDate: string | null;
  signoutDate: string | null;
  priorHistory: { clinicalHistory: string; previousBiopsyResult: string; radiologicFindings: string };
  specimens: Specimen[];
  cap: {
    specimen: { procedure: string | null; integrity: string | null };
    tumor: {
      histologicType: string | null;
      histologicGrade: string | null;
      tumorSizeMm: number | null;
      myometrialInvasion: string | null;
      myometrialInvasionPercent: number | null;
      myometrialComment: string;
      adenomyosis: string | null;
      uterineSerosal: string | null;
      lowerUterineSegment: string | null;
      cervicalInvolvement: string | null;
      otherOrganInvolvement: string;
      peritonealWashings: string | null;
      lvi: string | null;
      lviFoci: number | null;
      fallopianTubes: string | null;
      ovaries: string | null;
      adnexalInvolvement: string | null;
    };
    margins: { status: string | null; closestMm: number | null; closestLocations: string[]; involvedLocations: string[] };
    nodes: {
      pelvis: { status: string | null; macroCount: number | null; microCount: number | null; itcCount: number | null; totalExamined: number | null; sentinelExamined: number | null; largestDepositMm: number | null; laterality: string[] };
      paraAortic: { status: string | null; macroCount: number | null; microCount: number | null; itcCount: number | null; totalExamined: number | null; sentinelExamined: number | null; largestDepositMm: number | null; laterality: string[] };
      nSuffix: string[];
    };
    metastasis: { sites: string[] };
    stage: { ptCategory: string | null; pnCategory: string | null; pmCategory: string | null; figoStage2009: string | null; figoStage2023: string | null; yPrefix: boolean; rPrefix: boolean };
    additionalFindings: string;
    specialStudies: { biomarkersSource: string | null; er: string | null; pr: string | null; mmr: string | null; p53: string | null; representativeBlock: string };
  };
  ihc: IhcEntry[];
  reportText: string;
  updatedAt: string;
}

export interface PathologySpecimen {
  letter: string;
  designation: string;
  specimenCategory: 'surgical' | 'cytology' | null;
  organ: string;
  grossDescription: string;
  diagnosisLine: string;
  diagnosisLines: string[];
  comment: string;
  commentSource: 'airtable' | 'ai' | 'manual' | null;
  markers: {
    status: 'pending' | 'available' | null;
    list: string[];     // e.g. ["ER", "PR", "HER2", "KI-67"]
    results: string;    // e.g. "ER POSITIVE (90%), PR POSITIVE, HER2 NEGATIVE (1+), KI-67 25%"
  } | null;
  mips: Array<{
    measureNumber: string;  // e.g. "491"
    code: string;           // e.g. "M1193"
    codeLabel: string;      // human-readable label
  }>;
  cpt: string | null;
  cptAddons: string[];
}

export interface PathologyCaseData {
  version: number;
  organ: 'pathology';
  mode: 'pathology';
  receivedDate: string | null;
  signoutDate: string | null;
  priorHistory: { clinicalHistory: string };
  specimens: PathologySpecimen[];
  ihc: IhcEntry[];
  caseComment: string;   // combined cytology comment rendered once at end of Final Diagnosis
  ihcModifier: string;  // '' = global billing; '-26' = professional component only
  reportText: string;
  updatedAt: string;
}

export interface ProstateBiopsySpecimen {
  letter:        string;
  designation:   string;
  location:      string;
  hasCarcinoma:  boolean | 'atypical' | null;
  histologicType:             string;
  gleasonPrimary:             number | null;
  gleasonSecondary:           number | null;
  gleasonScore:               number | null;
  gradeGroup:                 number | null;
  gradeGroupLabel:            string;
  pattern4Pct:                string;
  pattern4PctNumeric:         number | null;
  pattern5PctNumeric:         number | null;
  idc:                        string;
  idcIncorporatedIntoGrade:   string;
  cribriformGlands:           string;
  coresTotal:                 number | null;
  coresPositive:              number | null;
  corePctInvolvement:         number[];
  perineumralInvasion:        string | null;
  lvi:                        string | null;
  additionalFindings:         string[];
  pin4Performed:              boolean;
  pin4Block:                  string;
  pin4Result:                 string;
  mips: Array<{ measureNumber: string; code: string; codeLabel: string }>;
  cpt:                        string;
  cptAddons:                  string[];
}

export interface ProstateCaseData {
  version:     number;
  organ:       'prostate';
  mode:        'prostate-biopsy';
  receivedDate: string | null;
  procedure:   string[];
  specimens:   ProstateBiopsySpecimen[];
  periprosataticFatInvasion: string | null;
  seminalVesicleInvasion:    string | null;
  treatmentEffect:           string | null;
  caseComment:               string;
  reportText:  string;
  updatedAt:   string;
}

export interface LungCaseData {
  version: number;
  organ: 'lung';
  mode: 'lung-resection';
  receivedDate: string | null;
  resectionType: string | null;
  treatmentStatus: string;
  laterality: string | null;
  lobe: string | null;
  histologicType: string | null;
  histologicTypeOther: string;
  mucinous: boolean | null;
  lepidic: boolean | null;
  lepidic_predominant: boolean | null;
  histologicPatterns: string;
  histologicGrade: string | null;
  patternDetails: Record<string, number> | null;
  iaslcGradeLabel: string;
  iaslcGradeRationale: string;
  invasiveSizeCm: number | null;
  totalSizeCm: number | null;
  pleuralInvasion: string | null;
  stas: string | null;
  lvi: string | null;
  lviSubtypes: string[];
  adjacentStructureInvasion: boolean;
  adjacentStructures: string[];
  multifocal: boolean;
  multifocalNodules: Array<{ location: string; sizeCm: number; sameLobe: boolean }>;
  treatmentEffect: string;
  margins: {
    invasiveStatus: string | null;
    involvedMargins: string[];
    closestMargin: string;
    closestDistanceCm: number | null;
    nonInvasiveStatus: string | null;
  };
  nodes: {
    pnCategory: string | null;
    positiveStations: string[];
    examinedStations: string[];
    nodesPositive: number | null;
    nodesExamined: number | null;
    extranodalExtension: string | null;
    largestDepositMm: number | null;
  };
  metastasis: { pmCategory: string; sites: string[] };
  stage: {
    ptCategory: string | null;
    pnCategory: string | null;
    pmCategory: string | null;
    stageGroup: string | null;
    yPrefix: boolean;
    rPrefix: boolean;
    ptRationale: string;
    pnRationale: string;
  };
  additionalFindings: string[];
  specialStudies: {
    molecularPending: boolean;
    molecularMarkers: string[];
    ihcPerformed: boolean;
    ihcDescription: string;
  };
  primarySpecimenLetter: string;
  specimens: Array<{
    letter: string;
    designation: string;
    isPrimary: boolean;
    cpt: string;
    cptLabel: string;
    cptAddons: string[];
    diagnosisLines: string[];
    comment: string;
  }>;
  ihc: IhcEntry[];
  ihcModifier: string;
  mips: Array<{ measureNumber: string; code: string; codeLabel: string }>;
  caseComment: string;
  reportText: string;
  updatedAt: string;
}

export interface PlacentaComponentFinding {
  normal: boolean;
  line: string;
}

export interface PlacentaWeightPercentile {
  weeks: number;
  weightG: number;
  band: string | null;
  label: string;
  isSmall: boolean;
  isLarge: boolean;
  p10: number | null;
  p90: number | null;
  source: 'A-1' | 'A-2' | null;
  outOfRange?: boolean;
}

export interface PlacentaCaseData {
  version: number;
  organ: 'placenta';
  mode: 'placenta-singleton';
  receivedDate: string | null;
  specimenDesignation: string;
  gestationalAgeWeeks: number | null;
  deliveryMethod: 'vaginal' | 'assisted_vaginal' | 'cesarean' | 'other' | null;
  deliveryMethodOther: string;
  clinicalHistory: string;
  placentaWeightG: number | null;
  weightPercentile: PlacentaWeightPercentile | null;
  cordVessels: number;
  findings: {
    cord: PlacentaComponentFinding;
    membranes: PlacentaComponentFinding;
    disc: PlacentaComponentFinding;
    villiDecidua: PlacentaComponentFinding;
  };
  additionalDiagnosisLines: string[];
  caseComment: string;
  references: string[];
  cpt: string;
  reportText: string;
  updatedAt: string;
}

export type AnyCase = CaseData | EndometrialCaseData | PathologyCaseData | ProstateCaseData | LungCaseData | PlacentaCaseData;

export interface Settings {
  provider: 'anthropic' | 'openai';
  claudeApiKey: string;
  openaiApiKey: string;
  claudeModel: string;
  openaiModel: string;
}

