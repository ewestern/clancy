CREATE TYPE "public"."agent_run_action_status" AS ENUM('success', 'running', 'error');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "agent_run_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"capability_id" text NOT NULL,
	"formatted_request" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "agent_run_action_status" DEFAULT 'running' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"execution_id" text NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"run_started_at" timestamp NOT NULL,
	"run_completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent_run_actions" ADD CONSTRAINT "agent_run_actions_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;