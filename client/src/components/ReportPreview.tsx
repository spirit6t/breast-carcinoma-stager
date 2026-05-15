import { useEffect, useRef, useState } from 'react';
import type { CaseData } from '../lib/types';
import { renderReport } from '../lib/api';
import { downloadText, downloadJson, pickJsonFile } from '../lib/storage';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

type Tab = 'data' | 'report';
interface RowItem { label: string; value: string | null | undefined }

function v(x: unknown): string | null {
  if (x === null || x === undefined || x === '' || x === false) return null;
  if (x === true) return 'Yes';
  return String(x);
}

function Section({ title, rows }: { title: string; rows: RowItem[] }) {
  const visible = rows.filter(r => r.value != null && r.value !== '');
  if (!visible.length) return null;
  return (
    <div className="ps-section">
      <div className="ps-section-title">{title}</div>
      {visible.map(r => (
        <div key={r.label} className="ps-row">
          <span className="ps-label">{r.label}</span>
          <span className="ps-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportPreview({ caseState, update }: Props) {
  const [tab, setTab] = useState<Tab>('data');
  const [reportText, setReportText] = useState(caseState.reportText || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevReport = useRef(caseState.reportText);

  useEffect(() => {
    if (caseState.reportText && caseState.reportText !== prevReport.current) {
      setReportText(caseState.reportText);
      setTab('report');
      prevReport.current = caseState.reportText;
    }
  }, [caseState.reportText]);

  const doRender = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await renderReport(caseState);
      setReportText(r.reportText);
      update(c => ({ ...c, reportText: r.reportText }));
      setTab('report');
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    downloadJson(`breast_case_${caseState.receivedDate || 'draft'}.json`, {
      ...caseState,
      reportText,
    });
  };

  const loadDraft = async () => {
    try {
      const data = (await pickJsonFile()) as CaseData;
      if (data?.cap) {
        update(() => data);
        setReportText(data.reportText || '');
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const c = caseState;
  const t = c.cap.tumor;
  const stg = c.cap.stage;
  const m = c.cap.margins;
  const n = c.cap.nodes;
  const bio = c.cap.specialStudies;
  const nt = t.nottingham;

  const specimenList = c.specimens.length
    ? c.specimens.map(s => `${s.letter}. ${s.designation}`).join('; ')
    : null;

  const nottStr = nt.overallGrade
    ? `${nt.overallGrade} (Nottingham ${nt.totalScore ?? '?'}/9)`
    : null;

  const margInvasiveStr = (() => {
    if (!m.invasiveStatus) return null;
    if (/negative/i.test(m.invasiveStatus)) {
      const closest = (m.invasiveClosestMargins || []).join(', ');
      const dist = m.invasiveDistanceMm != null ? `${m.invasiveDistanceMm} mm` : '';
      return `Negative${closest ? ` — ${closest}${dist ? ` at ${dist}` : ''}` : ''}`;
    }
    const sides = (m.invasiveInvolvedMargins || []).map(x => x.side).join(', ');
    return `Positive${sides ? ` (${sides})` : ''}`;
  })();

  const margDcisStr = (() => {
    if (!m.dcisStatus) return null;
    if (/negative/i.test(m.dcisStatus)) {
      const closest = (m.dcisClosestMargins || []).join(', ');
      const dist = m.dcisDistanceMm != null ? `${m.dcisDistanceMm} mm` : '';
      return `Negative${closest ? ` — ${closest}${dist ? ` at ${dist}` : ''}` : ''}`;
    }
    return `Positive`;
  })();

  const nodeStr = (() => {
    if (/not\s+applicable/i.test(n.status || '')) return null;
    if (n.allNegative) return `0/${n.totalExamined ?? '?'} negative`;
    const pos = (Number(n.macroCount) || 0) + (Number(n.microCount) || 0) + (Number(n.itcCount) || 0);
    if (pos > 0)
      return `${pos}/${n.totalExamined ?? '?'} positive${n.largestDepositMm ? ` (largest ${n.largestDepositMm} mm)` : ''}`;
    return null;
  })();

  const erStr = bio.er.status
    ? `${bio.er.status}${bio.er.percentPositive != null ? ` (${bio.er.percentPositive}%)` : ''}`
    : null;

  const prStr = bio.pr.status
    ? `${bio.pr.status}${bio.pr.percentPositive != null ? ` (${bio.pr.percentPositive}%)` : ''}`
    : null;

  const her2Str = bio.her2Ihc.score
    ? `IHC ${bio.her2Ihc.score}${bio.her2Ihc.interpretation ? ` — ${bio.her2Ihc.interpretation}` : ''}`
    : null;

  const hasData = c.specimens.length > 0 || c.cap.specimen.procedure || t.histologicType;

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <div className="preview-tabs">
          <button
            className={`tab${tab === 'data' ? ' active' : ''}`}
            onClick={() => setTab('data')}
          >
            Collected Data
          </button>
          <button
            className={`tab${tab === 'report' ? ' active' : ''}`}
            onClick={() => setTab('report')}
          >
            Report{caseState.reportText ? ' ✓' : ''}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="sm" onClick={loadDraft}>Load</button>
          <button className="sm" onClick={saveDraft}>Save</button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, padding: '6px 12px' }}>{error}</div>
      )}

      {tab === 'data' && (
        <div className="preview-data">
          {!hasData && (
            <div className="dim" style={{ padding: '20px 14px', textAlign: 'center' }}>
              Start the agent interview to see case data here.
            </div>
          )}
          <Section title="Case" rows={[
            { label: 'Mode', value: v(c.mode) },
            { label: 'Received', value: v(c.receivedDate) },
            { label: 'Specimens', value: specimenList },
          ]} />
          <Section title="Procedure" rows={[
            { label: 'Procedure', value: v(c.cap.specimen.procedure) },
            { label: 'Laterality', value: v(c.cap.specimen.laterality) },
          ]} />
          <Section title="Prior History" rows={[
            { label: 'Radiology', value: v(c.priorHistory.radiology) },
            { label: 'Radiologic size', value: c.priorHistory.radiologicSizeMm != null ? `${c.priorHistory.radiologicSizeMm} mm` : null },
            { label: 'Prior biopsy Dx', value: v(c.priorHistory.previousBiopsyResult) },
            { label: 'Prior markers', value: v(c.priorHistory.previousCarcinomaMarkers) },
            { label: 'Clip type', value: v(c.priorHistory.clipType) },
          ]} />
          <Section title="Tumor" rows={[
            { label: 'Histologic type', value: v(t.histologicType) },
            { label: 'Invasive size', value: t.invasiveSizeMm != null ? `${t.invasiveSizeMm} mm` : null },
            { label: 'Focality', value: v(t.focality) },
            { label: 'Nottingham', value: nottStr },
            { label: 'LVI', value: v(t.lymphovascularInvasion) },
            { label: 'Skin involvement', value: t.skinInvolvement?.length ? t.skinInvolvement.join(', ') : null },
            { label: 'Chest wall', value: v(t.chestWallInvolvement) },
            { label: 'Treatment effect (breast)', value: v(t.treatmentEffect) },
            { label: 'Treatment effect (nodes)', value: v(t.treatmentEffectNodes) },
          ]} />
          {t.dcisAssociated && /present/i.test(t.dcisAssociated) && (
            <Section title="Associated DCIS" rows={[
              { label: 'Grade', value: v(t.dcisGrade) },
              { label: 'Extent', value: t.dcisExtentMm != null ? `${t.dcisExtentMm} mm` : null },
              { label: 'EIC', value: t.extensiveIntraductalComponent ? 'Present' : null },
            ]} />
          )}
          <Section title="Margins — Invasive" rows={[
            { label: 'Status', value: margInvasiveStr },
          ]} />
          <Section title="Margins — DCIS" rows={[
            { label: 'Status', value: margDcisStr },
          ]} />
          <Section title="Lymph Nodes" rows={[
            { label: 'Result', value: nodeStr },
            { label: 'Extranodal ext.', value: v(n.extranodalExtension) },
          ]} />
          <Section title="Stage" rows={[
            { label: 'pT', value: v(stg.ptCategory) },
            { label: 'pN', value: v(stg.pnCategory) },
            { label: 'pM', value: v(stg.pmCategory) },
            { label: 'y-prefix (neoadjuvant)', value: stg.yPrefix ? 'Yes' : null },
          ]} />
          <Section title="Biomarkers" rows={[
            { label: 'Source', value: v(bio.biomarkersSource) },
            { label: 'ER', value: erStr },
            { label: 'PR', value: prStr },
            { label: 'HER2 IHC', value: her2Str },
            { label: 'Ki-67', value: bio.ki67Percent != null ? `${bio.ki67Percent}%` : null },
          ]} />
        </div>
      )}

      {tab === 'report' && (
        <div className="preview-report">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={doRender} disabled={loading}>
              {loading ? 'Rendering…' : '↻ Render Report'}
            </button>
            {reportText && (
              <>
                <button onClick={() => navigator.clipboard.writeText(reportText)}>
                  Copy to Clipboard
                </button>
                <button
                  className="primary"
                  onClick={() => downloadText(`breast_${c.receivedDate || 'draft'}.txt`, reportText)}
                >
                  Download .txt
                </button>
              </>
            )}
          </div>
          {!reportText && !loading && (
            <div className="dim" style={{ marginTop: 16 }}>
              No report yet. Click ↻ Render Report or ask the agent to assemble the report.
            </div>
          )}
          {reportText && (
            <textarea
              className="report"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              style={{ width: '100%', flex: 1 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
