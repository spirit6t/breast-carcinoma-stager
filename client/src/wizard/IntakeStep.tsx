import type { CaseData } from '../lib/types';
import { computeSignoutDate } from '../lib/holidays';
import { VoiceInput } from '../components/VoiceInput';

interface Props {
  caseState: CaseData;
  update: (patch: Partial<CaseData> | ((c: CaseData) => CaseData)) => void;
}

export function IntakeStep({ caseState, update }: Props) {
  const setField = (path: string, value: unknown) => {
    update((c) => {
      const next = structuredClone(c);
      if (path === 'receivedDate') {
        next.receivedDate = value as string;
        next.signoutDate = computeSignoutDate(next.receivedDate);
      } else {
        (next.priorHistory as any)[path] = value;
      }
      return next;
    });
  };

  return (
    <div>
      <h2>Intake</h2>

      <div className="field">
        <label>Mode</label>
        <select
          value={caseState.mode}
          onChange={(e) => update((c) => ({ ...c, mode: e.target.value as any }))}
        >
          <option value="excision-DCIS">Breast excision with DCIS</option>
          <option value="excision-invasive">Breast excision with invasive carcinoma</option>
          <option value="biopsy-DCIS" disabled>Breast biopsy with DCIS (coming soon)</option>
          <option value="biopsy-invasive" disabled>Breast biopsy with invasive (coming soon)</option>
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label>Specimen Received Date</label>
          <input
            type="date"
            value={caseState.receivedDate || ''}
            onChange={(e) => setField('receivedDate', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Sign-out Due (auto, +4 business days)</label>
          <input type="date" value={caseState.signoutDate || ''} readOnly />
        </div>
      </div>

      <div className="field">
        <label>Previous Biopsy Result</label>
        <textarea
          value={caseState.priorHistory.previousBiopsyResult}
          onChange={(e) => setField('previousBiopsyResult', e.target.value)}
          placeholder="e.g. DCIS, intermediate grade, cribriform"
        />
        <VoiceInput onTranscript={(t) => setField('previousBiopsyResult', t)} />
      </div>

      <div className="field">
        <label>Previous Biopsy Location</label>
        <textarea
          value={caseState.priorHistory.previousBiopsyLocation}
          onChange={(e) => setField('previousBiopsyLocation', e.target.value)}
          placeholder="e.g. Left breast, 2 o'clock, 3 cm from nipple"
        />
        <VoiceInput onTranscript={(t) => setField('previousBiopsyLocation', t)} />
      </div>

      <div className="field">
        <label>Radiology Findings</label>
        <textarea
          value={caseState.priorHistory.radiology}
          onChange={(e) => setField('radiology', e.target.value)}
        />
        <VoiceInput onTranscript={(t) => setField('radiology', t)} />
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Radiologic tumor size (mm)</label>
        <input
          type="number"
          step="0.1"
          value={caseState.priorHistory.radiologicSizeMm ?? ''}
          onChange={(e) => setField('radiologicSizeMm', e.target.value === '' ? null : Number(e.target.value))}
          placeholder="e.g. 22"
        />
      </div>

      <div className="field">
        <label>Previous Carcinoma Markers</label>
        <textarea
          value={caseState.priorHistory.previousCarcinomaMarkers}
          onChange={(e) => setField('previousCarcinomaMarkers', e.target.value)}
          placeholder="e.g. ER 95%, PR 80%, HER2 negative (from outside biopsy)"
        />
        <VoiceInput onTranscript={(t) => setField('previousCarcinomaMarkers', t)} />
      </div>

      <div className="field">
        <label>Biopsy Clip Type (e.g., HydroMARK)</label>
        <input
          type="text"
          value={caseState.priorHistory.clipType}
          onChange={(e) => setField('clipType', e.target.value)}
        />
      </div>
    </div>
  );
}
