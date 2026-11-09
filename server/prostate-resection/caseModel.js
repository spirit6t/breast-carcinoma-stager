/**
 * Case model for prostate radical prostatectomy.
 * CAP Protocol v4.3.0.0 (September 2023, AJCC 8th Edition)
 */

export function computeGradeGroup(primary, secondary) {
  if (!primary || !secondary) return null;
  if (primary === 3 && secondary === 3) return 1;
  if (primary === 3 && secondary === 4) return 2;
  if (primary === 4 && secondary === 3) return 3;
  const score = primary + secondary;
  if (score === 8) return 4;
  if (score >= 9) return 5;
  return null;
}

export function gradeGroupLabel(gg, primary, secondary) {
  if (!gg || !primary || !secondary) return null;
  const score = primary + secondary;
  return `Grade Group ${gg} (Gleason Score ${primary} + ${secondary} = ${score})`;
}

export function createEmptyProstateResectionCase() {
  return {
    organ: 'prostate-resection',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    specimens: [],
    cap: {
      specimen: {
        procedure: 'Radical prostatectomy',
        prostateWeightG: null,
        prostateSizeCm: null,
      },
      tumor: {
        histologicTypes: [],
        gleasonPrimary: null,
        gleasonSecondary: null,
        gleasonScore: null,
        gradeGroup: null,
        gradeGroupLabel: null,
        minorTertiaryPattern5: null,
        pattern4Pct: null,
        idc: null,
        idcIncorporatedIntoGrade: null,
        cribriformGlands: null,
        treatmentEffect: [],
        epe: null,
        epeLocations: [],
        bladderNeckInvasion: null,
        seminalVesicleInvasion: null,
        lvi: null,
        perineumralInvasion: null,
      },
      quantitation: {
        tumorPctInvolved: null,
        dominantNoduleMm: null,
        dominantNoduleLocation: null,
      },
      margins: {
        status: null,
        marginsInvolved: [],
        marginLinearMm: null,
        marginFocality: null,
        gleassonPatternAtMargin: [],
        marginInAreaOfEpe: null,
      },
      nodes: {
        status: null,
        nodesPositive: null,
        nodesExamined: null,
        nodalSitesWithTumor: [],
        extranodalExtension: null,
        nodeComment: null,
      },
      stage: {
        ptCategory: null,
        pnCategory: null,
        pmCategory: null,
        distantSitesStatus: null,
        distantSites: [],
        yPrefix: false,
        rPrefix: false,
      },
      additionalFindings: [],
    },
    caseComment: null,
  };
}
