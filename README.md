# Koubo · 口播视频稿管理

按品牌组织口播视频稿，提供 AI 优化（整段对比）与品牌内相似度（cosine > 0.95）发现。

## 技术栈

- **Next.js 15**（App Router） + React 19，部署到 Cloudflare Workers（`@opennextjs/cloudflare`）
- **Neon Postgres** + pgvector + HNSW 索引，经 **Cloudflare Hyperdrive** 连接
- **Drizzle ORM**
- **Better Auth**（Google OAuth + email/password）
- **OpenAI** `text-embedding-3-small`（1536 维）+ `gpt-4o-mini`（AI 重写，流式）
- 后台计算：`ctx.waitUntil`（保存后异步算 embedding + 更新相似表）
- PWA（manifest + service worker）

## 路由概览

```
/                                  → 已登录跳 /brands，否则跳 /login
/login, /register
/brands                            → 用户的品牌列表
/brands/[brandId]                  → 单个品牌下的稿件列表
/brands/[brandId]/scripts/[id]     → 稿件编辑器（含 AI 优化对比 + 相似列表）

/api/auth/[...all]                 → Better Auth handler
/api/brands, /api/brands/[id]
/api/brands/[brandId]/scripts
/api/scripts/[id]
/api/ai/optimize                   → 流式 OpenAI 重写
/api/health/db                     → DB 健康检查
```

## 本地开发

```bash
cp .env.example .env.local         # 填好各项
npm install
npm run db:setup                   # CREATE EXTENSION vector + 应用 migration + 建 HNSW 索引
npm run dev                        # http://localhost:3000
```

需要 Google OAuth 的 redirect URI：
```
http://localhost:3000/api/auth/callback/google
```

## 部署到 Cloudflare（Workers Builds）

### 一次性准备

1. **创建 Hyperdrive**（已建：`neon-koubo`，id `60a421d...`），id 已写入 `wrangler.jsonc`
2. **绑定 secrets** —— 用 wrangler 设置（CF Workers Builds 不会读 GitHub 上的 .env）：
   ```bash
   npx wrangler secret put BETTER_AUTH_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put OPENAI_API_KEY
   ```
3. **Google Cloud Console** → OAuth Client → Authorized redirect URIs 追加：
   ```
   https://koubo.garymeng.com/api/auth/callback/google
   ```
4. **绑定自定义域**：Workers → koubo → Settings → Domains & Routes → 加 `koubo.garymeng.com`（已在 `wrangler.jsonc` 声明，CF 会自动配 DNS）

### 接入 CF Workers Builds

CF Dashboard → Workers → **koubo** → Settings → **Build** → Connect to GitHub：

- Repo: `garylab/koubo`
- Branch: `main`
- **Build command**: `npm run build:cf`
- **Deploy command**: 留空（CF Workers Builds 自动 `wrangler deploy`）
- Root directory: `/`

之后 `git push origin main` 即触发部署。

### 验证部署

```
curl https://koubo.garymeng.com/api/health/db
# 期望: {"ok":true, ...}
```

## 后台 embedding 与相似度

- 保存稿件时，`PATCH /api/scripts/[id]` 返回响应后通过 `ctx.waitUntil` 异步调用 OpenAI embeddings
- embedding 写入 `script.embedding`（pgvector），同时计算品牌内 cosine 相似度 > 0.95 的其他稿件，双向写入 `script_similarity`
- 编辑页底部展示相似稿件，按相似度降序
- 当前未用 Cloudflare Queues——单 Worker 模型更简单，30s `waitUntil` 上限足够单次 embedding；后续可迁移

## 项目结构

```
src/
├── app/
│   ├── (app)/                    # 登录后区域
│   │   └── brands/...
│   ├── api/
│   │   ├── auth/[...all]
│   │   ├── brands/[id]
│   │   ├── brands/[brandId]/scripts
│   │   ├── scripts/[id]
│   │   ├── ai/optimize
│   │   └── health/db
│   ├── login/, register/
│   ├── layout.tsx
│   ├── manifest.ts
│   └── page.tsx
├── lib/
│   ├── auth.ts, auth-client.ts, session.ts
│   ├── db/{client,schema}.ts
│   ├── openai.ts, similarity.ts
│   ├── api-helpers.ts, defer.ts
├── middleware.ts
└── public/
    ├── icon.svg, icon-maskable.svg, sw.js
```
