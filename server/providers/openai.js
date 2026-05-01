import OpenAI from 'openai';

function toOpenAITools(schemas) {
  return schemas.map((s) => ({
    type: 'function',
    function: {
      name: s.name,
      description: s.description,
      parameters: s.input_schema,
    },
  }));
}

export async function runOpenAITurn({
  apiKey,
  model = 'gpt-4o',
  system,
  messages,
  tools,
}) {
  const client = new OpenAI({ apiKey });
  const chatMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model,
    messages: chatMessages,
    tools: toOpenAITools(tools),
    tool_choice: 'auto',
  });

  const msg = response.choices[0]?.message;
  const toolCalls = (msg?.tool_calls || []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    input: (() => {
      try { return JSON.parse(tc.function.arguments || '{}'); }
      catch { return {}; }
    })(),
  }));

  return {
    assistantMessage: msg,
    text: msg?.content || '',
    toolCalls,
    stopReason: response.choices[0]?.finish_reason,
    usage: response.usage,
  };
}

export function buildOpenAIToolResultMessages(assistantMessage, toolCalls, results) {
  return [
    assistantMessage,
    ...toolCalls.map((tc, i) => ({
      role: 'tool',
      tool_call_id: tc.id,
      content: JSON.stringify(results[i] ?? {}),
    })),
  ];
}
