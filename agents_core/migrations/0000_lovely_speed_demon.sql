CREATE TYPE "public"."agent_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."approval_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "agent_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"provider_account_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"sub_context" text,
	"run_id" text,
	"status" "conversation_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"prompt" text NOT NULL,
	"capabilities" jsonb NOT NULL,
	"trigger" jsonb NOT NULL,
	"ai_employee_id" uuid,
	"last_active" timestamp,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text,
	"run_id" text NOT NULL,
	"status" "approval_request_status" DEFAULT 'pending' NOT NULL,
	"summary" text NOT NULL,
	"modifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"capability" text NOT NULL,
	"request" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"provider_message_id" text,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_ai_employee_id_ai_employees_id_fk" FOREIGN KEY ("ai_employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_agent_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_org_idx" ON "agents" USING btree ("org_id");