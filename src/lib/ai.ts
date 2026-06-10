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
  const { max_tokens, ...rest } = opts;
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
 * One-shot chat completion via OpenAI. Returns the full assistant message.
 */
export async function chatCompletion(opts: {
  system: string;
  user: string;
}): Promise<string> {
  return openaiChat({
    model: chatModel(),
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: 2048,
  });
}

const TITLE_PROMPT = `你是给视频稿件起标题的助手。读完用户给的稿件内容，给一个最多 10 个中文字的标题，要求：
- 直接概括内容，不要营销词、不要悬念、不要标点符号
- 不要带书名号、引号、冒号、emoji
- 最多 10 个中文字，超过就不合格
- 只返回标题本身，不要任何其他文字、说明、Markdown`;

/**
 * Given samples from the user's existing scripts, ask the model to infer
 * topic + style and propose a fresh one. Returns { title, content }.
 */
export async function inspireScript(opts: {
  samples: { title: string; content: string }[];
  collectionName?: string | null;
}): Promise<{ title: string; content: string }> {
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

  const system = `你是口播视频稿创意助手。根据用户已有的稿件，推断他的话题领域和语调，然后给一条**全新**的开场口播稿。

写作准则（强制）：
- 这是要对着镜头讲出来的，不是公众号文章。短句、口语、像在跟人聊天。
- **必须有具体内容**。开头第一句就要落到一个具体的钩子上，二选一：
  (a) 一个具体的人/事/场景（"我前两天看到一个外卖小哥…"、"上海有家面馆只开三小时…"）；
  (b) 一个具体的数字、对比或反常识的事实（"全中国有 1400 万人在做这件事"、"做了 10 年才发现一开始就错了"）。
  禁止用万能名词开场，比如"今天聊聊…"、"很多人都不知道…"、"在当今社会…"、"我们经常会发现…"。
- 必须有观点或者悬念推进，不能只是描述。讲完钩子要往前推一句，给一个**结论、矛盾或者反问**，让观众想继续听。
- **严禁鸡汤抽象词**：心态、格局、底层逻辑、本质、认知、思考、启示、感悟、共鸣、价值、意义、重要性、关键所在、不可或缺、息息相关、提升自我、突破自我、与时俱进、积极向上。出现一个就不合格。
- **严禁书面连接词**：因此、然而、通过、旨在、进行、综上、不仅…而且、与此同时、在某种程度上。
- 不要"大家好"、"今天我们来聊聊"、"以上就是"这类套话。
- 不要列点、不要小标题、不要 Markdown。
- 标题最多 10 个中文字，不要标点、书名号、引号、emoji；标题要具体，不要"我的思考"、"关于 XX"这种。
- 内容长度：**120 到 220 个中文字**，必须用完整句子收尾（"。""！""？"）。少于 120 或多于 220 都不合格。
- 不要直接抄样本里的句子或人物；样本只用来判断话题方向和说话风格。

参考差距（必须像【好】那样写，不能像【坏】那样写）：
【坏】"今天聊聊创业的心态。很多创业者都会遇到困难，关键是要保持积极的认知，相信自己一定能突破。"
【好】"我认识一个开烧烤店的老哥，去年冬天店里一晚上只来过两桌客人，他在后厨蹲着哭。三个月后这家店外面排队两小时。他做的不是味道，是把每个回头客的口味记在一个破本子上，第二次去直接报名字上菜。"

输出格式严格如下（除此之外不输出任何文字、说明、Markdown）：
TITLE: <标题>
---
<内容>`;

  const user = `${ctx}已有稿件样本如下，请据此生成一篇全新的稿件创意：\n\n${sampleBlock}`;

  const raw = (
    await openaiChat({
      model: chatModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.95,
      max_tokens: 800,
    })
  ).trim();

  // Parse "TITLE: ...\n---\n<body>"
  const m = raw.match(/^TITLE:\s*(.+?)\s*\n---\s*\n([\s\S]+)$/);
  if (m) {
    let title = m[1].trim();
    title = title.replace(/^[\s"'`《「『（(【\[]+|[\s"'`》」』）)】\]。．.！!？?]+$/g, "");
    const tchars = Array.from(title);
    if (tchars.length > 10) title = tchars.slice(0, 10).join("");
    const content = m[2].trim();
    return { title, content };
  }
  // Fallback: treat first line as title.
  const lines = raw.split("\n");
  const firstLine = lines[0].replace(/^TITLE:\s*/i, "").trim();
  const rest = lines.slice(1).join("\n").replace(/^---\s*\n?/m, "").trim();
  const ft = Array.from(firstLine).slice(0, 10).join("");
  return { title: ft, content: rest || raw };
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
