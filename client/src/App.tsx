import { useEffect, useMemo, useState } from 'react';
import type { CaseData, Settings, WizardStep } from './lib/types';
import { createEmptyCase, computeDCISStage, computeInvasiveStage } from './lib/caseModel';
import { autosaveCase, loadAutosavedCase, loadSettings, saveSettings } from './lib/storage';
import { SettingsPanel } from './components/SettingsPanel';
import { AgentPane } from './components/AgentPane';
import { IntakeStep } from './wizard/IntakeStep';
import { SpecimensStep } from './wizard/SpecimensStep';
import { CAPFormStep } from './wizard/CAPFormStep';
import { IHCStep } from './wizard/IHCStep';
import { ReviewStep } from './wizard/ReviewStep';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'intake', label: 'Intake' },
  { key: 'specimens', label: 'Specimens' },
  { key: 'cap', label: 'CAP Synoptic' },
  { key: 'ihc', label: 'Immunohistochemistry' },
  { key: 'review', label: 'Review & Export' },
];

export default function App() {
  const [caseState, setCaseState] = useState<CaseData>(() => loadAutosavedCase() || createEmptyCase());
  const [step, setStep] = useState<WizardStep>('intake');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { autosaveCase(caseState); }, [caseState]);

  // Auto-compute pT / pN whenever driving fields change
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

  const stepDone = useMemo(() => ({
    intake: Boolean(caseState.receivedDate),
    specimens: caseState.specimens.length > 0,
    cap: Boolean(caseState.cap.specimen.procedure && caseState.cap.stage.ptCategory),
    ihc: true,
    review: Boolean(caseState.reportText),
  }), [caseState]);

  const stepNodes: Record<WizardStep, React.ReactNode> = {
    intake: <IntakeStep caseState={caseState} update={update} />,
    specimens: <SpecimensStep caseState={caseState} update={update as any} />,
    cap: <CAPFormStep caseState={caseState} update={update as any} />,
    ihc: <IHCStep caseState={caseState} update={update as any} />,
    review: <ReviewStep caseState={caseState} update={update as any} />,
  };

  const idx = STEPS.findIndex((s) => s.key === step);
  const prev = idx > 0 ? STEPS[idx - 1].key : null;
  const next = idx < STEPS.length - 1 ? STEPS[idx + 1].key : null;

  const newCase = () => {
    if (!confirm('Start a new case? Current draft will be cleared from localStorage.')) return;
    const c = createEmptyCase(caseState.mode);
    setCaseState(c);
    setStep('intake');
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Breast Carcinoma Stager</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="status">
            Mode: {caseState.mode} · Last saved: {new Date(caseState.updatedAt).toLocaleTimeString()}
          </span>
          <button onClick={newCase}>New Case</button>
          <button onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <h2>Steps</h2>
          <ol>
            {STEPS.map((s) => (
              <li
                key={s.key}
                className={`${step === s.key ? 'active' : ''} ${stepDone[s.key] ? 'done' : ''}`}
                onClick={() => setStep(s.key)}
              >
                {s.label}
              </li>
            ))}
          </ol>
        </aside>

        <section className="main">
          {stepNodes[step]}
          <div className="actions">
            <button onClick={() => prev && setStep(prev)} disabled={!prev}>← Back</button>
            <button className="primary" onClick={() => next && setStep(next)} disabled={!next}>
              Next →
            </button>
          </div>
        </section>

        <AgentPane
          caseState={caseState}
          settings={settings}
          onCaseUpdate={(c) => setCaseState(c)}
          openSettings={() => setShowSettings(true)}
          onReportAssembled={() => setStep('review')}
        />
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
