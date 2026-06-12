import { requireUserId, jsonError } from "@/lib/api-helpers";
import { chatCompletion } from "@/lib/ai";
import {
  AI_MODE_PROMPT,
  customModePrompt,
  isAiMode,
  type AiMode,
} from "@/lib/ai-modes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CUSTOM_PROMPT_MAX = 500;

export async function POST(req: Request) {
  try {
    await requireUserId();
    const { content, mode, customPrompt } = (await req.json()) as {
      content?: string;
      mode?: string;
      customPrompt?: string;
    };
    if (!content || typeof content !== "string" || !content.trim()) {
      return Response.json({ error: "content required" }, { status: 400 });
    }

    let system: string;
    if (mode === "custom") {
      const instr = (customPrompt ?? "").trim();
      if (!instr) {
        return Response.json({ error: "customPrompt required" }, { status: 400 });
      }
      system = customModePrompt(instr.slice(0, CUSTOM_PROMPT_MAX));
    } else {
      const aiMode: AiMode = isAiMode(mode) ? mode : "optimize";
      system = AI_MODE_PROMPT[aiMode];
    }

    const result = await chatCompletion({ system, user: content });
    return Response.json({ content: result });
  } catch (err) {
    return jsonError(err);
  }
}
