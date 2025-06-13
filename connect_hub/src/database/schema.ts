import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text } from 'drizzle-orm/pg-core';

export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: varchar('org_id', { length: 255 }).notNull(),
  providerId: uuid('provider_id').references(() => providers.id).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'inactive', 'error'
  metadata: jsonb('metadata'), // Provider-specific metadata
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const tokens = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').references(() => connections.id).notNull(),
  accessToken: text('access_token'), // Encrypted
  refreshToken: text('refresh_token'), // Encrypted with AES-GCM
  tokenType: varchar('token_type', { length: 50 }).notNull().default('Bearer'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'), // Provider scopes as space-separated string
  providerData: jsonb('provider_data'), // Additional provider-specific token data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const providerEndpoints = pgTable('provider_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').references(() => providers.id).notNull(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const scopeMappings = pgTable('scope_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').references(() => providers.id).notNull(), // 'slack', 'quickbooks', 'gmail', etc.
  internalScope: varchar('internal_scope', { length: 100 }).notNull(), // 'invoice.write', 'message.send'
  providerScopes: text('provider_scopes').notNull(), // JSON array of provider scopes
  description: text('description'),
  metadata: jsonb('metadata'), // Additional mapping metadata
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});