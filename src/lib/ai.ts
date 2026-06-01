import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// === Embeddings: bge-m3 (multilingual, strong Chinese), 1024-dim ===
export const EMBED_DIM = 1024;
export const EMBED_MODEL = "@cf/baai/bge-m3" as const;

// === Chat: Qwen 1.5 14B chat (AWQ-quantized) — best CN model on Workers AI ===
export const CHAT_MODEL = "@cf/qwen/qwen1.5-14b-chat-awq" as const;

export async function embedText(text: string): Promise<number[]> {
  const { env } = getCloudflareContext();
  const result = (await env.AI.run(EMBED_MODEL, { text: [text] })) as {
    shape: number[];
    data: number[][];
  };
  if (!result.data?.[0]) throw new Error("embedding response missing data[0]");
  return result.data[0];
}

/**
 * Streams chat completion via Workers AI. Returns the raw SSE
 * ReadableStream that the route handler will transform into a plain
 * text stream for the browser.
 */
export async function streamChatCompletion(opts: {
  system: string;
  user: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { env } = getCloudflareContext();
  const stream = (await env.AI.run(CHAT_MODEL, {
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    stream: true,
    max_tokens: 2048,
  })) as ReadableStream<Uint8Array>;
  return stream;
}
