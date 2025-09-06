CREATE TYPE "public"."template_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"status" "template_status" DEFAULT 'active' NOT NULL,
	"headline" text NOT NULL,
	"promise" text NOT NULL,
	"category" varchar(255) NOT NULL,
	"integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"jd_seed" text NOT NULL,
	"icon" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");