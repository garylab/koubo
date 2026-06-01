import "server-only";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "./session";
import { getDb } from "./db/client";
import { brand, script } from "./db/schema";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session) throw new HttpError(401, "Unauthorized");
  return session.user.id;
}

export async function requireBrand(brandId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(brand)
    .where(and(eq(brand.id, brandId), eq(brand.userId, userId)));
  if (!row) throw new HttpError(404, "Brand not found");
  return row;
}

export async function requireScript(scriptId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ script, brand })
    .from(script)
    .innerJoin(brand, eq(brand.id, script.brandId))
    .where(and(eq(script.id, scriptId), eq(brand.userId, userId)));
  if (!row) throw new HttpError(404, "Script not found");
  return row;
}

export function jsonError(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json(
    { error: err instanceof Error ? err.message : "Internal error" },
    { status: 500 },
  );
}
