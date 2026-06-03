import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { CollectionRow } from "./_components/collection-row";
import { CollectionsHeader } from "./_components/collections-header";
import { RefreshOnDirty } from "./_components/refresh-on-dirty";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const session = await getServerSession();
  if (!session) return null;

  const db = getDb();
  const collections = await db
    .select()
    .from(collection)
    .where(eq(collection.userId, Number(session.user.id)))
    .orderBy(desc(collection.isDefault), desc(collection.updatedAt));

  return (
    <>
      <CollectionsHeader />
      <RefreshOnDirty />
      <div className="max-w-3xl mx-auto px-4 pt-3">
        <ul className="-mx-4 divide-y divide-neutral-200 dark:divide-neutral-800">
          {collections.map((c) => (
            <CollectionRow
              key={c.id}
              id={c.id}
              name={c.name}
              isDefault={c.isDefault}
            />
          ))}
        </ul>
      </div>
    </>
  );
}
