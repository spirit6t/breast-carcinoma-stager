import type { CaseData, InvolvedMargin } from '../lib/types';
import { Chips, SingleChips } from './CAPFormBits';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

const PROCEDURES = ['Lumpectomy', 'Partial mastectomy', 'Mastectomy', 'Simple mastectomy', 'Modified radical mastectomy', 'Skin-sparing mastectomy', 'Nipple-sparing mastectomy'];
const LATERALITIES = ['Left', 'Right'];
const INTEGRITY = ['Intact', 'Sliced', 'Fragmented'];
const TUMOR_SITES = ['Upper outer quadrant', 'Lower outer quadrant', 'Upper inner quadrant', 'Lower inner quadrant', 'Central', 'Nipple', 'Axillary tail'];
const HIST_TYPES = [
  'Invasive ductal carcinoma (no special type)',
  'Invasive lobular carcinoma',
  'Invasive carcinoma with mixed ductal and lobular features',
  'Tubular carcinoma',
  'Cribriform carcinoma',
  'Mucinous carcinoma',
  'Medullary carcinoma',
  'Invasive papillary carcinoma',
  'Invasive micropapillary carcinoma',
  'Metaplastic carcinoma',
  'Apocrine carcinoma',
  'Inflammatory carcinoma',
  'Other (specify)',
];
const FOCALITY = ['Single focus of invasive carcinoma', 'Multiple foci of invasive carcinoma', 'Cannot be determined'];
const SCORE_3 = ['1', '2', '3'];
const LVI = ['Not identified', 'Present', 'Cannot be determined'];
const DCIS_PRESENT = ['Not identified', 'Present', 'Cannot be determined'];
const DCIS_PERCENT = ['<25%', '25–50%', '>50%'];
const DCIS_GRADES = ['Grade I (low)', 'Grade II (intermediate)', 'Grade III (high)'];
const DCIS_EXTENT_OPTIONS = [
  'Admixed with invasive carcinoma',
  'Extends beyond the invasive carcinoma',
  'Separate from the invasive carcinoma',
];
const DCIS_PATTERNS = [
  'Comedo', 'Cribriform', 'Micropapillary', 'Papillary', 'Solid',
  'Solid papillary carcinoma in situ', 'Encapsulated papillary carcinoma in situ',
  'Paget disease (DCIS involving nipple skin)', 'Other',
];
const DCIS_NECROSIS = [
  'Not identified',
  'Present, focal (small foci or single cell necrosis)',
  'Present, central (expansive "comedo" necrosis)',
  'Cannot be excluded',
];
const CALCS = ['Not identified', 'Present in invasive carcinoma', 'Present in DCIS', 'Present in nonneoplastic tissue'];
const SKIN_INVOLVE = ['Not applicable', 'Paget disease of nipple', 'Dermal lymphovascular invasion', 'Skin/dermal invasion', 'Skin ulceration', 'Skin satellite nodules'];
const NIPPLE = ['Not identified', 'Paget disease only', 'Invasive carcinoma involves nipple', 'DCIS involves nipple', 'Cannot be assessed'];
const CHEST_WALL = ['Not identified', 'Skeletal muscle invasion', 'Rib invasion', 'Cannot be assessed'];
const TX_EFFECT = [
  'No known presurgical therapy',
  'No definite response to presurgical therapy in the invasive carcinoma',
  'Probable or definite response to presurgical therapy in the invasive carcinoma',
  'No residual invasive carcinoma is present in the breast after presurgical therapy',
];
const TX_EFFECT_NODES = [
  'Not applicable',
  'No definite response to presurgical therapy in metastatic carcinoma',
  'Probable or definite response to presurgical therapy in metastatic carcinoma',
  'No lymph node metastases. Fibrous scarring or histiocytic aggregates, possibly related to prior lymph node metastases with pathologic complete response',
  'No lymph node metastases and no fibrous scarring or histiocytic aggregates in the nodes',
];

const INV_MARGIN_STATUSES = ['All margins negative for invasive carcinoma', 'Invasive carcinoma present at margin', 'Cannot be assessed'];
const DCIS_MARGIN_STATUSES = ['No DCIS', 'All margins negative for DCIS', 'DCIS present at margin', 'Cannot be assessed'];
const MARGIN_SIDES = ['Anterior', 'Posterior', 'Superior', 'Inferior', 'Medial', 'Lateral'];
const NODE_STATUSES = ['Not applicable (no regional lymph nodes submitted or found)', 'Regional lymph nodes present'];
const ENE = ['Not identified', 'Present, ≤2 mm', 'Present, >2 mm', 'Cannot be determined'];
const N_SUFFIX = ['sn', 'f'];

