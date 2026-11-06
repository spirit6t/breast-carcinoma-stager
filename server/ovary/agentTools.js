import { createEmptyOvaryCase } from './caseModel.js';

export const OVARY_SYSTEM_PROMPT = `You are a surgical pathology assistant helping a pathologist complete a CAP v1.5.0.0 synoptic report for ovary, fallopian tube, or primary peritoneum malignancy (AJCC 8th Edition / FIGO 2021).

INTERVIEW STRUCTURE — work through these blocks in order. Do not skip ahead.

BLOCK 1 — PROCEDURE & SPECIMENS
Ask: What procedure was performed and what specimens were submitted?
Common procedures: total hysterectomy + bilateral salpingo-oophorectomy, bilateral salpingo-oophorectomy, unilateral salpingo-oophorectomy (specify side), omentectomy, peritoneal biopsies, peritoneal debulking.
Assign CPT: 88309 for hysterectomy with adnexa; 88307 for salpingo-oophorectomy alone or omentectomy; 88305 for peritoneal biopsies or lymph nodes (separate specimens).
If hysterectomy was performed, ask the hysterectomy type: Abdominal / Vaginal / Vaginal, laparoscopic-assisted / Laparoscopic / Laparoscopic, robotic-assisted / Other / Not specified.
Ask per-organ specimen integrity:
  - Right ovary (if submitted): Capsule intact / Capsule ruptured (→ Preoperative / Intraoperative / Unknown) / Fragmented / Not applicable
  - Left ovary (if submitted): same options
  - Right fallopian tube (if submitted): Serosa intact / Serosa ruptured / Fragmented
  - Left fallopian tube (if submitted): same options
  - Uterus (if hysterectomy): Intact / Opened / Morcellated
Call set_specimen (include procedure + hysterectomyType + all per-organ integrity fields).

BLOCK 2 — TUMOR
Ask: What is the primary tumor site? (right ovary, left ovary, bilateral ovaries, right fallopian tube, left fallopian tube, bilateral fallopian tubes, right tubo-ovarian, left tubo-ovarian, bilateral tubo-ovarian, primary peritoneum)
Ask: Histologic type? (high-grade serous carcinoma, low-grade serous carcinoma, endometrioid carcinoma, clear cell carcinoma, mucinous adenocarcinoma, carcinosarcoma, immature teratoma, dysgerminoma, granulosa cell tumor, etc.)
Ask: Grade if applicable (endometrioid/mucinous: G1/G2/G3; immature teratoma: grade 1/2/3)
Ask: Tumor size in cm.
Call set_tumor.

BLOCK 3 — EXTENT
Ask: Is there ovarian or fallopian tube surface involvement?
Ask (serous or seromucinous borderline tumors / advanced-stage): Are implants present?
  Options: Not applicable / Not sampled / Not identified / Present (specify sites) / Indeterminate
  (Note: serous borderline implants formerly classified as "invasive" are now considered extraovarian low-grade serous carcinoma)
Ask: What other organs/structures are involved? (uterine corpus, uterine cervix, pelvic peritoneum, abdominal peritoneum, omentum, bowel — select all that apply)
Ask: Largest extrapelvic peritoneal focus — microscopic, macroscopic ≤2 cm, or macroscopic >2 cm?
Ask: Peritoneal/ascitic fluid — negative, malignant cells present, or not submitted?
Call set_extent.

BLOCK 4 — LYMPH NODES
Ask: Were regional lymph nodes submitted?
  Options: Not applicable (no regional lymph nodes submitted or found) / All regional lymph nodes negative for tumor cells / Tumor present in regional lymph node(s)
Ask: Total number of lymph nodes examined.
Ask: Nodal site(s) examined (select all: Right pelvic / Left pelvic / Pelvic NOS / Right para-aortic / Left para-aortic / Para-aortic NOS / Other).
If tumor present:
  Ask: Number of positive nodes total.
  Ask: Number of nodes with metastasis GREATER THAN 10 mm.
  Ask: Number of nodes with metastasis 10 mm OR LESS (excluding ITCs).
  Ask: Number of nodes with isolated tumor cells (0.2 mm or less) — only if no metastasis >0.2 mm in other nodes.
  Ask: Nodal site(s) with tumor (select all that apply, same options as above).
  Ask: Size of largest nodal metastatic deposit (in mm).
  Ask: Location of largest nodal metastatic deposit.
Call set_nodes.

BLOCK 5 — PATHOLOGIC STAGE
Assign pT based on extent:
  pT1a: limited to one ovary, capsule intact, no surface tumor, no malignant cells in fluids
  pT1b: limited to both ovaries, capsules intact
  pT1c1: surgical spill
  pT1c2: capsule ruptured before surgery or surface tumor
  pT1c3: malignant cells in ascites or peritoneal washings
  pT2a: extension/implants on uterus/FT/ovaries
  pT2b: extension to other pelvic tissues
  pT3a: microscopic extrapelvic peritoneal involvement ± retroperitoneal nodes
  pT3b: macroscopic peritoneal metastasis ≤2 cm
  pT3c: macroscopic peritoneal metastasis >2 cm (includes liver/splenic capsule)
Assign pN: pN0 / pN0(i+) / pN1a (≤10mm) / pN1b (>10mm)
Assign pM if applicable: pM1a (pleural effusion + cytology) / pM1b (liver/splenic parenchyma; extra-abdominal organs)
Assign FIGO 2021 stage.
Call set_stage.

BLOCK 6 — SPECIAL STUDIES
Ask: Was p53 IHC performed? Result? (normal/wild-type, abnormal/overexpression, abnormal/null, abnormal/cytoplasmic)
If neoadjuvant therapy: was CRS (Chemotherapy Response Score) assessed? (CRS1/CRS2/CRS3)
Ask about any other pending molecular or biomarker studies.
Call set_special_studies.

BLOCK 7 — UTERINE FINDINGS (required when procedure includes hysterectomy)
If the uterus was part of the specimen, ask about each component in this order:
  Cervix — default "Negative for dysplasia" unless otherwise specified
  Endometrium — describe pattern (e.g., Atrophic endometrium / Proliferative endometrium / Endometrial polyp / Inactive endometrium)
  Myometrium — describe findings (e.g., Leiomyomata / Adenomyosis / No significant pathology); always mention leiomyomata if present
  Fallopian tube — describe findings if included with uterus (e.g., Unremarkable / STIC / Carcinoma involvement)
  Serosa — default "Histologically unremarkable" unless tumor involved
Call set_uterine_findings.

BLOCK 8 — ADDITIONAL FINDINGS
Ask: Any other additional findings? (STIC in separate FT specimen, endometriosis, endosalpingiosis, other)
Call set_additional_findings if relevant.
Call set_case_comment if there is a free-text comment.

BLOCK 9 — ASSEMBLE
Call assemble_report to generate the final report.

RULES:
- Always use set_stage AFTER set_extent and set_nodes.
- If the tumor is high-grade serous carcinoma, do NOT ask for grade (not applicable per WHO).
- For bilateral disease, report the size of the largest malignant tumor.
- If neoadjuvant therapy was given, prepend 'y' prefix to stage.
- MULTI-SPECIMEN REPORTS: The full tumor workup (type, grade, size, extent, nodes, stage, FIGO, uterine findings, SEE CASE SUMMARY, PENDING) is rendered automatically for the PRIMARY specimen — the one set via set_specimen. For all separately submitted secondary specimens that are involved by tumor (omentum, peritoneal biopsies, pelvic or para-aortic lymph node packets, contralateral adnexa submitted as a separate specimen, etc.), call add_secondary_specimen with a BRIEF UPPERCASE diagnosis only. Use formats such as: 'METASTATIC HIGH-GRADE SEROUS CARCINOMA', 'INVOLVED BY CARCINOMA', or 'METASTATIC CARCINOMA IN 2 OF 5 LYMPH NODES (2/5)'. Never include size, staging, FIGO stage, or uterine findings in a secondary specimen diagnosis — those details appear only under the primary specimen.`;

