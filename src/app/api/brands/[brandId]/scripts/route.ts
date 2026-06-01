import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { script } from "@/lib/db/schema";
import { requireBrand, requireUserId, jsonError } from "@/lib/api-helpers";
import { defer } from "@/lib/defer";
import { recomputeScriptEmbeddingAndSimilarity } from "@/lib/similarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const userId = await requireUserId();
    await requireBrand(brandId, userId);
    const db = getDb();
    const rows = await db
      .select({
        id: script.id,
        title: script.title,
        updatedAt: script.updatedAt,
        embeddingUpdatedAt: script.embeddingUpdatedAt,
      })
      .from(script)
      .where(eq(script.brandId, brandId))
      .orderBy(desc(script.updatedAt));
    return Response.json(rows);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const userId = await requireUserId();
    await requireBrand(brandId, userId);
    const body = (await req.json()) as { title?: string; content?: string };
    const title = body.title?.trim() || "未命名稿件";
    const content = body.content ?? "";

    const db = getDb();
    const [row] = await db
      .insert(script)
      .values({ brandId, title, content })
      .returning();

    if (content.trim()) {
      defer(recomputeScriptEmbeddingAndSimilarity(row.id));
    }

    return Response.json(row, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
