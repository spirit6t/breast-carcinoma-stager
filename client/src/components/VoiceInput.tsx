import { useEffect, useRef, useState } from 'react';

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  start(): void;
  stop(): void;
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Props {
  onTranscript: (text: string) => void;
  label?: string;
}

export function VoiceInput({ onTranscript, label = '🎤 Dictate' }: Props) {
  const Ctor = getRecognitionCtor();
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => { recRef.current?.stop(); };
  }, []);

  if (!Ctor) {
    return <span className="dim">(voice unavailable — use Chrome)</span>;
  }

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim();
      if (text) onTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button type="button" onClick={toggle} className={listening ? 'primary' : ''}>
      {listening ? '⏹ Stop' : label}
    </button>
  );
}
