import { useEffect, useRef, useState } from 'react';
import type { CaseData, Settings } from './lib/types';
import { createEmptyCase, computeDCISStage, computeInvasiveStage } from './lib/caseModel';
import { autosaveCase, loadAutosavedCase, loadSettings, saveSettings } from './lib/storage';
import { SettingsPanel } from './components/SettingsPanel';
import { AgentPane } from './components/AgentPane';
import { ReportPreview } from './components/ReportPreview';

export default function App() {
  const [caseState, setCaseState] = useState<CaseData>(() => loadAutosavedCase() || createEmptyCase());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { autosaveCase(caseState); }, [caseState]);

  useEffect(() => {
    const computed =
      caseState.mode === 'excision-invasive'
        ? computeInvasiveStage(caseState.cap)
        : computeDCISStage(caseState.cap);
    setCaseState((prev) => {
      const s = prev.cap.stage;
      if (s.ptCategory === computed.ptCategory && s.pnCategory === computed.pnCategory) return prev;
      return {
        ...prev,
        cap: { ...prev.cap, stage: { ...s, ...computed } },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [
    caseState.mode,
    caseState.cap.tumor.histologicType,
    caseState.cap.tumor.invasiveSizeMm,
    caseState.cap.tumor.sizeOfLargestFocus,
    caseState.cap.tumor.focality,
    caseState.cap.tumor.chestWallInvolvement,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    caseState.cap.tumor.skinInvolvement,
    caseState.cap.nodes.status,
    caseState.cap.nodes.macroCount,
    caseState.cap.nodes.microCount,
    caseState.cap.nodes.itcCount,
    caseState.cap.nodes.allNegative,
    caseState.cap.nodes.totalExamined,
  ]);

  const update = (patch: Partial<CaseData> | ((c: CaseData) => CaseData)) => {
    setCaseState((c) => {
      const next = typeof patch === 'function' ? patch(c) : { ...c, ...patch };
      next.updatedAt = new Date().toISOString();
      return next;
    });
  };

  const newCase = () => {
    if (!confirm('Start a new case? Current draft will be cleared.')) return;
    setCaseState(createEmptyCase(caseState.mode));
  };

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

  return (
    <div className="app">
      <header className="topbar">
        <h1>Breast Carcinoma Stager</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="status">
            Mode: {caseState.mode} · Saved: {new Date(caseState.updatedAt).toLocaleTimeString()}
          </span>
          <button onClick={newCase}>New Case</button>
          <button onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>

      <main className="layout" style={{ gridTemplateColumns: `${agentWidth}px 6px 1fr` }}>
        <AgentPane
          caseState={caseState}
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
        <ReportPreview caseState={caseState} update={update as any} />
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
