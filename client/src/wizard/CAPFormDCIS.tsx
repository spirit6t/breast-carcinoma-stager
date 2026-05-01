import type { CaseData } from '../lib/types';
import { Chips, SingleChips } from './CAPFormBits';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

const PROCEDURES = ['Lumpectomy', 'Partial mastectomy', 'Mastectomy', 'Simple mastectomy', 'Modified radical mastectomy'];
const LATERALITIES = ['Left', 'Right'];
const TUMOR_SITES = ['Upper outer quadrant', 'Lower outer quadrant', 'Upper inner quadrant', 'Lower inner quadrant', 'Central', 'Nipple'];
const HIST_TYPES = ['Ductal carcinoma in situ', 'Paget disease', 'Encapsulated papillary carcinoma without invasive carcinoma', 'Solid papillary carcinoma without invasive carcinoma'];
const PATTERNS = ['Comedo', 'Paget disease (DCIS involving nipple skin)', 'Cribriform', 'Micropapillary', 'Papillary', 'Solid'];
const GRADES = ['Grade I (low)', 'Grade II (intermediate)', 'Grade III (high)'];
const NECROSIS = ['Not identified', 'Present, focal (small foci or single cell necrosis)', 'Present, central (expansive "comedo" necrosis)'];
const CALCS = ['Not identified', 'Present in DCIS', 'Present in nonneoplastic tissue'];
const MARGIN_STATUSES = ['All margins negative for DCIS', 'DCIS present at margin'];
const MARGIN_SIDES = ['Anterior', 'Posterior', 'Superior', 'Inferior', 'Medial', 'Lateral'];
const NODE_STATUSES = ['Not applicable (no regional lymph nodes submitted or found)', 'Regional lymph nodes present'];

