-- Email payment reminders: customer email, key/value settings, and a log of every reminder sent or failed.
ALTER TABLE `buyers` ADD `email` text;--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`installment_id` text NOT NULL,
	`due` text NOT NULL,
	`email` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`sent_at` text NOT NULL,
	`sent_by` text
);
--> statement-breakpoint
CREATE INDEX `idx_reminders_installment` ON `reminders` (`installment_id`);
