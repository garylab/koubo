import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { brand } from "@/lib/db/schema";
import { requireBrand, requireUserId, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const userId = await requireUserId();
    await requireBrand(brandId, userId);
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) return Response.json({ error: "name required" }, { status: 400 });
    const db = getDb();
    const [row] = await db
      .update(brand)
      .set({ name, updatedAt: new Date() })
      .where(eq(brand.id, brandId))
      .returning();
    return Response.json(row);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const userId = await requireUserId();
    await requireBrand(brandId, userId);
    const db = getDb();
    await db.delete(brand).where(eq(brand.id, brandId));
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
