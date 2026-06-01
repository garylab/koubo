import { requireUserId, jsonError } from "@/lib/api-helpers";
import { streamChatCompletion } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `你是口播视频稿优化助手。请重写用户提供的视频稿，让它：
1. 更口语化、节奏更自然，适合录制；
2. 保留原意，不要添加新的事实信息；
3. 句子短而有力，避免书面语；
4. 直接返回优化后的文本，不要任何前后说明或标题。`;

export async function POST(req: Request) {
  try {
    await requireUserId();
    const { content } = (await req.json()) as { content?: string };
    if (!content || typeof content !== "string" || !content.trim()) {
      return Response.json({ error: "content required" }, { status: 400 });
    }

    const upstream = await streamChatCompletion({
      system: SYSTEM_PROMPT,
      user: content,
    });

    // Workers AI streams SSE: `data: {"response":"chunk"}\n\n` ... `data: [DONE]`
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const transformer = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as { response?: string };
            if (json.response) controller.enqueue(encoder.encode(json.response));
          } catch {
            // ignore partial JSON across boundaries
          }
        }
      },
    });

    return new Response(upstream.pipeThrough(transformer), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
