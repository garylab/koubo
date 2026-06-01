import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { CollectionRow } from "./_components/collection-row";
import { CreateCollectionForm } from "./_components/create-collection-form";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const session = await getServerSession();
  if (!session) return null;

  const db = getDb();
  const collections = await db
    .select()
    .from(collection)
    .where(eq(collection.userId, session.user.id))
    .orderBy(desc(collection.isDefault), desc(collection.updatedAt));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 space-y-1">
      <div className="pb-2">
        <h1 className="text-xl font-semibold">稿件集</h1>
        <p className="text-xs text-neutral-500 mt-1">
          稿件集用于把稿件分组。默认稿件集不可删除，但可以重命名。
        </p>
      </div>
      <CreateCollectionForm />
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {collections.map((c) => (
          <CollectionRow
            key={c.id}
            id={c.id}
            name={c.name}
            isDefault={c.isDefault}
            updatedAt={c.updatedAt.toISOString()}
          />
        ))}
      </ul>
    </div>
  );
}