export function CAPFormDCIS({ caseState, update }: Props) {
  const c = caseState.cap;
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

  return (
    <div>
      <h2>CAP Synoptic — DCIS Resection</h2>

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

      <h3>Tumor</h3>
      <div className="field">
        <label>Tumor Site (select all that apply)</label>
        <Chips options={TUMOR_SITES} selected={c.tumor.site} toggle={(v) => toggleInList('tumor.site', v, c.tumor.site)} />
      </div>
      <div className="field">
        <label>Histologic Type</label>
        <SingleChips options={HIST_TYPES} value={c.tumor.histologicType} onChange={(v) => setCap('tumor.histologicType', v)} />
      </div>
      <div className="row">
        <div className="field">
          <label>Size / Extent (mm)</label>
          <input
            type="number"
            value={c.tumor.sizeExtentMm ?? ''}
            onChange={(e) => setCap('tumor.sizeExtentMm', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Additional dimension (mm, e.g. "15 x 10")</label>
          <input
            type="text"
            value={c.tumor.additionalDimMm ?? ''}
            onChange={(e) => setCap('tumor.additionalDimMm', e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label># Blocks with DCIS</label>
          <input
            type="number"
            value={c.tumor.blocksWithDCIS ?? ''}
            onChange={(e) => setCap('tumor.blocksWithDCIS', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label># Blocks Examined</label>
          <input
            type="number"
            value={c.tumor.blocksExamined ?? ''}
            onChange={(e) => setCap('tumor.blocksExamined', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </div>
      <div className="field">
        <label>Architectural Patterns (select all that apply)</label>
        <Chips
          options={PATTERNS}
          selected={c.tumor.architecturalPatterns}
          toggle={(v) => toggleInList('tumor.architecturalPatterns', v, c.tumor.architecturalPatterns)}
        />
      </div>
      <div className="field">
        <label>Nuclear Grade</label>
        <SingleChips options={GRADES} value={c.tumor.nuclearGrade} onChange={(v) => setCap('tumor.nuclearGrade', v)} />
      </div>
      <div className="field">
        <label>Necrosis</label>
        <SingleChips options={NECROSIS} value={c.tumor.necrosis} onChange={(v) => setCap('tumor.necrosis', v)} />
      </div>
      <div className="field">
        <label>Microcalcifications (select all that apply)</label>
        <Chips options={CALCS} selected={c.tumor.microcalcifications} toggle={(v) => toggleInList('tumor.microcalcifications', v, c.tumor.microcalcifications)} />
      </div>

      <h3>Margins</h3>
      <div className="field">
        <label>Margin Status</label>
        <SingleChips options={MARGIN_STATUSES} value={c.margins.status} onChange={(v) => setCap('margins.status', v)} />
      </div>
      {c.margins.status === 'All margins negative for DCIS' && (
        <>
          <div className="field">
            <label>Distance from DCIS to closest margin (mm)</label>
            <input
              type="number"
              step="0.1"
              value={c.margins.distanceMm ?? ''}
              onChange={(e) => setCap('margins.distanceMm', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Closest Margin(s) — required if &lt; 2 mm</label>
            <Chips options={MARGIN_SIDES} selected={c.margins.closestMargins} toggle={(v) => toggleInList('margins.closestMargins', v, c.margins.closestMargins)} />
          </div>
        </>
      )}
      {c.margins.status === 'DCIS present at margin' && (
        <div className="field">
          <label>Involved Margin(s)</label>
          <Chips
            options={MARGIN_SIDES}
            selected={c.margins.involvedMargins.map((m) => m.side)}
            toggle={(v) => {
              const present = c.margins.involvedMargins.find((m) => m.side === v);
              const next = present
                ? c.margins.involvedMargins.filter((m) => m.side !== v)
                : [...c.margins.involvedMargins, { side: v, extent: '' }];
              setCap('margins.involvedMargins', next);
            }}
          />
        </div>
      )}

      <h3>Regional Lymph Nodes</h3>
      <div className="field">
        <label>Status</label>
        <SingleChips options={NODE_STATUSES} value={c.nodes.status} onChange={(v) => setCap('nodes.status', v)} />
      </div>
      {c.nodes.status === 'Regional lymph nodes present' && (
        <>
          <div className="row">
            <div className="field">
              <label>Total nodes examined</label>
              <input
                type="number"
                value={c.nodes.totalExamined ?? ''}
                onChange={(e) => setCap('nodes.totalExamined', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Sentinel nodes examined</label>
              <input
                type="number"
                value={c.nodes.sentinelExamined ?? ''}
                onChange={(e) => setCap('nodes.sentinelExamined', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label># Macrometastases (&gt;2 mm)</label>
              <input
                type="number"
                value={(c.nodes.macroCount as number | null) ?? ''}
                onChange={(e) => setCap('nodes.macroCount', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label># Micrometastases (0.2–2 mm)</label>
              <input
                type="number"
                value={(c.nodes.microCount as number | null) ?? ''}
                onChange={(e) => setCap('nodes.microCount', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label># Isolated Tumor Cells (≤0.2 mm)</label>
              <input
                type="number"
                value={(c.nodes.itcCount as number | null) ?? ''}
                onChange={(e) => setCap('nodes.itcCount', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          </div>
        </>
      )}

      <h3>Pathologic Stage (AJCC 8) — Auto-Computed</h3>
      <div className="row">
        <div className="field">
          <label>pT</label>
          <div className={`stage-computed${c.stage.ptCategory ? '' : ' empty'}`}>
            {c.stage.ptCategory ?? '—'}
          </div>
        </div>
        <div className="field">
          <label>pN</label>
          <div className={`stage-computed${c.stage.pnCategory ? '' : ' empty'}`}>
            {c.stage.pnCategory ?? '—'}
          </div>
        </div>
      </div>

      <h3>Additional Findings</h3>
      <div className="field">
        <textarea
          value={c.additionalFindings}
          onChange={(e) => setCap('additionalFindings', e.target.value)}
          placeholder="e.g. columnar cell change, atypical ductal hyperplasia"
        />
      </div>

      <h3>Special Studies (ER/PR/HER2 — from outside biopsy)</h3>
      <div className="field">
        <textarea
          value={c.specialStudies.erPrHer2Text}
          onChange={(e) => setCap('specialStudies.erPrHer2Text', e.target.value)}
          placeholder="was performed on the previous biopsy # ____ with the following result: {ER: __%, PR: __%, HER2: __}"
        />
      </div>
    </div>
  );
}
