import Anthropic from '@anthropic-ai/sdk';

function toAnthropicTools(schemas) {
  return schemas.map((s) => ({
    name: s.name,
    description: s.description,
    input_schema: s.input_schema,
  }));
}

export async function runAnthropicTurn({
  apiKey,
  model = 'claude-opus-4-7',
  system,
  messages,
  tools,
  maxTokens = 2048,
}) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    tools: toAnthropicTools(tools),
    messages,
  });

  const toolCalls = [];
  const textParts = [];
  for (const block of response.content || []) {
    if (block.type === 'text') textParts.push(block.text);
    else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, input: block.input });
    }
  }

  return {
    assistantContent: response.content,
    text: textParts.join('\n').trim(),
    toolCalls,
    stopReason: response.stop_reason,
    usage: response.usage,
  };
}

export function buildAnthropicToolResultMessage(toolCalls, results) {
  return {
    role: 'user',
    content: toolCalls.map((tc, i) => ({
      type: 'tool_result',
      tool_use_id: tc.id,
      content: JSON.stringify(results[i] ?? {}),
    })),
  };
}
