CREATE TYPE "public"."document_status" AS ENUM('registered', 'uploaded', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "document_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
TRUNCATE TABLE "oauth_transactions" CASCADE;
--> statement-breakpoint
DROP INDEX "idx_connections_org_id_provider_id_active";--> statement-breakpoint
ALTER TABLE "document_store" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" ALTER COLUMN "mime_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" ALTER COLUMN "size_bytes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" ALTER COLUMN "uploader_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" ALTER COLUMN "ownership_scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "status" document_status NOT NULL DEFAULT 'registered';--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "capabilities" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "oauth_transactions" ADD COLUMN "capabilities" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_document_store_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document_store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_document_tag" ON "document_tags" USING btree ("org_id","document_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_document_tags_org_tag" ON "document_tags" USING btree ("org_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_document_tags_org_doc" ON "document_tags" USING btree ("org_id","document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tags_org_name" ON "tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "idx_tags_org_id" ON "tags" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connections_org_id_user_id_provider_id_active" ON "connections" USING btree ("org_id","user_id","provider_id") WHERE "connections"."status" = 'active';--> statement-breakpoint

ALTER TABLE "connections" DROP COLUMN "employee_id";