export const OVARY_TOOL_SCHEMAS = [
  {
    name: 'set_specimen',
    description: 'Set procedure performed, specimens submitted, hysterectomy type, and per-organ specimen integrity.',
    input_schema: {
      type: 'object',
      properties: {
        specimens: {
          type: 'array',
          description: 'List of specimen parts',
          items: {
            type: 'object',
            properties: {
              letter: { type: 'string' },
              designation: { type: 'string' },
              cpt: { type: 'string' },
              cptAddons: { type: 'array', items: { type: 'string' } },
            },
            required: ['letter', 'designation'],
          },
        },
        procedure: { type: 'string', description: 'Primary procedure description' },
        hysterectomyType: { type: 'string', description: 'Abdominal / Vaginal / Vaginal, laparoscopic-assisted / Laparoscopic / Laparoscopic, robotic-assisted / Other / Not specified' },
        rightOvaryIntegrity: { type: 'string', description: 'Capsule intact / Capsule ruptured / Fragmented / Not applicable' },
        rightOvaryRuptureTime: { type: 'string', description: 'Preoperative / Intraoperative / Unknown (only when capsule ruptured)' },
        leftOvaryIntegrity: { type: 'string', description: 'Capsule intact / Capsule ruptured / Fragmented / Not applicable' },
        leftOvaryRuptureTime: { type: 'string', description: 'Preoperative / Intraoperative / Unknown (only when capsule ruptured)' },
        rightFTIntegrity: { type: 'string', description: 'Serosa intact / Serosa ruptured / Fragmented' },
        leftFTIntegrity: { type: 'string', description: 'Serosa intact / Serosa ruptured / Fragmented' },
        uterusIntegrity: { type: 'string', description: 'Intact / Opened / Morcellated (when hysterectomy performed)' },
      },
      required: ['specimens', 'procedure'],
    },
  },
  {
    name: 'set_tumor',
    description: 'Set tumor site, histologic type, grade, size, and specimen integrity.',
    input_schema: {
      type: 'object',
      properties: {
        site: { type: 'string', description: 'Primary tumor site (e.g., right fallopian tube, bilateral ovaries)' },
        histologicType: { type: 'string' },
        histologicGrade: { type: 'string', description: 'Grade if applicable (not for high-grade serous)' },
        sizeCm: { type: 'number', description: 'Greatest dimension in cm' },
        tumorComment: { type: 'string' },
      },
      required: ['site', 'histologicType'],
    },
  },
  {
    name: 'set_extent',
    description: 'Set surface involvement, organ involvement, peritoneal disease, and ascitic fluid.',
    input_schema: {
      type: 'object',
      properties: {
        ovarianSurfaceInvolvement: { type: 'string', description: 'Not identified / Present right / Present left / Present bilateral' },
        ftSurfaceInvolvement: { type: 'string', description: 'Not identified / Present right / Present left / Present bilateral' },
        otherOrganInvolvement: { type: 'array', items: { type: 'string' }, description: 'e.g., [uterine corpus, omentum, pelvic peritoneum]' },
        largestExtrapelvicFocus: { type: 'string', description: 'Not applicable / Microscopic / Macroscopic ≤2 cm / Macroscopic >2 cm' },
        peritonealCytology: { type: 'string', description: 'Negative / Malignant cells present / Not submitted' },
        implants: { type: 'string', description: 'Not applicable / Not sampled / Not identified / Present (specify sites) / Indeterminate' },
        crs: { type: 'string', description: 'CRS1 / CRS2 / CRS3 (neoadjuvant cases only)' },
      },
    },
  },
  {
    name: 'set_nodes',
    description: 'Set regional lymph node status per CAP terminology.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Not applicable (no regional lymph nodes submitted or found) / All regional lymph nodes negative for tumor cells / Tumor present in regional lymph node(s)' },
        nodesPositive: { type: 'number', description: 'Total number of positive nodes' },
        nodesExamined: { type: 'number', description: 'Total number of lymph nodes examined' },
        nodesGt10mm: { type: 'number', description: 'Number of nodes with metastasis greater than 10 mm' },
        nodesLe10mm: { type: 'number', description: 'Number of nodes with metastasis 10 mm or less (excluding ITCs)' },
        nodesItc: { type: 'number', description: 'Number of nodes with isolated tumor cells (0.2 mm or less) — required only if no metastasis >0.2 mm in other nodes' },
        nodalSitesWithTumor: { type: 'array', items: { type: 'string' }, description: 'e.g., ["Right pelvic", "Left para-aortic"]' },
        largestDepositMm: { type: 'string', description: 'Size of largest nodal metastatic deposit, e.g., "12 mm", "At least 8 mm"' },
        largestDepositLocation: { type: 'string', description: 'Location of largest nodal metastatic deposit, e.g., "Right pelvic", "Left para-aortic"' },
        nodalSitesExamined: { type: 'array', items: { type: 'string' }, description: 'e.g., ["Pelvic, NOS", "Para-aortic, NOS"]' },
        nodeComment: { type: 'string' },
      },
      required: ['status'],
    },
  },
  {
    name: 'set_stage',
    description: 'Set pT, pN, pM categories and FIGO 2021 stage.',
    input_schema: {
      type: 'object',
      properties: {
        ptCategory: { type: 'string', description: 'pT1a / pT1b / pT1c1 / pT1c2 / pT1c3 / pT2a / pT2b / pT3a / pT3b / pT3c' },
        pnCategory: { type: 'string', description: 'pN0 / pN0(i+) / pN1a / pN1b' },
        pmCategory: { type: 'string', description: 'pM1a / pM1b / Not applicable' },
        figoStage: { type: 'string', description: 'FIGO 2021: IA / IB / IC1 / IC2 / IC3 / IIA / IIB / IIIA1(i) / IIIA1(ii) / IIIA2 / IIIB / IIIC / IVA / IVB' },
        yPrefix: { type: 'boolean', description: 'Post-neoadjuvant therapy prefix' },
        rPrefix: { type: 'boolean', description: 'Recurrence prefix' },
      },
      required: ['ptCategory'],
    },
  },
  {
    name: 'set_special_studies',
    description: 'Set p53 IHC result, CRS, and pending studies.',
    input_schema: {
      type: 'object',
      properties: {
        p53Status: { type: 'string', description: 'Normal (wild-type) / Abnormal - overexpression / Abnormal - null / Abnormal - cytoplasmic' },
        p53Pending: { type: 'boolean' },
        additionalPending: { type: 'array', items: { type: 'string' }, description: 'e.g., [BRCA1/2 molecular testing, MSI]' },
      },
    },
  },
  {
    name: 'set_uterine_findings',
    description: 'Set uterine findings when hysterectomy was performed. Reports cervix, endometrium, myometrium, fallopian tube, and serosa.',
    input_schema: {
      type: 'object',
      properties: {
        cervix:        { type: 'string', description: 'e.g., Negative for dysplasia' },
        endometrium:   { type: 'string', description: 'e.g., Atrophic endometrium / Proliferative endometrium / Endometrial polyp' },
        myometrium:    { type: 'string', description: 'e.g., Leiomyomata / Adenomyosis / No significant pathology' },
        fallopianTube: { type: 'string', description: 'e.g., Unremarkable / STIC / Tumor involvement' },
        serosa:        { type: 'string', description: 'e.g., Histologically unremarkable / Tumor involvement' },
      },
      required: ['cervix', 'endometrium', 'myometrium', 'serosa'],
    },
  },
  {
    name: 'set_additional_findings',
    description: 'Set additional pathologic findings.',
    input_schema: {
      type: 'object',
      properties: {
        findings: {
          type: 'array',
          items: { type: 'string' },
          description: 'e.g., [STIC right fallopian tube, Endometriosis, Endosalpingiosis]',
        },
      },
      required: ['findings'],
    },
  },
  {
    name: 'set_case_comment',
    description: 'Set a free-text case comment.',
    input_schema: {
      type: 'object',
      properties: { comment: { type: 'string' } },
      required: ['comment'],
    },
  },
  {
    name: 'add_secondary_specimen',
    description: 'Add a secondary specimen (e.g., separate lymph node packet, omentum) with its own diagnosis.',
    input_schema: {
      type: 'object',
      properties: {
        letter: { type: 'string' },
        designation: { type: 'string' },
        diagnosis: { type: 'string' },
        cpt: { type: 'string' },
      },
      required: ['letter', 'designation', 'diagnosis'],
    },
  },
  {
    name: 'assemble_report',
    description: 'Assemble and return the final pathology report.',
    input_schema: { type: 'object', properties: {} },
  },
];

