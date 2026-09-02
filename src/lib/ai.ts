import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// === Embeddings: bge-m3 (multilingual, strong Chinese), 1024-dim ===
// Embeddings keep running on Workers AI — only chat moved to OpenAI.
export const EMBED_DIM = 1024;
export const EMBED_MODEL = "@cf/baai/bge-m3" as const;

// === Chat: OpenAI ===
// Override via OPENAI_CHAT_MODEL / OPENAI_TITLE_MODEL secrets without redeploy.
const DEFAULT_CHAT_MODEL = "gpt-5.5";
const DEFAULT_TITLE_MODEL = "gpt-5.5";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function openaiKey(): string {
  const { env } = getCloudflareContext();
  const key = (env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return key;
}

function chatModel(): string {
  const { env } = getCloudflareContext();
  return (env as unknown as { OPENAI_CHAT_MODEL?: string }).OPENAI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

function titleModel(): string {
  const { env } = getCloudflareContext();
  return (env as unknown as { OPENAI_TITLE_MODEL?: string }).OPENAI_TITLE_MODEL || DEFAULT_TITLE_MODEL;
}

async function openaiChat(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const { max_tokens, temperature: _temperature, ...rest } = opts;
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...rest,
      stream: false,
      ...(max_tokens != null ? { max_completion_tokens: max_tokens } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
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

/**
 * Collapse any run of 2+ newlines into a single newline and trim ends.
 * Talking-head scripts read as one tight block — blank lines between
 * paragraphs are visual noise the user doesn't want.
 */
function tightenWhitespace(s: string): string {
  return s.replace(/\n[ \t]*\n+/g, "\n").trim();
}

/**
 * One-shot chat completion via OpenAI. Returns the full assistant message,
 * with blank lines between paragraphs collapsed.
 */
export async function chatCompletion(opts: {
  system: string;
  user: string;
}): Promise<string> {
  const raw = await openaiChat({
    model: chatModel(),
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: 2048,
  });
  return tightenWhitespace(raw);
}

const TITLE_PROMPT = `你是给视频稿件起标题的助手。读完用户给的稿件内容，给一个最多 10 个中文字的标题，要求：
- 直接概括内容，不要营销词、不要悬念、不要标点符号
- 不要带书名号、引号、冒号、emoji
- 最多 10 个中文字，超过就不合格
- 只返回标题本身，不要任何其他文字、说明、Markdown`;

/**
 * Given samples from the user's existing scripts, ask the model to infer
 * topic + style and propose 7 fresh **titles** (口播主题) — no bodies.
 * The user picks which titles to add to the library and writes content later.
 */
export async function inspireTitles(opts: {
  samples: { title: string; content: string }[];
  collectionName?: string | null;
  count?: number;
}): Promise<string[]> {
  const count = opts.count ?? 7;
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

  const system = `你是口播视频稿创意助手。根据用户已有的稿件，推断他的话题领域和语调，然后给出 ${count} 个**全新**的口播主题标题。

标题准则（强制）：
- 每个标题就是一个具体的口播主题，看到就知道要讲什么。
- 必须具体、有钩子，二选一：
  (a) 一个具体的人/事/场景（"外卖小哥的破本子"、"上海只开三小时的面馆"）；
  (b) 一个具体的数字、对比或反常识的事实（"1400 万人在做这件事"、"做了 10 年才发现的错"）。
- 每个标题最多 22 个中文字。
- 禁止使用抽象词：心态、格局、底层逻辑、本质、认知、思考、启示、感悟、价值、意义、重要性、不可或缺、提升自我。
- 禁止"我的思考"、"关于 XX"、"聊聊 XX"、"XX 的重要性"这种万能标题。
- 不要标点、书名号、引号、emoji、Markdown。
- ${count} 个标题话题要分散，别都挤在同一个子话题里。
- 不要直接抄样本里的标题；样本只用来判断方向和说话风格。

输出格式严格如下（每行一个标题，共 ${count} 行，除此之外不输出任何其他文字）：
1. <标题1>
2. <标题2>
...`;

  const user = `${ctx}已有稿件样本如下，请据此生成 ${count} 个全新的口播主题标题：\n\n${sampleBlock}`;

  const raw = (
    await openaiChat({
      model: chatModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 600,
    })
  ).trim();

  const titles: string[] = [];
  for (const line of raw.split("\n")) {
    let t = line.trim();
    if (!t) continue;
    // Strip leading "1. ", "1) ", "1、", "- ", "* " etc.
    t = t.replace(/^\s*(?:\d+[.\)、]|[-*•])\s*/, "").trim();
    // Strip surrounding quotes/brackets/punctuation.
    t = t.replace(/^[\s"'`《「『（(【\[]+|[\s"'`》」』）)】\]。．.！!？?]+$/g, "");
    if (!t) continue;
    const chars = Array.from(t);
    if (chars.length > 22) t = chars.slice(0, 22).join("");
    titles.push(t);
    if (titles.length >= count) break;
  }
  return titles;
}

export async function generateTitle(content: string): Promise<string> {
  const trimmed = content.trim().slice(0, 2000);
  if (!trimmed) return "";
  let title = (
    await openaiChat({
      model: titleModel(),
      messages: [
        { role: "system", content: TITLE_PROMPT },
        { role: "user", content: trimmed },
      ],
      max_tokens: 40,
    })
  ).trim();
  // Strip surrounding quotes/brackets/punctuation the model might add.
  title = title.replace(/^[\s"'`《「『（(【\[]+|[\s"'`》」』）)】\]。．.！!？?]+$/g, "");
  // Cap length conservatively (10 chars, counting any unicode codepoint).
  const chars = Array.from(title);
  if (chars.length > 10) title = chars.slice(0, 10).join("");
  return title;
}
