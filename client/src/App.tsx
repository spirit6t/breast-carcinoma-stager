import { useEffect, useRef, useState } from 'react';
import type { AnyCase, CaseData, PathologyCaseData, Settings } from './lib/types';
import { createEmptyCase, createEmptyEndometrialCase, createEmptyPathologyCase, createEmptyProstateCase, computeDCISStage, computeInvasiveStage } from './lib/caseModel';
import { autosaveCase, loadAutosavedCase, loadSettings, saveSettings } from './lib/storage';
import { SettingsPanel } from './components/SettingsPanel';
import { AgentPane } from './components/AgentPane';
import { ReportPreview } from './components/ReportPreview';

type OrganType = 'breast' | 'endometrium' | 'pathology' | 'prostate';

function OrganSelector({ onSelect }: { onSelect: (organ: OrganType) => void }) {
  return (
    <div className="organ-selector">
      <h2>Select Case Type</h2>
      <div className="organ-options">
        <div className="organ-card" onClick={() => onSelect('breast')}>
          <div className="organ-card-icon">🩺</div>
          <div className="organ-card-title">Breast Carcinoma</div>
          <div className="organ-card-desc">Invasive carcinoma or DCIS excision / lumpectomy / mastectomy</div>
        </div>
        <div className="organ-card" onClick={() => onSelect('endometrium')}>
          <div className="organ-card-icon">🔬</div>
          <div className="organ-card-title">Endometrial Carcinoma</div>
          <div className="organ-card-desc">Total hysterectomy / BSO — AJCC 8 + FIGO 2009/2023 staging</div>
        </div>
        <div className="organ-card" onClick={() => onSelect('pathology')}>
          <div className="organ-card-icon">🧫</div>
          <div className="organ-card-title">Surgical Path / Cytology</div>
          <div className="organ-card-desc">Any organ — surgical biopsies, FNA, BAL, effusions, resections + Airtable PathPattern lookup</div>
        </div>
        <div className="organ-card" onClick={() => onSelect('prostate')}>
          <div className="organ-card-icon">🔵</div>
          <div className="organ-card-title">Prostate Biopsy</div>
          <div className="organ-card-desc">Needle core biopsy — Gleason grading, grade groups, IDC, cribriform, PIN4 IHC — CAP protocol</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [caseState, setCaseState] = useState<AnyCase | null>(() => loadAutosavedCase() || null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [selectingOrgan, setSelectingOrgan] = useState(false);

  useEffect(() => { if (caseState) autosaveCase(caseState); }, [caseState]);

  // Auto-compute breast staging only
  useEffect(() => {
    const org = (caseState as any)?.organ;
    if (!caseState || org === 'endometrium' || org === 'pathology' || org === 'prostate') return;
    const bc = caseState as CaseData;
    const computed =
      bc.mode === 'excision-invasive'
        ? computeInvasiveStage(bc.cap)
        : computeDCISStage(bc.cap);
    setCaseState((prev) => {
      const prevOrg = (prev as any)?.organ;
      if (!prev || prevOrg === 'endometrium' || prevOrg === 'pathology') return prev;
      const p = prev as CaseData;
      const s = p.cap.stage;
      if (s.ptCategory === computed.ptCategory && s.pnCategory === computed.pnCategory) return prev;
      return { ...p, cap: { ...p.cap, stage: { ...s, ...computed } }, updatedAt: new Date().toISOString() };
    });
  }, [
    (caseState as any)?.organ,
    (caseState as CaseData)?.cap?.tumor?.histologicType,
    (caseState as CaseData)?.cap?.tumor?.invasiveSizeMm,
    (caseState as CaseData)?.cap?.tumor?.sizeOfLargestFocus,
    (caseState as CaseData)?.cap?.tumor?.focality,
    (caseState as CaseData)?.cap?.tumor?.chestWallInvolvement,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (caseState as CaseData)?.cap?.tumor?.skinInvolvement,
    (caseState as CaseData)?.cap?.nodes?.status,
    (caseState as CaseData)?.cap?.nodes?.macroCount,
    (caseState as CaseData)?.cap?.nodes?.microCount,
    (caseState as CaseData)?.cap?.nodes?.itcCount,
    (caseState as CaseData)?.cap?.nodes?.allNegative,
    (caseState as CaseData)?.cap?.nodes?.totalExamined,
  ]);

  const update = (patch: Partial<AnyCase> | ((c: AnyCase) => AnyCase)) => {
    setCaseState((c) => {
      if (!c) return c;
      const next = typeof patch === 'function' ? patch(c) : { ...c, ...patch } as AnyCase;
      (next as any).updatedAt = new Date().toISOString();
      return next;
    });
  };

  const startNewCase = (organ: OrganType) => {
    const c = organ === 'endometrium'
      ? createEmptyEndometrialCase()
      : organ === 'pathology'
      ? createEmptyPathologyCase()
      : organ === 'prostate'
      ? createEmptyProstateCase()
      : createEmptyCase('excision-invasive');
    setCaseState(c);
    setSelectingOrgan(false);
  };

  const newCase = () => {
    if (!confirm('Start a new case? Current draft will be cleared.')) return;
    setCaseState(null);
    setSelectingOrgan(true);
  };

  // Resize handle
  const [agentWidth, setAgentWidth] = useState(620);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - dragStartX.current;
      setAgentWidth(Math.max(320, Math.min(dragStartWidth.current + delta, window.innerWidth - 320)));
    };
    const onUp = () => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  const organ = (caseState as any)?.organ;
  const organLabel = organ === 'endometrium'
    ? 'Endometrial Carcinoma'
    : organ === 'pathology'
    ? 'Surgical Pathology / Cytology'
    : organ === 'prostate'
    ? 'Prostate Biopsy'
    : 'Breast Carcinoma';

  // Show organ selector if no case exists or user clicked New Case
  if (!caseState || selectingOrgan) {
    return (
      <div className="app">
        <header className="topbar">
          <h1>Carcinoma Stager</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => setShowSettings(true)}>Settings</button>
          </div>
        </header>
        <OrganSelector onSelect={startNewCase} />
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onClose={() => setShowSettings(false)}
            onSave={(s) => { setSettings(s); saveSettings(s); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => setSelectingOrgan(true)} title="Back to dashboard">← Dashboard</button>
          <h1 style={{ margin: 0 }}>
            {organ === 'pathology'
              ? <span style={{ color: 'var(--accent)', fontWeight: 400 }}>{organLabel}</span>
              : <>Carcinoma Stager — <span style={{ color: 'var(--accent)', fontWeight: 400 }}>{organLabel}</span></>}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="status">
            Saved: {new Date((caseState as any).updatedAt).toLocaleTimeString()}
          </span>
          <button onClick={newCase}>New Case</button>
          <button onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>

      <main className="layout" style={{ gridTemplateColumns: `${agentWidth}px 6px 1fr` }}>
        <AgentPane
          caseState={caseState as any}
          settings={settings}
          onCaseUpdate={(c) => setCaseState(c)}
          openSettings={() => setShowSettings(true)}
          onReportAssembled={() => {}}
        />
        <div
          className="resize-handle"
          onMouseDown={(e) => {
            dragging.current = true;
            dragStartX.current = e.clientX;
            dragStartWidth.current = agentWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
          }}
        />
        <ReportPreview caseState={caseState as any} update={update as any} />
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(s) => { setSettings(s); saveSettings(s); }}
        />
      )}
    </div>
  );
}
