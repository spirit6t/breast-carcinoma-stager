import { useRef, useState } from 'react';
import type { AnyCase, Settings } from '../lib/types';
import { agentStep } from '../lib/api';
import { VoiceInput } from './VoiceInput';

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Block heading: **Block 5 — ...** or *Block 5 ...* or BLOCK 5 —
    const isHeading =
      /^\*{1,2}Block\s+\d+/i.test(trimmed) ||
      /^BLOCK\s+\d+\s*[—–\-]/i.test(trimmed);

    if (isHeading) {
      const clean = trimmed.replace(/^\*+/, '').replace(/\*+:?\s*$/, '').replace(/:$/, '').trim();
      elements.push(<div key={key++} className="msg-block-heading">{clean}</div>);
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <div key={key++} className="msg-question">
          <span className="msg-q-num">{trimmed.match(/^\d+/)![0]}.</span>
          <span>{renderInline(trimmed.replace(/^\d+\.\s*/, ''))}</span>
        </div>
      );
    } else if (/^[•\-]\s/.test(trimmed)) {
      elements.push(
        <div key={key++} className="msg-list-item">
          {renderInline(trimmed.replace(/^[•\-]\s*/, ''))}
        </div>
      );
    } else if (trimmed === '') {
      elements.push(<div key={key++} className="msg-spacer" />);
    } else {
      elements.push(
        <div key={key++} className="msg-line">{renderInline(line)}</div>
      );
    }
  }

  return <div className="msg-formatted">{elements}</div>;
}

interface Props {
  caseState: AnyCase;
  settings: Settings;
  onCaseUpdate: (c: AnyCase) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

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
    if (!override) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
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

      <div className="chat">
        {chat.length === 0 && (
          <div className="start-options">
            <div className="start-option" onClick={() => !busy && apiKey && send('Begin the case interview step by step.')}>
              <div className="start-option-icon">▶</div>
              <div>
                <div className="start-option-title">Step-by-Step Interview</div>
                <div className="start-option-desc">
                  The agent guides you block by block, asking focused questions one section at a time.
                </div>
              </div>
            </div>
            <div className="start-option" onClick={() => !busy && apiKey && send('I will dictate all case details at once. Please listen carefully, extract every CAP field you can from my dictation, then ask me targeted clarifying questions for anything missing or ambiguous.')}>
              <div className="start-option-icon">🎙</div>
              <div>
                <div className="start-option-title">Bulk Dictation</div>
                <div className="start-option-desc">
                  Dictate everything at once — the agent fills in the fields and follows up on gaps.
                </div>
              </div>
            </div>
            {!apiKey && (
              <div className="dim" style={{ textAlign: 'center', marginTop: 4 }}>
                Set an API key in Settings to begin.
              </div>
            )}
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant'
              ? <FormattedMessage text={m.text} />
              : m.text}
          </div>
        ))}
      </div>

      <div className="field">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); grow(e.target); }}
          placeholder="Message or dictate…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
          rows={3}
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