const PM = ['Not applicable', 'pM1', 'cM0'];

const BIOMARKER_SOURCE = ['Performed on this specimen', 'Performed on prior biopsy', 'Pending'];
const ER_STATUS = ['Positive', 'Low positive (1–10%)', 'Negative', 'Cannot be determined'];
const ER_INTENSITY = ['Weak', 'Moderate', 'Strong'];
const INTERNAL_CONTROL = ['Present, intact', 'Absent', 'Not applicable'];
const HER2_IHC_SCORES = ['0', '1+', '2+', '3+', 'Cannot be determined'];
const HER2_IHC_INTERP = ['Negative', 'Equivocal', 'Positive', 'Cannot be determined'];
const HER2_ISH_METHOD = ['Dual-probe', 'Single-probe'];
const HER2_ISH_INTERP = ['Not amplified', 'Amplified', 'Equivocal', 'Cannot be determined'];

function nottinghamGradeFromScore(total: number | null): string | null {
  if (total == null) return null;
  if (total <= 5) return 'Grade 1 (well differentiated)';
  if (total <= 7) return 'Grade 2 (moderately differentiated)';
  if (total <= 9) return 'Grade 3 (poorly differentiated)';
  return null;
}

// Official CAP mitotic score table — Table 1 from Breast.Invasive_4.10.0.0.REL.CAPCP
// Source: Pathology Reporting of Breast Disease, NHS/RCPath 2005 (adapted by CAP)
// Each entry: [diameterMm, score1Max, score2Max]  →  score 3 = above score2Max
const MITOTIC_TABLE: [number, number, number][] = [
  [0.40,  4,  9],
  [0.41,  4,  9],
  [0.42,  5, 10],
  [0.43,  5, 10],
  [0.44,  5, 11],
  [0.45,  5, 11],
  [0.46,  6, 12],
  [0.47,  6, 12],
  [0.48,  6, 13],
  [0.49,  6, 13],
  [0.50,  7, 14],
  [0.51,  7, 14],
  [0.52,  7, 15],
  [0.53,  8, 16],
  [0.54,  8, 16],
  [0.55,  8, 17],
  [0.56,  8, 17],
  [0.57,  9, 18],
  [0.58,  9, 19],
  [0.59,  9, 19],
  [0.60, 10, 20],
  [0.61, 10, 21],
  [0.62, 11, 22],
  [0.63, 11, 22],
  [0.64, 11, 23],
  [0.65, 12, 24],
  [0.66, 12, 24],
  [0.67, 12, 25],
  [0.68, 13, 26],
  [0.69, 13, 27],
];

function mitoticScoreFromCount(count: number | null, diameterMm: number | null): 1 | 2 | 3 | null {
  if (count == null || diameterMm == null) return null;
  // Round to 2 decimal places to match table keys, then find closest row
  const d = Math.round(diameterMm * 100) / 100;
  const row =
    MITOTIC_TABLE.find((r) => r[0] === d) ??
    MITOTIC_TABLE.reduce((best, cur) =>
      Math.abs(cur[0] - d) < Math.abs(best[0] - d) ? cur : best
    );
  if (count <= row[1]) return 1;
  if (count <= row[2]) return 2;
  return 3;
}

function sizeCorrelation(grossMm: number | null, radiologicMm: number | null): { label: string; cls: string } | null {
  if (grossMm == null || radiologicMm == null) return null;
  const diff = Math.abs(grossMm - radiologicMm);
  const pct = radiologicMm > 0 ? diff / radiologicMm : 1;
  if (diff <= 3 || pct <= 0.15) return { label: `✓ Correlates with radiology (${radiologicMm} mm)`, cls: 'corr-ok' };
  return { label: `⚠ Discrepancy vs. radiology (${radiologicMm} mm)`, cls: 'corr-warn' };
}

