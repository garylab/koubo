import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { deriveTitle } from "@/lib/script-title";
import { CollectionChips } from "../_components/collection-chips";

export const dynamic = "force-dynamic";

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  const { c: activeCollectionId } = await searchParams;

  const db = getDb();
  const [collections, scripts] = await Promise.all([
    db
      .select({ id: collection.id, name: collection.name })
      .from(collection)
      .where(eq(collection.userId, session.user.id))
      .orderBy(desc(collection.isDefault), desc(collection.updatedAt)),
    db
      .select({
        id: script.id,
        collectionId: script.collectionId,
        collectionName: collection.name,
        content: script.content,
        updatedAt: script.updatedAt,
        embeddingUpdatedAt: script.embeddingUpdatedAt,
      })
      .from(script)
      .innerJoin(collection, eq(collection.id, script.collectionId))
      .where(
        activeCollectionId
          ? and(
              eq(collection.userId, session.user.id),
              eq(script.collectionId, activeCollectionId),
            )
          : eq(collection.userId, session.user.id),
      )
      .orderBy(desc(script.updatedAt)),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
      <h1 className="text-xl font-semibold">稿件</h1>
      <CollectionChips collections={collections} />

      {scripts.length === 0 ? (
        <p className="text-sm text-neutral-500 pt-6 text-center">
          {activeCollectionId
            ? "此稿件集还没有稿件"
            : "还没有稿件，点右上角新建"}
        </p>
      ) : (
        <ul className="space-y-2">
          {scripts.map((s) => (
            <li key={s.id}>
              <Link
                href={`/scripts/${s.id}`}
                className="block rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <div className="font-medium truncate">{deriveTitle(s.content)}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {s.collectionName} · {new Date(s.updatedAt).toLocaleString("zh-CN")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
