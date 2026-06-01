import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { brand, script } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { deriveTitle } from "@/lib/script-title";
import { CreateScriptButton } from "./_components/create-script-button";
import { BrandActions } from "./_components/brand-actions";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const session = await getServerSession();
  if (!session) return null;

  const db = getDb();
  const [[b], scripts] = await Promise.all([
    db
      .select()
      .from(brand)
      .where(and(eq(brand.id, brandId), eq(brand.userId, session.user.id))),
    db
      .select({
        id: script.id,
        content: script.content,
        updatedAt: script.updatedAt,
        embeddingUpdatedAt: script.embeddingUpdatedAt,
      })
      .from(script)
      .where(eq(script.brandId, brandId))
      .orderBy(desc(script.updatedAt)),
  ]);
  if (!b) notFound();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/brands"
            className="text-xs text-neutral-500 hover:underline"
          >
            ← 所有品牌
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{b.name}</h1>
        </div>
        <BrandActions brandId={b.id} name={b.name} />
      </div>

      <CreateScriptButton brandId={b.id} />

      {scripts.length === 0 ? (
        <p className="text-sm text-neutral-500">还没有稿件，点上面按钮新建一个。</p>
      ) : (
        <ul className="space-y-2">
          {scripts.map((s) => (
            <li key={s.id}>
              <Link
                href={`/brands/${b.id}/scripts/${s.id}`}
                className="block rounded-md border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <div className="font-medium truncate">{deriveTitle(s.content)}</div>
                <div className="text-xs text-neutral-500">
                  更新于 {new Date(s.updatedAt).toLocaleString("zh-CN")}
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
