"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/brands";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn.email({ email, password, callbackURL: redirectTo });
    setLoading(false);
    if (error) setError(error.message ?? "登录失败");
    else router.push(redirectTo);
  }

  async function onGoogle() {
    setError(null);
    await signIn.social({ provider: "google", callbackURL: redirectTo });
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">登录 Koubo</h1>
          <p className="text-sm text-neutral-500">管理你的口播视频稿</p>
        </div>

        <button
          onClick={onGoogle}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          使用 Google 登录
        </button>

        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
          <span>或邮箱登录</span>
          <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="text-xs text-center text-neutral-500">
          还没有账户？{" "}
          <Link href="/register" className="underline">
            注册
          </Link>
        </p>
      </div>
    </main>
  );
}
