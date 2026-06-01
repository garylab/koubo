import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Embeddings via Cloudflare Workers AI (bge-m3, 1024-dim, multilingual incl. Chinese).
export const EMBED_DIM = 1024;
export const EMBED_MODEL = "@cf/baai/bge-m3" as const;

// Chat completion stays on OpenAI for now — Workers AI text models lag in Chinese quality.
export const CHAT_MODEL = "gpt-4o-mini";

function openaiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return key;
}

export async function embedText(text: string): Promise<number[]> {
  const { env } = getCloudflareContext();
  const result = (await env.AI.run(EMBED_MODEL, { text: [text] })) as {
    shape: number[];
    data: number[][];
  };
  if (!result.data?.[0]) throw new Error("embedding response missing data[0]");
  return result.data[0];
}

export async function streamChatCompletion(opts: {
  system: string;
  user: string;
  signal?: AbortSignal;
}): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey()}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal: opts.signal,
  });
}
