ALTER TABLE "ai_employees" RENAME TO "employees";--> statement-breakpoint
ALTER TABLE "agents" RENAME COLUMN "ai_employee_id" TO "employee_id";--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_ai_employee_id_ai_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;