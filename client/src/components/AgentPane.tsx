import { useState } from 'react';
import type { CaseData, Settings } from '../lib/types';
import { agentStep } from '../lib/api';
import { VoiceInput } from './VoiceInput';

interface Props {
  caseState: CaseData;
  settings: Settings;
  onCaseUpdate: (c: CaseData) => void;
  openSettings: () => void;
  onReportAssembled?: () => void;
}

interface ChatMsg {
  role: 'user' | 'assistant' | 'tool';
  text: string;
}

export function AgentPane({ caseState, settings, onCaseUpdate, openSettings, onReportAssembled }: Props) {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey =
    settings.provider === 'anthropic' ? settings.claudeApiKey : settings.openaiApiKey;

  const send = async (override?: string) => {
    const msg = (override ?? input).trim();
    if (!msg || busy) return;
    const hasKey = Boolean(apiKey);
    if (!hasKey) {
      setError('Set an API key in Settings first.');
      return;
    }
    setBusy(true);
    setError(null);
    setChat((c) => [...c, { role: 'user', text: msg }]);
    if (!override) setInput('');
    try {
      const resp = await agentStep({ settings, caseState, userMessage: msg, history });
      onCaseUpdate(resp.case);
      setHistory(resp.history);
      const toolLines = (resp.toolEvents || []).map(
        (e) => `→ ${e.name}(${JSON.stringify(e.input)})`
      );
      if ((resp.toolEvents || []).some((e) => e.name === 'assemble_report')) {
        onReportAssembled?.();
      }
      setChat((c) => [
        ...c,
        ...(toolLines.length ? [{ role: 'tool' as const, text: toolLines.join('\n') }] : []),
        {
          role: 'assistant',
          text:
            resp.assistantText ||
            (resp.clarifications?.length
              ? resp.clarifications.map((q) => `Q: ${q.question}`).join('\n')
              : '(no reply)'),
        },
      ]);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="agentpane">
      <h2>
        Agent ({settings.provider === 'anthropic' ? 'Claude' : 'ChatGPT'})
        <button
          onClick={openSettings}
          style={{ float: 'right', padding: '2px 8px', fontSize: 12 }}
        >
          ⚙
        </button>
      </h2>

      {chat.length === 0 && (
        <div style={{ marginBottom: 10 }}>
          <button
            className="primary"
            style={{ width: '100%', padding: '10px 0', fontSize: 13 }}
            onClick={() => { send('Begin the case interview.'); }}
            disabled={busy || !apiKey}
          >
            ▶ Begin Case Interview
          </button>
          <div className="dim" style={{ marginTop: 8 }}>
            Or type / dictate case details directly. The agent will fill CAP fields,
            score Nottingham grade, compute pTNM, record IHC, and assemble the final report.
          </div>
        </div>
      )}

      <div className="chat">
        {chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>{m.text}</div>
        ))}
      </div>


      <div className="field">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message or dictate…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <VoiceInput onTranscript={(t) => setInput((s) => s ? `${s} ${t}` : t)} />
          <button className="primary" onClick={() => send()} disabled={busy}>
            {busy ? 'Thinking…' : 'Send'}
          </button>
        </div>
        {error && <div className="warn" style={{ color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
      </div>
    </aside>
  );
}
