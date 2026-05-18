/**
 * Provider-agnostic agent loop.
 * Client posts { provider, apiKey, model, caseState, userMessage, history }.
 * Server runs up to N tool-call rounds and returns:
 *   { case, assistantText, toolEvents, clarifications, history }
 *
 * History is returned so client can persist/replay the conversation.
 */

import { TOOL_SCHEMAS, SYSTEM_PROMPT, executeTool } from './agentTools.js';
import { ENDO_TOOL_SCHEMAS, ENDO_SYSTEM_PROMPT, executeEndoTool } from './endometrial/agentTools.js';
import {
  runAnthropicTurn,
  buildAnthropicToolResultMessage,
} from './providers/anthropic.js';
import {
  runOpenAITurn,
  buildOpenAIToolResultMessages,
} from './providers/openai.js';

const MAX_ROUNDS = 6;

export async function runAgent({ provider, apiKey, model, caseState, userMessage, history = [] }) {
  if (!apiKey) throw new Error('Missing API key');
  if (provider !== 'anthropic' && provider !== 'openai') {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const isEndo = caseState?.organ === 'endometrium';
  const tools   = isEndo ? ENDO_TOOL_SCHEMAS   : TOOL_SCHEMAS;
  const sysPrompt = isEndo ? ENDO_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const execTool  = isEndo ? executeEndoTool    : executeTool;

  let currentCase = caseState;
  const toolEvents = [];
  const clarifications = [];
  let assistantText = '';

  // Thread history: per-provider since content shapes differ.
  let threadMessages = [...history];

  // Inject latest user message (text + compact case snapshot so model has context).
  const userBlock = {
    role: 'user',
    content:
      provider === 'anthropic'
        ? [
            {
              type: 'text',
              text:
                `USER MESSAGE:\n${userMessage || '(no new message)'}\n\n` +
                `CURRENT CASE (JSON):\n${JSON.stringify(currentCase, null, 2)}`,
            },
          ]
        : `USER MESSAGE:\n${userMessage || '(no new message)'}\n\nCURRENT CASE (JSON):\n${JSON.stringify(currentCase, null, 2)}`,
  };
  threadMessages.push(userBlock);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let turn;
    if (provider === 'anthropic') {
      turn = await runAnthropicTurn({
        apiKey,
        model: model || 'claude-opus-4-7',
        system: sysPrompt,
        messages: threadMessages,
        tools,
      });
    } else {
      turn = await runOpenAITurn({
        apiKey,
        model: model || 'gpt-4o',
        system: sysPrompt,
        messages: threadMessages,
        tools,
      });
    }

    if (turn.text) assistantText = turn.text;

    if (!turn.toolCalls.length) {
      // Model produced final text; commit assistant message and stop.
      if (provider === 'anthropic') {
        threadMessages.push({ role: 'assistant', content: turn.assistantContent });
      } else {
        threadMessages.push(turn.assistantMessage);
      }
      break;
    }

    const results = [];
    for (const tc of turn.toolCalls) {
      const r = execTool(tc.name, tc.input || {}, currentCase);
      if (r.error) {
        results.push({ error: r.error });
      } else {
        if (r.case) currentCase = r.case;
        if (r.result?.ask) clarifications.push(r.result.ask);
        toolEvents.push({ name: tc.name, input: tc.input, result: r.result });
        results.push(r.result ?? { ok: true });
      }
    }

    // Feed tool results back for the next turn.
    if (provider === 'anthropic') {
      threadMessages.push({ role: 'assistant', content: turn.assistantContent });
      threadMessages.push(buildAnthropicToolResultMessage(turn.toolCalls, results));
    } else {
      const [assistantMsg, ...toolMsgs] = buildOpenAIToolResultMessages(
        turn.assistantMessage,
        turn.toolCalls,
        results
      );
      threadMessages.push(assistantMsg, ...toolMsgs);
    }
  }

  return {
    case: currentCase,
    assistantText,
    toolEvents,
    clarifications,
    history: threadMessages,
  };
}
