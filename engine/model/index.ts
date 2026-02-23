import type { ContextMessage, Config } from '../types.ts';
/** Call the OpenRouter model with the context array and return the raw response text. */
export const callModel = async (context: ContextMessage[], config: Config): Promise<string> => {
  const apiKey = process.env[`OPENROUTER_API_KEY`];
  if ((!apiKey)) {
    throw new Error(`OPENROUTER_API_KEY environment variable is not set`);
  }
  const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
    method: `POST`,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `application/json`,
    },
    body: JSON.stringify({ model: config.model, messages: context }),
  });
  if ((!response.ok)) {
    const body = await response.text();
    throw new Error(`Model API error: ${response.status} ${response.statusText} — ${body}`);
  }
  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
};
