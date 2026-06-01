import type { AnyCase, Settings } from './types';

export interface AgentStepResponse {
  case: AnyCase;
  assistantText: string;
  toolEvents: { name: string; input: unknown; result: unknown }[];
  clarifications: { field: string; question: string }[];
  history: unknown[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export function newCase(mode: string) {
  return postJson<AnyCase>('/api/case/new', { mode });
}

export function renderReport(caseState: AnyCase) {
  return postJson<{ reportText: string }>('/api/report', { case: caseState });
}

export function suggestSpecimenCpt(designation: string) {
  return postJson<{ cpt: string | null; label?: string }>('/api/billing/specimen-cpt', {
    designation,
  });
}

export function computeIhcBilling(ihc: (AnyCase & { ihc?: unknown[] })['ihc']) {
  return postJson<{ billing: { specimenLetter: string; entries: { antibody: string; cpt: string }[] }[] }>(
    '/api/billing/ihc',
    { ihc }
  );
}

export function agentStep(params: {
  settings: Settings;
  caseState: AnyCase;
  userMessage: string;
  history: unknown[];
}) {
  const { settings, caseState, userMessage, history } = params;
  const provider = settings.provider;
  const apiKey = provider === 'anthropic' ? settings.claudeApiKey : settings.openaiApiKey;
  const model = provider === 'anthropic' ? settings.claudeModel : settings.openaiModel;
  return postJson<AgentStepResponse>('/api/agent/step', {
    provider,
    apiKey,
    model,
    caseState,
    userMessage,
    history,
  });
}
