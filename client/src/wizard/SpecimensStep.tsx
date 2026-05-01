import { useState } from 'react';
import type { CaseData, Specimen } from '../lib/types';
import { suggestSpecimenCpt } from '../lib/api';
import { VoiceInput } from '../components/VoiceInput';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

const nextLetter = (specimens: Specimen[]) => {
  if (!specimens.length) return 'A';
  const last = specimens[specimens.length - 1].letter;
  return String.fromCharCode(last.charCodeAt(0) + 1);
};

export function SpecimensStep({ caseState, update }: Props) {
  const [designation, setDesignation] = useState('');

  const addSpecimen = async () => {
    const text = designation.trim();
    if (!text) return;
    const letter = nextLetter(caseState.specimens);
    let cpt: string | null = null;
    try {
      const r = await suggestSpecimenCpt(text);
      cpt = r.cpt;
    } catch { /* offline — leave null */ }
    update((c) => ({
      ...c,
      specimens: [...c.specimens, { letter, designation: text, cpt, diagnosis: '' }],
    }));
    setDesignation('');
  };

  const updateRow = (i: number, patch: Partial<Specimen>) => {
    update((c) => ({
      ...c,
      specimens: c.specimens.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };

  const removeRow = (i: number) => {
    update((c) => ({
      ...c,
      specimens: c.specimens.filter((_, idx) => idx !== i).map((s, idx) => ({
        ...s,
        letter: String.fromCharCode('A'.charCodeAt(0) + idx),
      })),
    }));
  };

  return (
    <div>
      <h2>Specimens</h2>
      <p className="dim">
        Enter each specimen designation. CPT is auto-suggested; edit if needed.
      </p>

      {caseState.specimens.map((s, i) => (
        <div key={i} className="specimen-block">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 18, minWidth: 28, paddingTop: 8 }}>{s.letter}.</div>
            <div className="field" style={{ marginBottom: 0, flex: 2 }}>
              <label>Designation</label>
              <input
                type="text"
                value={s.designation}
                onChange={(e) => updateRow(i, { designation: e.target.value })}
              />
            </div>
            <div className="field" style={{ marginBottom: 0, flex: '0 0 90px' }}>
              <label>CPT</label>
              <input
                type="text"
                value={s.cpt || ''}
                onChange={(e) => updateRow(i, { cpt: e.target.value })}
              />
            </div>
            <div style={{ paddingTop: 20 }}>
              <button className="danger" onClick={() => removeRow(i)}>Remove</button>
            </div>
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Diagnosis</label>
            <textarea
              value={s.diagnosis || ''}
              onChange={(e) => updateRow(i, { diagnosis: e.target.value })}
              placeholder={i === 0
                ? 'Primary diagnosis — auto-generated from CAP synoptic if left blank'
                : 'e.g. NEGATIVE FOR DCIS AND INVASIVE CARCINOMA'}
              style={{ minHeight: 56 }}
            />
          </div>
        </div>
      ))}

      <div className="row" style={{ marginTop: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Next specimen ({nextLetter(caseState.specimens)})</label>
          <input
            type="text"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSpecimen(); }}
            placeholder='e.g. "Left lumpectomy" or "Additional superior margin"'
          />
        </div>
        <div>
          <VoiceInput onTranscript={(t) => setDesignation(t)} />
        </div>
        <div>
          <button className="primary" onClick={addSpecimen}>Add</button>
        </div>
      </div>
    </div>
  );
}
