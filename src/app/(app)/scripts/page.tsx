import { Suspense } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, script } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { deriveTitle } from "@/lib/script-title";
import { isScriptStatus, type ScriptStatus } from "@/lib/script-status";
import { ScriptsHeader } from "./_components/scripts-header";
import { ScriptsFilters, type SortKey } from "./_components/scripts-filters";
import { ScriptListItem } from "./_components/script-list-item";
import { PullToRefresh } from "./_components/pull-to-refresh";

export const dynamic = "force-dynamic";

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; s?: string; sort?: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  const sp = await searchParams;

  const activeCollectionId = sp.c || null;

  const statuses: ScriptStatus[] = sp.s
    ? sp.s.split(",").filter(isScriptStatus)
    : (["unrecorded", "recording", "recorded"] as ScriptStatus[]);

  const sort: SortKey = sp.sort === "updated" ? "updated" : "created";
  const orderCol = sort === "updated" ? script.updatedAt : script.createdAt;

  const db = getDb();
  const filters = [eq(collection.userId, session.user.id)];
  if (activeCollectionId) filters.push(eq(script.collectionId, activeCollectionId));
  if (statuses.length > 0) filters.push(inArray(script.status, statuses));

  const [collections, scripts] = await Promise.all([
    db
      .select({ id: collection.id, name: collection.name })
      .from(collection)
      .where(eq(collection.userId, session.user.id))
      .orderBy(desc(collection.isDefault), desc(collection.updatedAt)),
    statuses.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: script.id,
            collectionId: script.collectionId,
            collectionName: collection.name,
            content: script.content,
            status: script.status,
            updatedAt: script.updatedAt,
            createdAt: script.createdAt,
            embeddingUpdatedAt: script.embeddingUpdatedAt,
          })
          .from(script)
          .innerJoin(collection, eq(collection.id, script.collectionId))
          .where(and(...filters))
          .orderBy(desc(orderCol)),
  ]);

  return (
    <>
      <ScriptsHeader />
      <PullToRefresh>
        <div className="max-w-3xl mx-auto px-4 pt-6 space-y-3">
        <Suspense fallback={null}>
          <ScriptsFilters
            collections={collections}
            collectionId={activeCollectionId}
            statuses={statuses}
            sort={sort}
          />
        </Suspense>
        {scripts.length === 0 ? (
          <p className="text-sm text-neutral-500 pt-10 text-center">
            没有符合条件的稿件
          </p>
        ) : (
          <ul className="-mx-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {scripts.map((s) => (
              <ScriptListItem
                key={s.id}
                id={s.id}
                title={deriveTitle(s.content)}
                collectionName={s.collectionName}
                status={s.status as ScriptStatus}
                time={new Date(
                  sort === "created" ? s.createdAt : s.updatedAt,
                ).getTime()}
              />
            ))}
          </ul>
        )}
        </div>
      </PullToRefresh>
    </>
  );
}

