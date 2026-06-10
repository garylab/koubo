import { requireUserId, jsonError } from "@/lib/api-helpers";
import { chatCompletion } from "@/lib/ai";
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

    const result = await chatCompletion({
      system: AI_MODE_PROMPT[aiMode],
      user: content,
    });

    return Response.json({ content: result });
  } catch (err) {
    return jsonError(err);
  }
}
