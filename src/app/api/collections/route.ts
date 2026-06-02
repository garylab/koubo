import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { requireUserId, jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const rows = await db
      .select()
      .from(collection)
      .where(eq(collection.userId, userId))
      .orderBy(desc(collection.isDefault), desc(collection.updatedAt));
    return Response.json(rows);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return Response.json({ error: "name required" }, { status: 400 });
    }
    const db = getDb();
    const [row] = await db
      .insert(collection)
      .values({ userId, name, isDefault: false })
      .returning();
    revalidatePath("/collections");
    revalidatePath("/scripts");
    return Response.json(row, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