export function CAPFormInvasive({ caseState, update }: Props) {
  const c = caseState.cap;
  const t = c.tumor;
  const m = c.margins;
  const ss = c.specialStudies;
  const stg = c.stage;
  const n = c.nodes;

  const setCap = (path: string, value: unknown) => {
    update((cs) => {
      const next = structuredClone(cs);
      const parts = path.split('.');
      let cur: any = next.cap;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const toggleInList = (path: string, value: string, currentList: string[]) => {
    const next = currentList.includes(value) ? currentList.filter((x) => x !== value) : [...currentList, value];
    setCap(path, next);
  };

  const setNottingham = (key: 'tubuleFormation' | 'nuclearPleomorphism' | 'mitoticCount', v: number) => {
    update((cs) => {
      const next = structuredClone(cs);
      const not: any = next.cap.tumor.nottingham;
      not[key] = v;
      const tub = Number(not.tubuleFormation) || 0;
      const ple = Number(not.nuclearPleomorphism) || 0;
      const mit = Number(not.mitoticCount) || 0;
      if (tub && ple && mit) {
        not.totalScore = tub + ple + mit;
        not.overallGrade = nottinghamGradeFromScore(not.totalScore);
      }
      return next;
    });
  };

  const setMitoticCount = (countPer10HPF: number | null) => {
    update((cs) => {
      const next = structuredClone(cs);
      const not: any = next.cap.tumor.nottingham;
      not.mitosesPer10HPF = countPer10HPF;
      // Auto-assign mitotic score from count + field diameter
      const score = mitoticScoreFromCount(countPer10HPF, not.fieldDiameterMm);
      if (score !== null) {
        not.mitoticCount = score;
        const tub = Number(not.tubuleFormation) || 0;
        const ple = Number(not.nuclearPleomorphism) || 0;
        if (tub && ple) {
          not.totalScore = tub + ple + score;
          not.overallGrade = nottinghamGradeFromScore(not.totalScore);
        }
      }
      return next;
    });
  };

  const setFieldDiameter = (diameterMm: number | null) => {
    update((cs) => {
      const next = structuredClone(cs);
      const not: any = next.cap.tumor.nottingham;
      not.fieldDiameterMm = diameterMm;
      // Recompute mitotic score with new diameter
      const score = mitoticScoreFromCount(not.mitosesPer10HPF, diameterMm);
      if (score !== null) {
        not.mitoticCount = score;
        const tub = Number(not.tubuleFormation) || 0;
        const ple = Number(not.nuclearPleomorphism) || 0;
        if (tub && ple) {
          not.totalScore = tub + ple + score;
          not.overallGrade = nottinghamGradeFromScore(not.totalScore);
        }
      }
      return next;
    });
  };

  const toggleInvolvedMargin = (
    path: 'invasiveInvolvedMargins' | 'dcisInvolvedMargins',
    side: string
  ) => {
    const list: InvolvedMargin[] = (m as any)[path] || [];
    const present = list.find((x) => x.side === side);
    const next = present ? list.filter((x) => x.side !== side) : [...list, { side, extent: '' }];
    setCap(`margins.${path}`, next);
  };

  return (
    <div>
      <h2>CAP Synoptic — Invasive Carcinoma Resection</h2>

      <h3>Specimen</h3>
      <div className="row">
        <div className="field">
          <label>Procedure</label>
          <SingleChips options={PROCEDURES} value={c.specimen.procedure} onChange={(v) => setCap('specimen.procedure', v)} />
        </div>
        <div className="field">
          <label>Laterality</label>
          <SingleChips options={LATERALITIES} value={c.specimen.laterality} onChange={(v) => setCap('specimen.laterality', v)} />
        </div>
      </div>
      <div className="field">
        <label>Specimen Integrity</label>
        <SingleChips options={INTEGRITY} value={c.specimen.integrity} onChange={(v) => setCap('specimen.integrity', v)} />
      </div>

      <h3>Tumor</h3>
      <div className="field">
        <label>Tumor Site (select all that apply)</label>
        <Chips options={TUMOR_SITES} selected={t.site} toggle={(v) => toggleInList('tumor.site', v, t.site)} />
      </div>
      <div className="field">
        <label>Tumor Focality</label>
        <SingleChips options={FOCALITY} value={t.focality} onChange={(v) => setCap('tumor.focality', v)} />
      </div>
      {t.focality === 'Multiple foci of invasive carcinoma' && (
        <div className="row">
          <div className="field">
            <label>Number of Foci</label>
            <input
              type="number"
              value={t.numberOfFoci ?? ''}
              onChange={(e) => setCap('tumor.numberOfFoci', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Size of Largest Focus (mm)</label>
            <input
              type="number"
              value={t.sizeOfLargestFocus ?? ''}
              onChange={(e) => setCap('tumor.sizeOfLargestFocus', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        </div>
      )}
      <div className="field">
        <label>Histologic Type</label>
        <SingleChips options={HIST_TYPES} value={t.histologicType} onChange={(v) => setCap('tumor.histologicType', v)} />
        {t.histologicType === 'Other (specify)' && (
          <input
            type="text"
            value={t.histologicTypeOther}
            onChange={(e) => setCap('tumor.histologicTypeOther', e.target.value)}
            placeholder="specify"
            style={{ marginTop: 6 }}
          />
        )}
      </div>
      <div className="row">
        <div className="field">
          <label>Gross size of tumor (mm)</label>
          <input
            type="number"
            step="0.1"
            value={t.grossSizeMm ?? ''}
            onChange={(e) => setCap('tumor.grossSizeMm', e.target.value === '' ? null : Number(e.target.value))}
          />
          {(() => {
            const corr = sizeCorrelation(t.grossSizeMm, caseState.priorHistory.radiologicSizeMm);
            return corr ? <div className={`size-corr ${corr.cls}`}>{corr.label}</div> : null;
          })()}
        </div>
        <div className="field">
          <label>Size of Largest Invasive Focus (mm)</label>
          <input
            type="number"
            value={t.invasiveSizeMm ?? ''}
            onChange={(e) => setCap('tumor.invasiveSizeMm', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Additional dimension (mm, e.g. "15 x 10")</label>
          <input
            type="text"
            value={t.invasiveAdditionalDimMm ?? ''}
            onChange={(e) => setCap('tumor.invasiveAdditionalDimMm', e.target.value)}
          />
        </div>
      </div>

      <h3>Histologic Grade — Nottingham</h3>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="field">
          <label>Glandular / Tubular Differentiation</label>
          <SingleChips
            options={SCORE_3}
            value={t.nottingham.tubuleFormation ? String(t.nottingham.tubuleFormation) : null}
            onChange={(v) => setNottingham('tubuleFormation', Number(v))}
          />
          <ul className="score-defs">
            <li className={t.nottingham.tubuleFormation === 1 ? 'active' : ''}>
              <span className="score-num">1</span>&gt;75% of tumor area forming glandular/tubular structures
            </li>
            <li className={t.nottingham.tubuleFormation === 2 ? 'active' : ''}>
              <span className="score-num">2</span>10–75% of tumor area forming glandular/tubular structures
            </li>
            <li className={t.nottingham.tubuleFormation === 3 ? 'active' : ''}>
              <span className="score-num">3</span>&lt;10% of tumor area forming glandular/tubular structures
            </li>
          </ul>
        </div>
        <div className="field">
          <label>Nuclear Pleomorphism</label>
          <SingleChips
            options={SCORE_3}
            value={t.nottingham.nuclearPleomorphism ? String(t.nottingham.nuclearPleomorphism) : null}
            onChange={(v) => setNottingham('nuclearPleomorphism', Number(v))}
          />
          <ul className="score-defs">
            <li className={t.nottingham.nuclearPleomorphism === 1 ? 'active' : ''}>
              <span className="score-num">1</span>Small nuclei, regular outlines, uniform chromatin, little size variation
            </li>
            <li className={t.nottingham.nuclearPleomorphism === 2 ? 'active' : ''}>
              <span className="score-num">2</span>Larger nuclei, open vesicular, visible nucleoli, moderate size/shape variability
            </li>
            <li className={t.nottingham.nuclearPleomorphism === 3 ? 'active' : ''}>
              <span className="score-num">3</span>Vesicular nuclei, prominent nucleoli, marked variation in size/shape, occasional bizarre forms
            </li>
          </ul>
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Microscope field diameter (mm)</label>
          <input
            type="number"
            step="0.01"
            value={t.nottingham.fieldDiameterMm ?? ''}
            onChange={(e) => setFieldDiameter(e.target.value === '' ? null : Number(e.target.value))}
            placeholder="e.g. 0.44, 0.52, 0.59"
          />
        </div>
        <div className="field">
          <label>Mitoses per 10 HPF</label>
          <input
            type="number"
            value={t.nottingham.mitosesPer10HPF ?? ''}
            onChange={(e) => setMitoticCount(e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Mitotic Score (auto)</label>
          <div className={`stage-computed${t.nottingham.mitoticCount ? '' : ' empty'}`}>
            {t.nottingham.mitoticCount ?? '—'}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Total Score (auto)</label>
          <div className={`stage-computed${t.nottingham.totalScore ? '' : ' empty'}`}>
            {t.nottingham.totalScore ?? '—'}
          </div>
        </div>
        <div className="field">
          <label>Overall Grade (auto)</label>
          <div className={`stage-computed${t.nottingham.overallGrade ? '' : ' empty'}`}>
            {t.nottingham.overallGrade ?? '—'}
          </div>
        </div>
      </div>

      <h3>Lymphovascular Invasion</h3>
      <div className="row">
        <div className="field">
          <label>Lymphovascular Invasion</label>
          <SingleChips options={LVI} value={t.lymphovascularInvasion} onChange={(v) => setCap('tumor.lymphovascularInvasion', v)} />
        </div>
        <div className="field">
          <label>Dermal Lymphovascular Invasion</label>
          <SingleChips options={LVI} value={t.dermalLymphovascularInvasion} onChange={(v) => setCap('tumor.dermalLymphovascularInvasion', v)} />
        </div>
      </div>

      <h3>Associated DCIS (Note G)</h3>
      <div className="field">
        <label>DCIS Associated with Invasive Carcinoma</label>
        <SingleChips options={DCIS_PRESENT} value={t.dcisAssociated} onChange={(v) => setCap('tumor.dcisAssociated', v)} />
      </div>
      {t.dcisAssociated === 'Present' && (
        <>
          <div className="field">
            <label>Extent of DCIS (select all that apply)</label>
            <Chips
              options={DCIS_EXTENT_OPTIONS}
              selected={t.dcisExtentCategories}
              toggle={(v) => toggleInList('tumor.dcisExtentCategories', v, t.dcisExtentCategories)}
            />
          </div>
          {t.dcisExtentCategories.includes('Admixed with invasive carcinoma') && (
            <div className="field" style={{ marginLeft: 16 }}>
              <label>Specify DCIS as a Percentage of Entire Tumor (%)</label>
              <input
                type="text"
                value={t.dcisAdmixedPercent ?? ''}
                onChange={(e) => setCap('tumor.dcisAdmixedPercent', e.target.value || null)}
                placeholder="e.g. 30"
              />
            </div>
          )}
          <div className="row" style={{ marginTop: 4 }}>
            <div className="field">
              <label>Other extent (specify)</label>
              <input
                type="text"
                value={t.dcisExtentOther}
                onChange={(e) => setCap('tumor.dcisExtentOther', e.target.value)}
                placeholder="other extent"
              />
            </div>
            <div className="field">
              <label>Cannot be determined (explain)</label>
              <input
                type="text"
                value={t.dcisExtentCannotDetermine}
                onChange={(e) => setCap('tumor.dcisExtentCannotDetermine', e.target.value)}
                placeholder="explain"
              />
            </div>
          </div>
          <div className="field">
            <label>Estimated Size of DCIS (mm)</label>
            <input
              type="number"
              value={t.dcisExtentMm ?? ''}
              onChange={(e) => setCap('tumor.dcisExtentMm', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Architectural Pattern(s) (select all that apply)</label>
            <Chips options={DCIS_PATTERNS} selected={t.dcisArchitecturalPatterns} toggle={(v) => toggleInList('tumor.dcisArchitecturalPatterns', v, t.dcisArchitecturalPatterns)} />
            {t.dcisArchitecturalPatterns.includes('Other') && (
              <input
                type="text"
                value={t.dcisPatternOther}
                onChange={(e) => setCap('tumor.dcisPatternOther', e.target.value)}
                placeholder="specify other pattern"
                style={{ marginTop: 6 }}
              />
            )}
          </div>
          <div className="field">
            <label>Nuclear Grade</label>
            <SingleChips options={DCIS_GRADES} value={t.dcisGrade} onChange={(v) => setCap('tumor.dcisGrade', v)} />
          </div>
          <div className="field">
            <label>Necrosis</label>
            <SingleChips options={DCIS_NECROSIS} value={t.dcisNecrosis} onChange={(v) => setCap('tumor.dcisNecrosis', v)} />
            {/cannot be excluded/i.test(t.dcisNecrosis || '') && (
              <input
                type="text"
                value={t.dcisNecrosisCannotExclude}
                onChange={(e) => setCap('tumor.dcisNecrosisCannotExclude', e.target.value)}
                placeholder="explain"
                style={{ marginTop: 6 }}
              />
            )}
          </div>
          <div className="field">
            <label>Extensive Intraductal Component (EIC)</label>
            <SingleChips
              options={['Not identified', 'Present']}
              value={t.extensiveIntraductalComponent === true ? 'Present' : t.extensiveIntraductalComponent === false ? 'Not identified' : null}
              onChange={(v) => setCap('tumor.extensiveIntraductalComponent', v === 'Present')}
            />
          </div>
          <div className="field">
            <label>DCIS Comment</label>
            <textarea
              value={t.dcisComment}
              onChange={(e) => setCap('tumor.dcisComment', e.target.value)}
              rows={2}
              placeholder="optional DCIS comment"
            />
          </div>
        </>
      )}

      <h3>Microcalcifications</h3>
      <div className="field">
        <Chips options={CALCS} selected={t.microcalcifications} toggle={(v) => toggleInList('tumor.microcalcifications', v, t.microcalcifications)} />
      </div>

      <h3>Skin / Nipple / Chest Wall</h3>
      <div className="field">
        <label>Skin / Dermal Involvement</label>
        <Chips options={SKIN_INVOLVE} selected={t.skinInvolvement} toggle={(v) => toggleInList('tumor.skinInvolvement', v, t.skinInvolvement)} />
      </div>
      <div className="row">
        <div className="field">
          <label>Nipple Involvement</label>
          <SingleChips options={NIPPLE} value={t.nippleInvolvement} onChange={(v) => setCap('tumor.nippleInvolvement', v)} />
        </div>
        <div className="field">
          <label>Chest Wall Involvement</label>
          <SingleChips options={CHEST_WALL} value={t.chestWallInvolvement} onChange={(v) => setCap('tumor.chestWallInvolvement', v)} />
        </div>
      </div>

      <h3>Treatment Effect (Post-Neoadjuvant)</h3>
      <div className="field">
        <label>Treatment Effect in the Breast</label>
        <SingleChips options={TX_EFFECT} value={t.treatmentEffect} onChange={(v) => setCap('tumor.treatmentEffect', v)} />
      </div>
      <div className="field">
        <label>Treatment Effect in the Lymph Node</label>
        <SingleChips options={TX_EFFECT_NODES} value={(t as any).treatmentEffectNodes ?? null} onChange={(v) => setCap('tumor.treatmentEffectNodes', v)} />
      </div>

      <h3>Margins — Invasive Carcinoma</h3>
      <div className="field">
        <label>Margin Status</label>
        <SingleChips options={INV_MARGIN_STATUSES} value={m.invasiveStatus} onChange={(v) => setCap('margins.invasiveStatus', v)} />
      </div>
      {m.invasiveStatus === 'All margins negative for invasive carcinoma' && (
        <>
          <div className="field">
            <label>Distance to closest margin (mm)</label>
            <input
              type="number"
              step="0.1"
              value={m.invasiveDistanceMm ?? ''}
              onChange={(e) => setCap('margins.invasiveDistanceMm', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Closest Margin(s)</label>
            <Chips options={MARGIN_SIDES} selected={m.invasiveClosestMargins} toggle={(v) => toggleInList('margins.invasiveClosestMargins', v, m.invasiveClosestMargins)} />
          </div>
        </>
      )}
      {m.invasiveStatus === 'Invasive carcinoma present at margin' && (
        <div className="field">
          <label>Involved Margin(s)</label>
          <Chips
            options={MARGIN_SIDES}
            selected={m.invasiveInvolvedMargins.map((x) => x.side)}
            toggle={(v) => toggleInvolvedMargin('invasiveInvolvedMargins', v)}
          />
        </div>
      )}

      <h3>Margins — DCIS</h3>
      <div className="field">
        <label>DCIS Margin Status</label>
        <SingleChips options={DCIS_MARGIN_STATUSES} value={m.dcisStatus} onChange={(v) => setCap('margins.dcisStatus', v)} />
      </div>
      {m.dcisStatus === 'All margins negative for DCIS' && (
        <>
          <div className="field">
            <label>Distance from DCIS to closest margin (mm)</label>
            <input
              type="number"
              step="0.1"
              value={m.dcisDistanceMm ?? ''}
              onChange={(e) => setCap('margins.dcisDistanceMm', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Closest Margin(s) to DCIS</label>
            <Chips options={MARGIN_SIDES} selected={m.dcisClosestMargins} toggle={(v) => toggleInList('margins.dcisClosestMargins', v, m.dcisClosestMargins)} />
          </div>
        </>
      )}
      {m.dcisStatus === 'DCIS present at margin' && (
        <div className="field">
          <label>DCIS Involved Margin(s)</label>
          <Chips
            options={MARGIN_SIDES}
            selected={m.dcisInvolvedMargins.map((x) => x.side)}
            toggle={(v) => toggleInvolvedMargin('dcisInvolvedMargins', v)}
          />
        </div>
      )}

      <h3>Regional Lymph Nodes</h3>
      <div className="field">
        <label>Status</label>
        <SingleChips options={NODE_STATUSES} value={n.status} onChange={(v) => setCap('nodes.status', v)} />
      </div>
      {n.status === 'Regional lymph nodes present' && (
        <>
          <div className="row">
            <div className="field">
              <label>Total nodes examined</label>
              <input
                type="number"
                value={n.totalExamined ?? ''}
                onChange={(e) => setCap('nodes.totalExamined', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Sentinel nodes examined</label>
              <input
                type="number"
                value={n.sentinelExamined ?? ''}
                onChange={(e) => setCap('nodes.sentinelExamined', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label># Macrometastases (&gt;2 mm)</label>
              <input
                type="number"
                value={(n.macroCount as number | null) ?? ''}
                onChange={(e) => setCap('nodes.macroCount', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label># Micrometastases (0.2–2 mm)</label>
              <input
                type="number"
                value={(n.microCount as number | null) ?? ''}
                onChange={(e) => setCap('nodes.microCount', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label># Isolated Tumor Cells (≤0.2 mm)</label>
              <input
                type="number"
                value={(n.itcCount as number | null) ?? ''}
                onChange={(e) => setCap('nodes.itcCount', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Largest Deposit (mm)</label>
              <input
                type="number"
                step="0.1"
                value={n.largestDepositMm ?? ''}
                onChange={(e) => setCap('nodes.largestDepositMm', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Extranodal Extension</label>
              <SingleChips options={ENE} value={n.extranodalExtension} onChange={(v) => setCap('nodes.extranodalExtension', v)} />
            </div>
          </div>
          <div className="field">
            <label>N modifier</label>
            <Chips options={N_SUFFIX} selected={n.nSuffix} toggle={(v) => toggleInList('nodes.nSuffix', v, n.nSuffix)} />
          </div>
        </>
      )}

      <h3>Pathologic Stage (AJCC 8) — Auto-Computed</h3>
      <div className="field">
        <label>Stage Descriptor</label>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <input
              type="checkbox"
              checked={!!stg.yPrefix}
              onChange={(e) => setCap('stage.yPrefix', e.target.checked)}
            /> y (post-neoadjuvant)
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!stg.rPrefix}
              onChange={(e) => setCap('stage.rPrefix', e.target.checked)}
            /> r (recurrent)
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!stg.mModifier}
              onChange={(e) => setCap('stage.mModifier', e.target.checked)}
            /> (m) multifocal
          </label>
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>pT (auto)</label>
          <div className={`stage-computed${stg.ptCategory ? '' : ' empty'}`}>
            {stg.yPrefix && stg.ptCategory ? 'y' : ''}{stg.rPrefix && stg.ptCategory ? 'r' : ''}{stg.ptCategory ?? '—'}
            {stg.mModifier && stg.ptCategory ? ' (m)' : ''}
          </div>
        </div>
        <div className="field">
          <label>pN (auto)</label>
          <div className={`stage-computed${stg.pnCategory ? '' : ' empty'}`}>
            {stg.pnCategory ?? '—'}
          </div>
        </div>
        <div className="field">
          <label>pM</label>
          <SingleChips options={PM} value={stg.pmCategory} onChange={(v) => setCap('stage.pmCategory', v)} />
        </div>
      </div>

      <h3>Additional Findings</h3>
      <div className="field">
        <textarea
          value={c.additionalFindings}
          onChange={(e) => setCap('additionalFindings', e.target.value)}
          placeholder="e.g. atypical lobular hyperplasia, columnar cell change, fibroadenomatoid change"
        />
      </div>

      <h3>Special Studies — ER / PR / HER2 / Ki-67</h3>
      <div className="field">
        <label>Source</label>
        <SingleChips options={BIOMARKER_SOURCE} value={ss.biomarkersSource} onChange={(v) => setCap('specialStudies.biomarkersSource', v)} />
      </div>
      {ss.biomarkersSource === 'Performed on prior biopsy' && (
        <div className="field">
          <label>Prior Biopsy Accession</label>
          <input
            type="text"
            value={ss.priorBiopsyAccession}
            onChange={(e) => setCap('specialStudies.priorBiopsyAccession', e.target.value)}
            placeholder="e.g. S25-12345"
          />
        </div>
      )}

      <h4>Estrogen Receptor (ER)</h4>
      <div className="row">
        <div className="field">
          <label>Status</label>
          <SingleChips options={ER_STATUS} value={ss.er.status} onChange={(v) => setCap('specialStudies.er.status', v)} />
        </div>
        <div className="field">
          <label>% Positive Nuclei</label>
          <input
            type="number"
            min={0}
            max={100}
            value={ss.er.percentPositive ?? ''}
            onChange={(e) => setCap('specialStudies.er.percentPositive', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Intensity</label>
          <SingleChips options={ER_INTENSITY} value={ss.er.intensity} onChange={(v) => setCap('specialStudies.er.intensity', v)} />
        </div>
        <div className="field">
          <label>Internal Control</label>
          <SingleChips options={INTERNAL_CONTROL} value={ss.er.internalControl} onChange={(v) => setCap('specialStudies.er.internalControl', v)} />
        </div>
      </div>

      <h4>Progesterone Receptor (PR)</h4>
      <div className="row">
        <div className="field">
          <label>Status</label>
          <SingleChips options={ER_STATUS} value={ss.pr.status} onChange={(v) => setCap('specialStudies.pr.status', v)} />
        </div>
        <div className="field">
          <label>% Positive Nuclei</label>
          <input
            type="number"
            min={0}
            max={100}
            value={ss.pr.percentPositive ?? ''}
            onChange={(e) => setCap('specialStudies.pr.percentPositive', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Intensity</label>
          <SingleChips options={ER_INTENSITY} value={ss.pr.intensity} onChange={(v) => setCap('specialStudies.pr.intensity', v)} />
        </div>
        <div className="field">
          <label>Internal Control</label>
          <SingleChips options={INTERNAL_CONTROL} value={ss.pr.internalControl} onChange={(v) => setCap('specialStudies.pr.internalControl', v)} />
        </div>
      </div>

      <h4>HER2 (IHC)</h4>
      <div className="row">
        <div className="field">
          <label>Score</label>
          <SingleChips options={HER2_IHC_SCORES} value={ss.her2Ihc.score} onChange={(v) => setCap('specialStudies.her2Ihc.score', v)} />
        </div>
        <div className="field">
          <label>Interpretation</label>
          <SingleChips options={HER2_IHC_INTERP} value={ss.her2Ihc.interpretation} onChange={(v) => setCap('specialStudies.her2Ihc.interpretation', v)} />
        </div>
      </div>

      <h4>HER2 (ISH)</h4>
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={!!ss.her2Ish.performed}
            onChange={(e) => setCap('specialStudies.her2Ish.performed', e.target.checked)}
          /> ISH performed
        </label>
      </div>
      {ss.her2Ish.performed && (
        <>
          <div className="row">
            <div className="field">
              <label>Method</label>
              <SingleChips options={HER2_ISH_METHOD} value={ss.her2Ish.method} onChange={(v) => setCap('specialStudies.her2Ish.method', v)} />
            </div>
            <div className="field">
              <label>HER2/CEP17 Ratio</label>
              <input
                type="number"
                step="0.01"
                value={ss.her2Ish.ratio ?? ''}
                onChange={(e) => setCap('specialStudies.her2Ish.ratio', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>HER2 Signals/Cell</label>
              <input
                type="number"
                step="0.1"
                value={ss.her2Ish.her2SignalsPerCell ?? ''}
                onChange={(e) => setCap('specialStudies.her2Ish.her2SignalsPerCell', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>CEP17 Signals/Cell</label>
              <input
                type="number"
                step="0.1"
                value={ss.her2Ish.cep17SignalsPerCell ?? ''}
                onChange={(e) => setCap('specialStudies.her2Ish.cep17SignalsPerCell', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Interpretation</label>
              <SingleChips options={HER2_ISH_INTERP} value={ss.her2Ish.interpretation} onChange={(v) => setCap('specialStudies.her2Ish.interpretation', v)} />
            </div>
          </div>
        </>
      )}

      <h4>Ki-67</h4>
      <div className="field">
        <label>Proliferation Index (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={ss.ki67Percent ?? ''}
          onChange={(e) => setCap('specialStudies.ki67Percent', e.target.value === '' ? null : Number(e.target.value))}
        />
      </div>
    </div>
  );
}
