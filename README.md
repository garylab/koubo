# Koubo · 口播视频稿管理

按品牌组织口播视频稿，提供 AI 优化（整段对比）与品牌内相似度（cosine > 0.95）发现。

## 技术栈

- **Next.js 15**（App Router） + React 19，部署到 Cloudflare Workers（`@opennextjs/cloudflare`）
- **Neon Postgres** + pgvector + HNSW 索引，通过 **`@neondatabase/serverless`**（WebSocket）连接，原生兼容 Workers 且支持事务
- **Drizzle ORM**（`drizzle-orm/neon-serverless`）
- **Better Auth**（Google OAuth + email/password）
- **OpenAI** `text-embedding-3-small`（1536 维）+ `gpt-4o-mini`（AI 重写，流式）
- 后台计算：`ctx.waitUntil`（保存后异步算 embedding + 更新相似表）
- PWA（manifest + service worker）

## 路由概览

```
/                                  → 已登录跳 /scripts，否则跳 /login
/login, /register
/scripts                           → 所有稿件（可 ?c=<collectionId> 过滤为某集）
/scripts/[scriptId]                → 稿件编辑器（含 AI 优化对比、相似列表、改集下拉）
/collections                       → 稿件集管理（重命名/删除；默认集禁删）

/api/auth/[...all]                 → Better Auth handler
/api/collections, /api/collections/[id]
/api/scripts                       → GET 列表 / POST 新建（可选 collectionId，否则入默认集）
/api/scripts/[id]                  → GET / PATCH（改 content + collectionId）/ DELETE
/api/ai/optimize                   → 流式 OpenAI 重写
/api/health/db                     → DB 健康检查
```

数据模型：`collection`（曾用名 `brand`）有 `is_default` 标记，每个用户恰好一个默认集，可改名不可删；scripts 必有 `collection_id`，未指定时落入默认集。

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

1. **绑定 secrets** —— 用 wrangler 设置（CF Workers Builds 不会读 GitHub 上的 .env）：
   ```bash
   npx wrangler secret put DATABASE_URL
   # postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require
   # (不带 channel_binding=require)
   npx wrangler secret put BETTER_AUTH_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```
2. **Google Cloud Console** → OAuth Client → Authorized redirect URIs 追加：
   ```
   https://koubo.garymeng.com/api/auth/callback/google
   ```
3. **绑定自定义域**：Workers → koubo → Settings → Domains & Routes → 加 `koubo.garymeng.com`（已在 `wrangler.jsonc` 声明，CF 会自动配 DNS）

> Hyperdrive 暂时未启用——postgres.js + Hyperdrive 在 workerd 出现过运行时 hang/exception。等 neon-serverless 稳定后可重新评估是否切回。

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

- 保存稿件时，`PATCH /api/scripts/[id]` 返回响应后通过 `ctx.waitUntil` 异步调用 Workers AI `@cf/baai/bge-m3` 生成 embedding
- embedding 写入 Vectorize，同时计算品牌内 cosine 相似度 > 0.95 的其他稿件，双向写入 `script_similarity`
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
│   ├── ai.ts, similarity.ts
│   ├── api-helpers.ts, defer.ts
├── middleware.ts
└── public/
    ├── icon.svg, icon-maskable.svg, sw.js
```
