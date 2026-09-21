export function createEmptyColonCase() {
  return {
    version: 1,
    organ: 'colon',
    mode: 'colon-resection',
    receivedDate: null,
    signoutDate: null,
    specimens: [],
    cap: {
      specimen: {
        procedure: null,
        procedureOther: '',
        mesorectumEval: null,
      },
      tumor: {
        site: [],
        rectalLocation: null,
        histologicType: null,
        histologicGrade: null,
        sizeCm: null,
        multiplePrimary: null,
        tumorExtent: null,
        submucosalInvasion: null,
        perforation: null,
        lvi: [],
        pni: null,
        tumorBudding: null,
        polyp: null,
        treatmentEffect: null,
        tumorComment: '',
      },
      margins: {
        invasiveStatus: null,
        closestMargins: [],
        closestDistanceCm: null,
        involvedMargins: [],
        nonInvasiveStatus: null,
        nonInvasiveInvolvedMargins: [],
        radialMarginCm: null,
        distalMarginCm: null,
        marginComment: '',
      },
      nodes: {
        status: null,
        nodesPositive: null,
        nodesExamined: null,
        tumorDeposits: null,
        tumorDepositCount: null,
        nodeComment: '',
      },
      metastasis: { sites: [] },
      stage: {
        ptCategory: null,
        pnCategory: null,
        pmCategory: null,
        yPrefix: false,
        rPrefix: false,
        mModifier: false,
      },
      additionalFindings: [],
      specialStudies: {
        mmrPerformed: false,
        mmrResult: null,
        mmrPending: false,
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

export function computeColonPT(tumorExtent) {
  if (!tumorExtent) return null;
  const e = tumorExtent.toLowerCase();
  if (e.includes('no evidence')) return 'pT0';
  if (e.includes('intramucosal') || e.includes('lamina propria')) return 'pTis';
  if (e.includes('submucosa')) return 'pT1';
  if (e.includes('through muscularis propria') || e.includes('pericolic') || e.includes('perirectal')) return 'pT3';
  if (e.includes('muscularis propria')) return 'pT2';
  if (e.includes('visceral peritoneum') || e.includes('perforation of the bowel')) return 'pT4a';
  if (e.includes('adjacent') || e.includes('adheres')) return 'pT4b';
  return null;
}

export function computeColonPN(nodesPositive, tumorDeposits, nodesExamined) {
  const pos = Number(nodesPositive) || 0;
  const hasDeposits = tumorDeposits === 'Present';
  if (nodesExamined == null && !hasDeposits) return null;
  if (pos === 0 && hasDeposits) return 'pN1c';
  if (pos === 0) return 'pN0';
  if (pos === 1) return 'pN1a';
  if (pos <= 3) return 'pN1b';
  if (pos <= 6) return 'pN2a';
  return 'pN2b';
}
