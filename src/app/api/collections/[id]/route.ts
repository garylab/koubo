import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { parseId, requireCollection, requireUserId, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = parseId((await params).id);
    const userId = await requireUserId();
    await requireCollection(id, userId);
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) return Response.json({ error: "name required" }, { status: 400 });
    const db = getDb();
    const [row] = await db
      .update(collection)
      .set({ name, updatedAt: new Date() })
      .where(eq(collection.id, id))
      .returning();
    revalidatePath("/collections");
    revalidatePath("/scripts");
    return Response.json(row);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = parseId((await params).id);
    const userId = await requireUserId();
    const existing = await requireCollection(id, userId);
    if (existing.isDefault) {
      return Response.json(
        { error: "默认稿件集不可删除" },
        { status: 400 },
      );
    }
    const db = getDb();
    await db.delete(collection).where(eq(collection.id, id));
    revalidatePath("/collections");
    revalidatePath("/scripts");
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
