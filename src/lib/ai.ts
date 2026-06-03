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
/**
 * Given samples from the user's existing scripts, ask the model to infer
 * topic + style and propose a fresh one. Returns { title, content }.
 */
export async function inspireScript(opts: {
  samples: { title: string; content: string }[];
  collectionName?: string | null;
}): Promise<{ title: string; content: string }> {
  const { env } = getCloudflareContext();
  const sampleBlock = opts.samples
    .map((s, i) => {
      const t = s.title.trim() || "(无标题)";
      const c = s.content.trim().slice(0, 400);
      return `[样本 ${i + 1}] 标题：${t}\n内容片段：${c}`;
    })
    .join("\n\n");
  const ctx = opts.collectionName
    ? `当前稿件集名："${opts.collectionName}"。`
    : "";

  const system = `你是口播视频稿创意助手。根据用户已有的稿件，推断他的话题领域和语调，然后生成一篇**全新**的稿件创意。

中文口播稿写作准则（必须严格遵守）：
- 像对镜头说话，不是写文章。每句念出来要顺、要短，单句尽量不超过 25 个字。
- 用口语，不用书面语。禁止"因此/然而/通过/旨在/进行/不仅…而且"，改用"所以/但是/你看/做/让"。
- 不要写成有 1/2/3 编号的清单。
- 不要"接下来我要讲""下面我们来看"这种纸面口吻。
- 不要"大家好我是XX""今天我们来聊聊""喜欢的话点个赞"这种万能套话。
- 不要凭空加事实、数据、人名。
- 不堆形容词、不喊口号、不抒情。

任务：
- 选题要在用户已有的话题领域内，但**完全是一个新角度、新切入点**，不要重复或改写样本里的任何一篇。
- 标题最多 10 个中文字，不要标点。
- 正文是一份能直接录制的完整口播稿，2-4 段。

输出格式严格如下（除此之外不输出任何文字、说明、Markdown）：
TITLE: <标题>
---
<正文>`;

  const user = `${ctx}已有稿件样本如下，请据此生成一篇全新的稿件创意：\n\n${sampleBlock}`;

  const res = (await env.AI.run(CHAT_MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    stream: false,
    max_tokens: 1200,
  })) as { response?: string };
  const raw = (res.response ?? "").trim();

  // Parse "TITLE: ...\n---\n<body>"
  const m = raw.match(/^TITLE:\s*(.+?)\s*\n---\s*\n([\s\S]+)$/);
  if (m) {
    let title = m[1].trim();
    title = title.replace(/^[\s"'`《「『（(【\[]+|[\s"'`》」』）)】\]。．.！!？?]+$/g, "");
    const chars = Array.from(title);
    if (chars.length > 10) title = chars.slice(0, 10).join("");
    return { title, content: m[2].trim() };
  }
  // Fallback: treat first line as title.
  const lines = raw.split("\n");
  const firstLine = lines[0].replace(/^TITLE:\s*/i, "").trim();
  const rest = lines.slice(1).join("\n").replace(/^---\s*\n?/m, "").trim();
  return { title: firstLine.slice(0, 10), content: rest || raw };
}

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
