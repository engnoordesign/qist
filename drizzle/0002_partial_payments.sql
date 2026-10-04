-- Partial payments, payment reversal and carry-forward of unpaid months.
-- Moves every existing full payment into payment_entries (receipt number becomes the entry id).
CREATE TABLE `payment_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`installment_id` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` text NOT NULL,
	`paid_by` text,
	`voided_at` text,
	`voided_by` text,
	`void_reason` text,
	FOREIGN KEY (`installment_id`) REFERENCES `installments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entries_installment` ON `payment_entries` (`installment_id`);--> statement-breakpoint
INSERT INTO `payment_entries` (`id`,`installment_id`,`amount`,`paid_at`,`paid_by`)
	SELECT p.`receipt`, p.`installment_id`, i.`amount`, p.`paid_at`, p.`paid_by` FROM `payments` p JOIN `installments` i ON i.`id` = p.`installment_id`;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
ALTER TABLE `installments` ADD `closed_at` text;--> statement-breakpoint
ALTER TABLE `installments` ADD `closed_by` text;--> statement-breakpoint
ALTER TABLE `installments` ADD `carry_of` text;
