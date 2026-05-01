import { useEffect, useState } from 'react';
import type { CaseData } from '../lib/types';
import { renderReport } from '../lib/api';
import { downloadText, downloadJson, pickJsonFile } from '../lib/storage';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

export function ReviewStep({ caseState, update }: Props) {
  const [text, setText] = useState(caseState.reportText || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await renderReport(caseState);
      setText(r.reportText);
      update((c) => ({ ...c, reportText: r.reportText }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // Sync local textarea when caseState.reportText changes (e.g., agent just
  // called assemble_report, or user hit Regenerate). Preserves in-progress
  // manual edits only if local text matches the last seen reportText.
  useEffect(() => {
    if (caseState.reportText && caseState.reportText !== text) {
      setText(caseState.reportText);
    } else if (!caseState.reportText && !text) {
      regenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseState.reportText]);

  const filenameBase = `breast_excision_DCIS_${caseState.receivedDate || 'draft'}`;

  const saveDraft = () => {
    const snapshot = { ...caseState, reportText: text };
    downloadJson(`${filenameBase}.json`, snapshot);
  };

  const loadDraft = async () => {
    try {
      const data = (await pickJsonFile()) as CaseData;
      if (data && typeof data === 'object' && 'cap' in data) {
        update(() => data);
        setText(data.reportText || '');
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const downloadReport = () => {
    downloadText(`${filenameBase}.txt`, text);
  };

  return (
    <div>
      <h2>Review & Export</h2>
      <p className="dim">
        Edit the report text below, then download as .txt (copy-paste into LIS). Use Save Draft / Load Draft to persist the full case JSON.
      </p>

      <div className="actions" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={regenerate} disabled={loading}>
            {loading ? 'Rendering…' : 'Regenerate'}
          </button>
          <button onClick={loadDraft}>Load Draft (.json)</button>
          <button onClick={saveDraft}>Save Draft (.json)</button>
        </div>
        <button className="primary" onClick={downloadReport}>Download .txt</button>
      </div>

      {error && <div className="warn" style={{ color: 'var(--danger)' }}>{error}</div>}

      <textarea
        className="report"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', marginTop: 12 }}
      />
    </div>
  );
}
