import { useEffect, useState } from 'react';
import type { CaseData, IhcEntry } from '../lib/types';
import { computeIhcBilling } from '../lib/api';
import { VoiceInput } from '../components/VoiceInput';

interface Props {
  caseState: CaseData;
  update: (fn: (c: CaseData) => CaseData) => void;
}

function buildSentence(e: Pick<IhcEntry, 'block' | 'antibody' | 'finding'>) {
  if (!e.block || !e.antibody) return '';
  const finding = e.finding ? ` showing ${e.finding}` : '';
  return `Immunohistochemistry was performed on block ${e.block} for ${e.antibody}${finding}.`;
}

export function IHCStep({ caseState, update }: Props) {
  const [draft, setDraft] = useState<IhcEntry>({
    specimenLetter: caseState.specimens[0]?.letter || 'A',
    block: '',
    antibody: '',
    finding: '',
    sentence: '',
  });
  const [billing, setBilling] = useState<{ specimenLetter: string; entries: { antibody: string; cpt: string }[] }[]>([]);

  useEffect(() => {
    let active = true;
    computeIhcBilling(caseState.ihc)
      .then((r) => { if (active) setBilling(r.billing); })
      .catch(() => {});
    return () => { active = false; };
  }, [caseState.ihc]);

  const add = () => {
    if (!draft.specimenLetter || !draft.block || !draft.antibody) return;
    const sentence = draft.sentence.trim() || buildSentence(draft);
    const entry: IhcEntry = { ...draft, sentence };
    update((c) => ({ ...c, ihc: [...c.ihc, entry] }));
    setDraft({ ...draft, block: '', antibody: '', finding: '', sentence: '' });
  };

  const remove = (i: number) => {
    update((c) => ({ ...c, ihc: c.ihc.filter((_, idx) => idx !== i) }));
  };

  const autoSentence = buildSentence(draft);

  return (
    <div>
      <h2>Immunohistochemistry</h2>
      <p className="dim">
        Log each IHC per block. First distinct antibody per specimen = 88342, each additional = 88341. Ki-67 = 88360. Same antibody repeated on the same specimen is counted once.
      </p>

      <div className="row">
        <div className="field" style={{ maxWidth: 90 }}>
          <label>Specimen</label>
          <select
            value={draft.specimenLetter}
            onChange={(e) => setDraft({ ...draft, specimenLetter: e.target.value })}
          >
            {(caseState.specimens.length
              ? caseState.specimens.map((s) => s.letter)
              : ['A', 'B', 'C', 'D']
            ).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field" style={{ maxWidth: 110 }}>
          <label>Block</label>
          <input
            type="text"
            value={draft.block}
            onChange={(e) => setDraft({ ...draft, block: e.target.value })}
            placeholder="A1"
          />
        </div>
        <div className="field">
          <label>Antibody</label>
          <input
            type="text"
            value={draft.antibody}
            onChange={(e) => setDraft({ ...draft, antibody: e.target.value })}
            placeholder="SMM, E-cadherin, Ki-67, ..."
          />
        </div>
        <div className="field">
          <label>Finding</label>
          <input
            type="text"
            value={draft.finding}
            onChange={(e) => setDraft({ ...draft, finding: e.target.value })}
            placeholder="preserved myoepithelial layer ruling out invasive process"
          />
        </div>
      </div>

      <div className="field">
        <label>Sentence (auto; editable)</label>
        <textarea
          value={draft.sentence || autoSentence}
          onChange={(e) => setDraft({ ...draft, sentence: e.target.value })}
          placeholder={autoSentence}
        />
        <VoiceInput onTranscript={(t) => setDraft({ ...draft, sentence: t })} label="🎤 Dictate sentence" />
      </div>

      <div className="actions" style={{ justifyContent: 'flex-end', borderTop: 'none', paddingTop: 0 }}>
        <button className="primary" onClick={add}>Add IHC entry</button>
      </div>

      <h3>Log</h3>
      <table>
        <thead>
          <tr>
            <th>Spec</th><th>Block</th><th>Antibody</th><th>Sentence</th><th></th>
          </tr>
        </thead>
        <tbody>
          {caseState.ihc.map((e, i) => (
            <tr key={i}>
              <td>{e.specimenLetter}</td>
              <td>{e.block}</td>
              <td>{e.antibody}</td>
              <td style={{ fontSize: 12 }}>{e.sentence}</td>
              <td><button className="danger" onClick={() => remove(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Billing</h3>
      {billing.length === 0 ? (
        <p className="dim">No IHC logged yet.</p>
      ) : billing.map((b) => (
        <div key={b.specimenLetter} className="dim" style={{ marginBottom: 4 }}>
          <strong>{b.specimenLetter}:</strong>{' '}
          {b.entries.map((e) => `${e.antibody} ${e.cpt}`).join(', ')}
        </div>
      ))}
    </div>
  );
}
