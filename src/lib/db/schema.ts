import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  index,
  primaryKey,
  vector,
} from "drizzle-orm/pg-core";

// === Better Auth tables ===

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// === App tables ===

// 稿件集（collection）—— DB-renamed from "brand". One per user is marked
// isDefault: it can be renamed but never deleted, and unspecified scripts
// fall into it.
export const collection = pgTable(
  "collection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("collection_user_idx").on(t.userId)],
);

export const script = pgTable(
  "script",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    embedding: vector("embedding", { dimensions: 1536 }),
    embeddingUpdatedAt: timestamp("embedding_updated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("script_collection_idx").on(t.collectionId)],
);

export const scriptSimilarity = pgTable(
  "script_similarity",
  {
    scriptId: text("script_id")
      .notNull()
      .references(() => script.id, { onDelete: "cascade" }),
    similarScriptId: text("similar_script_id")
      .notNull()
      .references(() => script.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.scriptId, t.similarScriptId] }),
    index("similarity_script_idx").on(t.scriptId),
  ],
);

export type User = typeof user.$inferSelect;
export type Collection = typeof collection.$inferSelect;
export type Script = typeof script.$inferSelect;
export type ScriptSimilarity = typeof scriptSimilarity.$inferSelect;
