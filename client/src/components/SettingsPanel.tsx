import { useState } from 'react';
import type { Settings } from '../lib/types';

interface Props {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Settings</h3>

        <div className="field">
          <label>LLM Provider</label>
          <div className="chip-row">
            <button
              className={`chip ${draft.provider === 'anthropic' ? 'active' : ''}`}
              onClick={() => setDraft({ ...draft, provider: 'anthropic' })}
            >
              Claude
            </button>
            <button
              className={`chip ${draft.provider === 'openai' ? 'active' : ''}`}
              onClick={() => setDraft({ ...draft, provider: 'openai' })}
            >
              ChatGPT
            </button>
          </div>
        </div>

        <div className="field">
          <label>Anthropic API Key</label>
          <input
            type="text"
            value={draft.claudeApiKey}
            onChange={(e) => setDraft({ ...draft, claudeApiKey: e.target.value })}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label>Claude Model</label>
          <input
            type="text"
            value={draft.claudeModel}
            onChange={(e) => setDraft({ ...draft, claudeModel: e.target.value })}
          />
        </div>

        <div className="field">
          <label>OpenAI API Key</label>
          <input
            type="text"
            value={draft.openaiApiKey}
            onChange={(e) => setDraft({ ...draft, openaiApiKey: e.target.value })}
            placeholder="sk-..."
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label>OpenAI Model</label>
          <input
            type="text"
            value={draft.openaiModel}
            onChange={(e) => setDraft({ ...draft, openaiModel: e.target.value })}
          />
        </div>

        <div className="warn">
          Keys are stored in your browser's localStorage and sent to the local server per request.
          Do not use on shared computers.
        </div>

        <div className="actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => { onSave(draft); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
