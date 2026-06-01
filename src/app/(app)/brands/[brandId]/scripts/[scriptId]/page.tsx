import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { brand, script } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { listSimilarScripts } from "@/lib/similarity";
import { ScriptEditor } from "./_components/script-editor";

export const dynamic = "force-dynamic";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ brandId: string; scriptId: string }>;
}) {
  const { brandId, scriptId } = await params;
  const session = await getServerSession();
  if (!session) return null;

  const db = getDb();
  const [[row], similar] = await Promise.all([
    db
      .select({
        id: script.id,
        brandId: script.brandId,
        title: script.title,
        content: script.content,
        updatedAt: script.updatedAt,
        embeddingUpdatedAt: script.embeddingUpdatedAt,
        brandName: brand.name,
      })
      .from(script)
      .innerJoin(brand, eq(brand.id, script.brandId))
      .where(
        and(
          eq(script.id, scriptId),
          eq(script.brandId, brandId),
          eq(brand.userId, session.user.id),
        ),
      ),
    listSimilarScripts(scriptId, session.user.id),
  ]);
  if (!row) notFound();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <Link
          href={`/brands/${row.brandId}`}
          className="text-xs text-neutral-500 hover:underline"
        >
          ← {row.brandName}
        </Link>
      </div>

      <ScriptEditor
        scriptId={row.id}
        brandId={row.brandId}
        initialTitle={row.title}
        initialContent={row.content}
        embeddingUpdatedAt={row.embeddingUpdatedAt?.toISOString() ?? null}
      />

      <section className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <h2 className="text-sm font-semibold mb-2">
          品牌内相似稿件（相似度 &gt; 95%）
        </h2>
        {similar.length === 0 ? (
          <p className="text-xs text-neutral-500">
            暂无高相似稿件。保存后会在后台计算 embedding。
          </p>
        ) : (
          <ul className="space-y-1">
            {similar.map((s) => (
              <li key={s.id} className="text-sm">
                <Link
                  href={`/brands/${s.brandId}/scripts/${s.id}`}
                  className="hover:underline"
                >
                  {s.title}
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
