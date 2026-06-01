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
        collectionName: collection.name,
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
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <Link
          href={`/scripts?c=${row.collectionId}`}
          className="text-xs text-neutral-500 hover:underline"
        >
          ← {row.collectionName}
        </Link>
      </div>

      <ScriptEditor
        scriptId={row.id}
        initialCollectionId={row.collectionId}
        initialContent={row.content}
        embeddingUpdatedAt={row.embeddingUpdatedAt?.toISOString() ?? null}
        collections={collections}
      />

      <section className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <h2 className="text-sm font-semibold mb-2">
          稿件集内相似稿件（相似度 &gt; 95%）
        </h2>
        {similar.length === 0 ? (
          <p className="text-xs text-neutral-500">
            暂无高相似稿件。保存后会在后台计算 embedding。
          </p>
        ) : (
          <ul className="space-y-1">
            {similar.map((s) => (
              <li key={s.id} className="text-sm">
                <Link href={`/scripts/${s.id}`} className="hover:underline">
                  {deriveTitle(s.content)}
                </Link>
                <span className="ml-2 text-xs text-neutral-500">
                  {(s.score * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
