import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { listSimilarScripts } from "@/lib/similarity";
import { deriveTitle } from "@/lib/script-title";
import { ScriptEditor } from "../_components/script-editor";

export const dynamic = "force-dynamic";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ scriptId: string }>;
}) {
  const { scriptId } = await params;
  const session = await getServerSession();
  if (!session) return null;

  const db = getDb();
  const [[row], similar, collections] = await Promise.all([
    db
      .select({
        id: script.id,
        collectionId: script.collectionId,
        content: script.content,
        updatedAt: script.updatedAt,
        embeddingUpdatedAt: script.embeddingUpdatedAt,
      })
      .from(script)
      .innerJoin(collection, eq(collection.id, script.collectionId))
      .where(
        and(eq(script.id, scriptId), eq(collection.userId, session.user.id)),
      ),
    listSimilarScripts(scriptId, session.user.id),
    db
      .select({ id: collection.id, name: collection.name })
      .from(collection)
      .where(eq(collection.userId, session.user.id))
      .orderBy(desc(collection.isDefault), desc(collection.updatedAt)),
  ]);
  if (!row) notFound();

  return (
    <div className="flex flex-col">
      <ScriptEditor
        scriptId={row.id}
        initialCollectionId={row.collectionId}
        initialContent={row.content}
        embeddingUpdatedAt={row.embeddingUpdatedAt?.toISOString() ?? null}
        collections={collections}
      />

      {similar.length > 0 && (
        <section className="max-w-3xl mx-auto w-full px-4 py-4">
          <div className="text-xs text-neutral-500 mb-2">
            相似稿件（&gt; 95%）
          </div>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {similar.map((s) => (
              <li key={s.id} className="py-2">
                <Link
                  href={`/scripts/${s.id}`}
                  className="text-sm flex items-baseline justify-between gap-3"
                >
                  <span className="truncate">{deriveTitle(s.content)}</span>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {(s.score * 100).toFixed(1)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
