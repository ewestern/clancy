ALTER TABLE "connections" RENAME COLUMN "capabilities" TO "permissions";--> statement-breakpoint
ALTER TABLE "oauth_transactions" RENAME COLUMN "capabilities" TO "requested_permissions";