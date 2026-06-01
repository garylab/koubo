import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { deriveTitle } from "@/lib/script-title";
import { CreateScriptButton } from "./_components/create-script-button";

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

  const scripts = await db
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
    .orderBy(desc(script.updatedAt));

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <CreateScriptButton activeCollectionId={activeCollectionId ?? null} />

      {scripts.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {activeCollectionId
            ? "此稿件集还没有稿件，点上面按钮新建。"
            : "还没有任何稿件，点上面按钮新建。"}
        </p>
      ) : (
        <ul className="space-y-2">
          {scripts.map((s) => (
            <li key={s.id}>
              <Link
                href={`/scripts/${s.id}`}
                className="block rounded-md border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <div className="font-medium truncate">{deriveTitle(s.content)}</div>
                <div className="text-xs text-neutral-500">
                  {s.collectionName} · 更新于{" "}
                  {new Date(s.updatedAt).toLocaleString("zh-CN")}
                  {s.embeddingUpdatedAt ? " · 已索引" : " · 待索引"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
