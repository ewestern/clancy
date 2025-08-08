ALTER TYPE "public"."knowledge_snippet_origin" ADD VALUE 'user_upload';--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "size_bytes" text;--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "uploader_user_id" text;--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "ownership_scope" "ownership_scope" DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "status" text DEFAULT 'registered';--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "document_store" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "ownership_scope" "ownership_scope" DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "document_id" text;--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "chunk_index" integer;--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "chunk_count" integer;--> statement-breakpoint
ALTER TABLE "knowledge_snippets" ADD COLUMN "checksum" text;--> statement-breakpoint
CREATE INDEX "idx_knowledge_snippets_org_id_document_id" ON "knowledge_snippets" USING btree ("org_id","document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_knowledge_snippets_document_chunk" ON "knowledge_snippets" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_knowledge_snippets_document_checksum" ON "knowledge_snippets" USING btree ("document_id","checksum");