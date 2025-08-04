CREATE TYPE "public"."connection_status" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "public"."knowledge_snippet_origin" AS ENUM('agent');--> statement-breakpoint
CREATE TYPE "public"."oauth_transaction_status" AS ENUM('pending', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."ownership_scope" AS ENUM('user', 'organization');--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"memory_key" text NOT NULL,
	"data" jsonb NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"external_account_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "connection_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"document_id" text NOT NULL,
	"document_type" text NOT NULL,
	"document_uri" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_snippets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"source_run_id" text,
	"origin" "knowledge_snippet_origin" DEFAULT 'agent' NOT NULL,
	"blob" text,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"requested_scopes" text[] NOT NULL,
	"state" varchar(255) NOT NULL,
	"code_verifier" text,
	"redirect_uri" text NOT NULL,
	"status" "oauth_transaction_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"ownership_scope" "ownership_scope" NOT NULL,
	"owner_id" text NOT NULL,
	"token_payload" jsonb NOT NULL,
	"scopes" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_token_per_scope" UNIQUE("connection_id","ownership_scope","owner_id")
);
--> statement-breakpoint
CREATE TABLE "trigger_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" uuid,
	"trigger_id" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_registrations" ADD CONSTRAINT "trigger_registrations_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_memory_agent_key_idx" ON "agent_memory" USING btree ("agent_id","memory_key");--> statement-breakpoint
CREATE INDEX "agent_memory_agent_id_idx" ON "agent_memory" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_memory_expires_at_idx" ON "agent_memory" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connections_org_id_provider_id_active" ON "connections" USING btree ("org_id","provider_id") WHERE "connections"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_knowledge_snippets_org_id_source_run_id" ON "knowledge_snippets" USING btree ("org_id","source_run_id");--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "knowledge_snippets" USING hnsw ("embedding" vector_cosine_ops);