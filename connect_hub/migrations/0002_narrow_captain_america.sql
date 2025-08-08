TRUNCATE TABLE "connections" CASCADE;
TRUNCATE TABLE "trigger_registrations" CASCADE;
ALTER TABLE "connections" ADD COLUMN "employee_id" varchar(255);--> statement-breakpoint
ALTER TABLE "trigger_registrations" ADD COLUMN "org_id" text NOT NULL;