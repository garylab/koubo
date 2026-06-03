import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// === Embeddings: bge-m3 (multilingual, strong Chinese), 1024-dim ===
export const EMBED_DIM = 1024;
export const EMBED_MODEL = "@cf/baai/bge-m3" as const;

// === Chat: Llama 3.3 70B Instruct (FP8, fast) ===
export const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;

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

const TITLE_PROMPT = `你是给视频稿件起标题的助手。读完用户给的稿件内容，给一个最多 10 个中文字的标题，要求：
- 直接概括内容，不要营销词、不要悬念、不要标点符号
- 不要带书名号、引号、冒号、emoji
- 最多 10 个中文字，超过就不合格
- 只返回标题本身，不要任何其他文字、说明、Markdown`;

/**
 * Generate a short Chinese title (≤ 10 chars) from script content.
 * Strips quotes/punctuation/whitespace and truncates to 10 chars as a safety
 * net in case the model ignores the constraint.
 */
export async function generateTitle(content: string): Promise<string> {
  const { env } = getCloudflareContext();
  const trimmed = content.trim().slice(0, 2000);
  if (!trimmed) return "";
  const res = (await env.AI.run(CHAT_MODEL, {
    messages: [
      { role: "system", content: TITLE_PROMPT },
      { role: "user", content: trimmed },
    ],
    stream: false,
    max_tokens: 40,
  })) as { response?: string };
  let title = (res.response ?? "").trim();
  // Strip surrounding quotes/brackets/punctuation the model might add.
  title = title.replace(/^[\s"'`《「『（(【\[]+|[\s"'`》」』）)】\]。．.！!？?]+$/g, "");
  // Cap length conservatively (10 chars, counting any unicode codepoint).
  const chars = Array.from(title);
  if (chars.length > 10) title = chars.slice(0, 10).join("");
  return title;
}