export async function executeOvaryTool(toolName, toolInput, caseData) {
  if (!caseData || caseData.organ !== 'ovary') {
    caseData = createEmptyOvaryCase();
  }

  switch (toolName) {
    case 'set_specimen': {
      const { specimens, procedure, hysterectomyType,
              rightOvaryIntegrity, rightOvaryRuptureTime,
              leftOvaryIntegrity, leftOvaryRuptureTime,
              rightFTIntegrity, leftFTIntegrity, uterusIntegrity } = toolInput;
      caseData.specimens = specimens.map(s => ({ ...s, cptAddons: s.cptAddons || [] }));
      caseData.cap.specimen.procedure = procedure;
      if (hysterectomyType !== undefined) caseData.cap.specimen.hysterectomyType = hysterectomyType;
      if (rightOvaryIntegrity !== undefined) caseData.cap.specimen.rightOvaryIntegrity = rightOvaryIntegrity;
      if (rightOvaryRuptureTime !== undefined) caseData.cap.specimen.rightOvaryRuptureTime = rightOvaryRuptureTime;
      if (leftOvaryIntegrity !== undefined) caseData.cap.specimen.leftOvaryIntegrity = leftOvaryIntegrity;
      if (leftOvaryRuptureTime !== undefined) caseData.cap.specimen.leftOvaryRuptureTime = leftOvaryRuptureTime;
      if (rightFTIntegrity !== undefined) caseData.cap.specimen.rightFTIntegrity = rightFTIntegrity;
      if (leftFTIntegrity !== undefined) caseData.cap.specimen.leftFTIntegrity = leftFTIntegrity;
      if (uterusIntegrity !== undefined) caseData.cap.specimen.uterusIntegrity = uterusIntegrity;
      return { success: true, specimens: caseData.specimens };
    }

    case 'set_tumor': {
      const { site, histologicType, histologicGrade, sizeCm, tumorComment } = toolInput;
      caseData.cap.tumor.site = site ?? caseData.cap.tumor.site;
      caseData.cap.tumor.histologicType = histologicType ?? caseData.cap.tumor.histologicType;
      caseData.cap.tumor.histologicGrade = histologicGrade ?? caseData.cap.tumor.histologicGrade;
      caseData.cap.tumor.sizeCm = sizeCm ?? caseData.cap.tumor.sizeCm;
      caseData.cap.tumor.tumorComment = tumorComment ?? caseData.cap.tumor.tumorComment;
      return { success: true, tumor: caseData.cap.tumor };
    }

    case 'set_extent': {
      const { ovarianSurfaceInvolvement, ftSurfaceInvolvement, otherOrganInvolvement,
              largestExtrapelvicFocus, peritonealCytology, implants, crs } = toolInput;
      if (ovarianSurfaceInvolvement !== undefined) caseData.cap.tumor.ovarianSurfaceInvolvement = ovarianSurfaceInvolvement;
      if (ftSurfaceInvolvement !== undefined) caseData.cap.tumor.ftSurfaceInvolvement = ftSurfaceInvolvement;
      if (otherOrganInvolvement !== undefined) caseData.cap.tumor.otherOrganInvolvement = otherOrganInvolvement;
      if (largestExtrapelvicFocus !== undefined) caseData.cap.tumor.largestExtrapelvicFocus = largestExtrapelvicFocus;
      if (peritonealCytology !== undefined) caseData.cap.tumor.peritonealCytology = peritonealCytology;
      if (implants !== undefined) caseData.cap.tumor.implants = implants;
      if (crs !== undefined) caseData.cap.tumor.crs = crs;
      return { success: true };
    }

    case 'set_nodes': {
      const { status, nodesPositive, nodesExamined, nodesGt10mm, nodesLe10mm, nodesItc,
              nodalSitesWithTumor, largestDepositMm, largestDepositLocation,
              nodalSitesExamined, nodeComment } = toolInput;
      caseData.cap.nodes.status = status;
      if (nodesPositive !== undefined) caseData.cap.nodes.nodesPositive = nodesPositive;
      if (nodesExamined !== undefined) caseData.cap.nodes.nodesExamined = nodesExamined;
      if (nodesGt10mm !== undefined) caseData.cap.nodes.nodesGt10mm = nodesGt10mm;
      if (nodesLe10mm !== undefined) caseData.cap.nodes.nodesLe10mm = nodesLe10mm;
      if (nodesItc !== undefined) caseData.cap.nodes.nodesItc = nodesItc;
      if (nodalSitesWithTumor !== undefined) caseData.cap.nodes.nodalSitesWithTumor = nodalSitesWithTumor;
      if (largestDepositMm !== undefined) caseData.cap.nodes.largestDepositMm = largestDepositMm;
      if (largestDepositLocation !== undefined) caseData.cap.nodes.largestDepositLocation = largestDepositLocation;
      if (nodalSitesExamined !== undefined) caseData.cap.nodes.nodalSitesExamined = nodalSitesExamined;
      if (nodeComment !== undefined) caseData.cap.nodes.nodeComment = nodeComment;
      return { success: true, nodes: caseData.cap.nodes };
    }

    case 'set_stage': {
      const { ptCategory, pnCategory, pmCategory, figoStage, yPrefix, rPrefix } = toolInput;
      caseData.cap.stage.ptCategory = ptCategory ?? caseData.cap.stage.ptCategory;
      caseData.cap.stage.pnCategory = pnCategory ?? caseData.cap.stage.pnCategory;
      caseData.cap.stage.pmCategory = pmCategory ?? caseData.cap.stage.pmCategory;
      caseData.cap.stage.figoStage = figoStage ?? caseData.cap.stage.figoStage;
      if (yPrefix !== undefined) caseData.cap.stage.yPrefix = yPrefix;
      if (rPrefix !== undefined) caseData.cap.stage.rPrefix = rPrefix;
      return { success: true, stage: caseData.cap.stage };
    }

    case 'set_special_studies': {
      const { p53Status, p53Pending, additionalPending } = toolInput;
      if (p53Status !== undefined) caseData.cap.specialStudies.p53Status = p53Status;
      if (p53Pending !== undefined) caseData.cap.specialStudies.p53Pending = p53Pending;
      if (additionalPending !== undefined) caseData.cap.specialStudies.additionalPending = additionalPending;
      return { success: true };
    }

    case 'set_uterine_findings': {
      const { cervix, endometrium, myometrium, fallopianTube, serosa } = toolInput;
      caseData.cap.uterineFindings = { cervix, endometrium, myometrium, fallopianTube: fallopianTube || null, serosa };
      return { success: true };
    }

    case 'set_additional_findings': {
      caseData.cap.additionalFindings = toolInput.findings || [];
      return { success: true };
    }

    case 'set_case_comment': {
      caseData.caseComment = toolInput.comment;
      return { success: true };
    }

    case 'add_secondary_specimen': {
      const { letter, designation, diagnosis, cpt } = toolInput;
      const existing = caseData.specimens.find(s => s.letter === letter);
      if (existing) {
        existing.designation = designation;
        existing.diagnosis = diagnosis;
        if (cpt) existing.cpt = cpt;
      } else {
        caseData.specimens.push({ letter, designation, diagnosis, cpt: cpt || null, cptAddons: [] });
      }
      return { success: true };
    }

    case 'assemble_report':
      return { success: true, message: 'Report assembled.' };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
