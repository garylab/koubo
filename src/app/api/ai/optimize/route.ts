import { requireUserId, jsonError } from "@/lib/api-helpers";
import { streamChatCompletion } from "@/lib/ai";
import { AI_MODE_PROMPT, isAiMode, type AiMode } from "@/lib/ai-modes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireUserId();
    const { content, mode } = (await req.json()) as {
      content?: string;
      mode?: string;
    };
    if (!content || typeof content !== "string" || !content.trim()) {
      return Response.json({ error: "content required" }, { status: 400 });
    }
    const aiMode: AiMode = isAiMode(mode) ? mode : "optimize";

    const upstream = await streamChatCompletion({
      system: AI_MODE_PROMPT[aiMode],
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
