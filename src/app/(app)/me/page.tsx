import { getServerSession } from "@/lib/session";
import { SignOutButton } from "../_components/sign-out-button";
import { ProfileForm } from "./_components/profile-form";
import { PasswordChangeForm } from "./_components/password-change-form";
import { MeHeader } from "./_components/me-header";
import { ThemeSwitcher } from "./_components/theme-switcher";

export const dynamic = "force-dynamic";

function buildLabel() {
  const id = process.env.NEXT_PUBLIC_BUILD_ID;
  if (!id) return "dev";
  const n = Number(id);
  if (!Number.isFinite(n)) return id;
  const d = new Date(n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function MePage() {
  const session = await getServerSession();
  if (!session) return null;

  return (
    <>
      <MeHeader />
      <div className="max-w-3xl mx-auto px-4 pt-3">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <ProfileForm
            initialName={session.user.name}
            email={session.user.email}
          />
          <PasswordChangeForm />
          <ThemeSwitcher />
        </div>
        <div className="pt-8">
          <SignOutButton />
        </div>
        <div className="pt-6 text-center text-xs text-neutral-400 dark:text-neutral-600">
          版本 {buildLabel()}
        </div>
      </div>
    </>
  );
}
