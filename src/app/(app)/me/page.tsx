import Link from "next/link";
import { getServerSession } from "@/lib/session";
import { SignOutButton } from "../_components/sign-out-button";
import { ProfileForm } from "./_components/profile-form";
import { PasswordChangeForm } from "./_components/password-change-form";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getServerSession();
  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
      <h1 className="text-xl font-semibold">我的</h1>

      <ProfileForm
        initialName={session.user.name}
        email={session.user.email}
      />

      <PasswordChangeForm />

      <Link
        href="/collections"
        className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900"
      >
        <div>
          <div className="text-sm font-medium">稿件集</div>
          <div className="text-xs text-neutral-500">管理稿件分组，重命名或删除</div>
        </div>
        <span className="text-neutral-400">›</span>
      </Link>

      <SignOutButton />
    </div>
  );
}
