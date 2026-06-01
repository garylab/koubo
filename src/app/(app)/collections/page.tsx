import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { CollectionRow } from "./_components/collection-row";
import { CreateCollectionForm } from "./_components/create-collection-form";
import { BackButton } from "./_components/back-button";

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
      <div className="pb-2 flex flex-wrap items-center gap-2">
        <BackButton />
        <h1 className="text-xl font-semibold mr-auto">稿件集</h1>
        <CreateCollectionForm />
      </div>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
  );
}
