import { useEffect, useRef, useState } from 'react';
import type { AnyCase, CaseData, EndometrialCaseData } from '../lib/types';
import { renderReport } from '../lib/api';
import { downloadText, downloadJson, pickJsonFile } from '../lib/storage';
import { signoutTarget } from '../lib/dateUtils';

interface Props {
  caseState: AnyCase;
  update: (fn: (c: AnyCase) => AnyCase) => void;
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

  const isEndo = (caseState as any).organ === 'endometrium';
  const isPathology = (caseState as any).organ === 'pathology';

  const saveDraft = () => {
    const prefix = isEndo ? 'endo' : isPathology ? 'pathology' : 'breast';
    downloadJson(`${prefix}_case_${caseState.receivedDate || 'draft'}.json`, { ...caseState, reportText });
  };

  const loadDraft = async () => {
    try {
      const data = (await pickJsonFile()) as AnyCase;
      if ((data as any)?.cap || (data as any)?.organ === 'pathology') {
        update(() => data);
        setReportText(data.reportText || '');
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const c = caseState as any;
  const bc = isEndo ? null : (caseState as CaseData);
  const ec = isEndo ? (caseState as EndometrialCaseData) : null;

  const specimenList = c.specimens.length
    ? c.specimens.map((s: any) => `${s.letter}. ${s.designation}`).join('; ')
    : null;

  // Breast-only computed values
  const bt = bc?.cap.tumor;
  const nottStr = bt?.nottingham?.overallGrade
    ? `${bt.nottingham.overallGrade} (Nottingham ${bt.nottingham.totalScore ?? '?'}/9)`
    : null;
  const bm = bc?.cap.margins;
  const margInvasiveStr = (() => {
    if (!bm?.invasiveStatus) return null;
    if (/negative/i.test(bm.invasiveStatus)) {
      const closest = (bm.invasiveClosestMargins || []).join(', ');
      const dist = bm.invasiveDistanceMm != null ? `${bm.invasiveDistanceMm} mm` : '';
      return `Negative${closest ? ` — ${closest}${dist ? ` at ${dist}` : ''}` : ''}`;
    }
    return `Positive${(bm.invasiveInvolvedMargins || []).map((x: any) => x.side).join(', ') ? ` (${(bm.invasiveInvolvedMargins || []).map((x: any) => x.side).join(', ')})` : ''}`;
  })();
  const margDcisStr = (() => {
    if (!bm?.dcisStatus) return null;
    if (/negative/i.test(bm.dcisStatus)) {
      const closest = (bm.dcisClosestMargins || []).join(', ');
      const dist = bm.dcisDistanceMm != null ? `${bm.dcisDistanceMm} mm` : '';
      return `Negative${closest ? ` — ${closest}${dist ? ` at ${dist}` : ''}` : ''}`;
    }
    return `Positive`;
  })();
  const bn = bc?.cap.nodes;
  const nodeStr = (() => {
    if (!bn || /not\s+applicable/i.test(bn.status || '')) return null;
    if (bn.allNegative) return `0/${bn.totalExamined ?? '?'} negative`;
    const pos = (Number(bn.macroCount) || 0) + (Number(bn.microCount) || 0) + (Number(bn.itcCount) || 0);
    if (pos > 0) return `${pos}/${bn.totalExamined ?? '?'} positive${bn.largestDepositMm ? ` (largest ${bn.largestDepositMm} mm)` : ''}`;
    return null;
  })();
  const bbio = bc?.cap.specialStudies;
  const erStr = bbio?.er?.status ? `${bbio.er.status}${bbio.er.percentPositive != null ? ` (${bbio.er.percentPositive}%)` : ''}` : null;
  const prStr = bbio?.pr?.status ? `${bbio.pr.status}${bbio.pr.percentPositive != null ? ` (${bbio.pr.percentPositive}%)` : ''}` : null;
  const her2Str = bbio?.her2Ihc?.score ? `IHC ${bbio.her2Ihc.score}${bbio.her2Ihc.interpretation ? ` — ${bbio.her2Ihc.interpretation}` : ''}` : null;

  // Endo node summary
  const endoNodeStr = (() => {
    if (!ec) return null;
    const pel = ec.cap.nodes.pelvis;
    const paa = ec.cap.nodes.paraAortic;
    const parts: string[] = [];
    if (pel.totalExamined != null) {
      const pos = (Number(pel.macroCount) || 0) + (Number(pel.microCount) || 0);
      parts.push(`Pelvic: ${pos}/${pel.totalExamined}`);
    }
    if (paa.totalExamined != null) {
      const pos = (Number(paa.macroCount) || 0) + (Number(paa.microCount) || 0);
      parts.push(`Para-aortic: ${pos}/${paa.totalExamined}`);
    }
    return parts.length ? parts.join(' · ') : null;
  })();

  const hasData = c.specimens.length > 0 || c.cap.specimen.procedure || c.cap.tumor.histologicType;
  const target = signoutTarget(c.receivedDate);

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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="sm primary"
            onClick={doRender}
            disabled={loading}
            title="Re-render report from current case data"
          >
            {loading ? '…' : '↻ Regenerate'}
          </button>
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
          <div className="ps-section">
            <div className="ps-section-title">Case</div>
            {v(c.mode) && (
              <div className="ps-row">
                <span className="ps-label">Mode</span>
                <span className="ps-value">{c.mode}</span>
              </div>
            )}
            {v(c.receivedDate) && (
              <div className="ps-row">
                <span className="ps-label">Received</span>
                <span className="ps-value">{c.receivedDate}</span>
              </div>
            )}
            {target && (
              <div className="ps-row">
                <span className="ps-label">Sign-out target</span>
                <span className="ps-value" style={{ color: target.overdue ? 'var(--danger)' : 'var(--ok)', fontWeight: 600 }}>
                  {target.label}{target.overdue ? ' — OVERDUE' : ''}
                </span>
              </div>
            )}
            {specimenList && (
              <div className="ps-row">
                <span className="ps-label">Specimens</span>
                <span className="ps-value">{specimenList}</span>
              </div>
            )}
          </div>

          {isPathology ? (
            <>
              {v(c.priorHistory?.clinicalHistory) && (
                <Section title="Clinical History" rows={[
                  { label: 'History', value: v(c.priorHistory.clinicalHistory) },
                ]} />
              )}
              {(c.specimens || []).map((s: any, i: number) => (
                <Section key={i} title={`Specimen ${s.letter}`} rows={[
                  { label: 'Designation', value: v(s.designation) },
                  { label: 'Category', value: v(s.specimenCategory) },
                  { label: 'Diagnosis', value: v(s.diagnosisLine || (s.diagnosisLines || []).join(' / ')) },
                  { label: 'Comment source', value: v(s.commentSource) },
                  { label: 'CPT', value: v(s.cpt) },
                  { label: 'CPT add-ons', value: v((s.cptAddons || []).join(', ')) },
                ]} />
              ))}
            </>
          ) : isEndo ? (
            <>
              <Section title="Procedure" rows={[
                { label: 'Procedure', value: v(ec?.cap.specimen.procedure) },
                { label: 'Integrity', value: v(ec?.cap.specimen.integrity) },
              ]} />
              <Section title="Clinical History" rows={[
                { label: 'Clinical history', value: v(ec?.priorHistory.clinicalHistory) },
                { label: 'Prior biopsy Dx', value: v(ec?.priorHistory.previousBiopsyResult) },
                { label: 'Radiology', value: v(ec?.priorHistory.radiologicFindings) },
              ]} />
              <Section title="Tumor" rows={[
                { label: 'Histologic type', value: v(ec?.cap.tumor.histologicType) },
                { label: 'FIGO grade', value: v(ec?.cap.tumor.histologicGrade) },
                { label: 'Tumor size', value: ec?.cap.tumor.tumorSizeMm != null ? `${ec.cap.tumor.tumorSizeMm} mm` : null },
                { label: 'Myometrial invasion', value: v(ec?.cap.tumor.myometrialInvasion) },
                { label: 'Myometrial invasion %', value: ec?.cap.tumor.myometrialInvasionPercent != null ? `${ec.cap.tumor.myometrialInvasionPercent}%` : null },
                { label: 'Lower uterine segment', value: v(ec?.cap.tumor.lowerUterineSegment) },
                { label: 'Cervical involvement', value: v(ec?.cap.tumor.cervicalInvolvement) },
                { label: 'Uterine serosal', value: v(ec?.cap.tumor.uterineSerosal) },
                { label: 'LVI', value: v(ec?.cap.tumor.lvi) },
                { label: 'LVI foci', value: ec?.cap.tumor.lviFoci != null ? String(ec.cap.tumor.lviFoci) : null },
                { label: 'Peritoneal washings', value: v(ec?.cap.tumor.peritonealWashings) },
                { label: 'Fallopian tubes', value: v(ec?.cap.tumor.fallopianTubes) },
                { label: 'Ovaries', value: v(ec?.cap.tumor.ovaries) },
                { label: 'Adnexal involvement', value: v(ec?.cap.tumor.adnexalInvolvement) },
                { label: 'Adenomyosis', value: v(ec?.cap.tumor.adenomyosis) },
              ]} />
              <Section title="Margins" rows={[
                { label: 'Status', value: v(ec?.cap.margins.status) },
                { label: 'Closest margin', value: ec?.cap.margins.closestMm != null ? `${ec.cap.margins.closestMm} mm` : null },
              ]} />
              <Section title="Lymph Nodes" rows={[
                { label: 'Result', value: endoNodeStr },
              ]} />
              <Section title="Stage" rows={[
                { label: 'pT', value: v(ec?.cap.stage.ptCategory) },
                { label: 'pN', value: v(ec?.cap.stage.pnCategory) },
                { label: 'pM', value: v(ec?.cap.stage.pmCategory) },
                { label: 'FIGO 2009', value: v(ec?.cap.stage.figoStage2009) },
                { label: 'FIGO 2023', value: v(ec?.cap.stage.figoStage2023) },
                { label: 'y-prefix (neoadjuvant)', value: ec?.cap.stage.yPrefix ? 'Yes' : null },
              ]} />
              <Section title="Biomarkers" rows={[
                { label: 'Source', value: v(ec?.cap.specialStudies.biomarkersSource) },
                { label: 'ER', value: v(ec?.cap.specialStudies.er) },
                { label: 'PR', value: v(ec?.cap.specialStudies.pr) },
                { label: 'MMR', value: v(ec?.cap.specialStudies.mmr) },
                { label: 'p53', value: v(ec?.cap.specialStudies.p53) },
              ]} />
            </>
          ) : (
            <>
              <Section title="Procedure" rows={[
                { label: 'Procedure', value: v(bc?.cap.specimen.procedure) },
                { label: 'Laterality', value: v(bc?.cap.specimen.laterality) },
              ]} />
              <Section title="Prior History" rows={[
                { label: 'Radiology', value: v(bc?.priorHistory.radiology) },
                { label: 'Radiologic size', value: bc?.priorHistory.radiologicSizeMm != null ? `${bc.priorHistory.radiologicSizeMm} mm` : null },
                { label: 'Prior biopsy Dx', value: v(bc?.priorHistory.previousBiopsyResult) },
                { label: 'Prior markers', value: v(bc?.priorHistory.previousCarcinomaMarkers) },
                { label: 'Clip type', value: v(bc?.priorHistory.clipType) },
              ]} />
              <Section title="Tumor" rows={[
                { label: 'Histologic type', value: v(bt?.histologicType) },
                { label: 'Invasive size', value: bt?.invasiveSizeMm != null ? `${bt.invasiveSizeMm} mm` : null },
                { label: 'Focality', value: v(bt?.focality) },
                { label: 'Nottingham', value: nottStr },
                { label: 'LVI', value: v(bt?.lymphovascularInvasion) },
                { label: 'Skin involvement', value: bt?.skinInvolvement?.length ? bt.skinInvolvement.join(', ') : null },
                { label: 'Chest wall', value: v(bt?.chestWallInvolvement) },
                { label: 'Treatment effect (breast)', value: v(bt?.treatmentEffect) },
                { label: 'Treatment effect (nodes)', value: v(bt?.treatmentEffectNodes) },
              ]} />
              {bt?.dcisAssociated && /present/i.test(bt.dcisAssociated) && (
                <Section title="Associated DCIS" rows={[
                  { label: 'Grade', value: v(bt?.dcisGrade) },
                  { label: 'Extent', value: bt?.dcisExtentMm != null ? `${bt.dcisExtentMm} mm` : null },
                  { label: 'EIC', value: bt?.extensiveIntraductalComponent ? 'Present' : null },
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
                { label: 'Extranodal ext.', value: v(bn?.extranodalExtension) },
              ]} />
              <Section title="Stage" rows={[
                { label: 'pT', value: v(bc?.cap.stage.ptCategory) },
                { label: 'pN', value: v(bc?.cap.stage.pnCategory) },
                { label: 'pM', value: v(bc?.cap.stage.pmCategory) },
                { label: 'y-prefix (neoadjuvant)', value: bc?.cap.stage.yPrefix ? 'Yes' : null },
              ]} />
              <Section title="Biomarkers" rows={[
                { label: 'Source', value: v(bbio?.biomarkersSource) },
                { label: 'ER', value: erStr },
                { label: 'PR', value: prStr },
                { label: 'HER2 IHC', value: her2Str },
                { label: 'Ki-67', value: bbio?.ki67Percent != null ? `${bbio.ki67Percent}%` : null },
              ]} />
            </>
          )}
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
