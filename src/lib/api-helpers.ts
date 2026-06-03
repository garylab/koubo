import "server-only";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "./session";
import { getDb } from "./db/client";
import { collection, script } from "./db/schema";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUserId(): Promise<number> {
  const session = await getServerSession();
  if (!session) throw new HttpError(401, "Unauthorized");
  // Better-Auth (with useNumberId) stores user.id as a number in the DB but
  // exposes it as a string on the session object. Coerce here so callers
  // always work with numbers.
  const id = Number(session.user.id);
  if (!Number.isFinite(id)) throw new HttpError(401, "Invalid session");
  return id;
}

/**
 * Parse a route param (URL string) as a positive integer id; throw 404 on bad input.
 */
export function parseId(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, "Not found");
  return n;
}

export async function requireCollection(collectionId: number, userId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collection)
    .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)));
  if (!row) throw new HttpError(404, "Collection not found");
  return row;
}

export async function requireScript(scriptId: number, userId: number) {
  const db = getDb();
  const [row] = await db
    .select({ script, collection })
    .from(script)
    .innerJoin(collection, eq(collection.id, script.collectionId))
    .where(and(eq(script.id, scriptId), eq(collection.userId, userId)));
  if (!row) throw new HttpError(404, "Script not found");
  return row;
}

const DEFAULT_NAME = "默认";

/**
 * Returns the user's default collection, creating it if missing.
 * Used as the fallback target for scripts created without an explicit collection.
 */
export async function getOrCreateDefaultCollection(userId: number) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(collection)
    .where(and(eq(collection.userId, userId), eq(collection.isDefault, true)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(collection)
    .values({ userId, name: DEFAULT_NAME, isDefault: true })
    .returning();
  return created;
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
