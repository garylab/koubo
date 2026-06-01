import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { brand } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { CreateBrandForm } from "./_components/create-brand-form";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const session = await getServerSession();
  if (!session) return null;
  const db = getDb();
  const brands = await db
    .select()
    .from(brand)
    .where(eq(brand.userId, session.user.id))
    .orderBy(desc(brand.updatedAt));

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">品牌</h1>
        <p className="text-sm text-neutral-500">为每个品牌组织你的口播视频稿</p>
      </div>

      <CreateBrandForm />

      {brands.length === 0 ? (
        <p className="text-sm text-neutral-500">还没有品牌，先建一个。</p>
      ) : (
        <ul className="space-y-2">
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/brands/${b.id}`}
                className="block rounded-md border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-neutral-500">
                  更新于 {new Date(b.updatedAt).toLocaleString("zh-CN")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
