import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: varchar("org_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'inactive', 'error'
  metadata: jsonb("metadata"), // Provider-specific metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id")
    .references(() => connections.id)
    .notNull(),
  accessToken: text("access_token"), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted with AES-GCM
  tokenType: varchar("token_type", { length: 50 }).notNull().default("Bearer"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"), // Provider scopes as space-separated string
  providerData: jsonb("provider_data"), // Additional provider-specific token data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
