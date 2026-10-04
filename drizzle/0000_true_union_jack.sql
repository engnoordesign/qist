CREATE TABLE `buyers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`product` text NOT NULL,
	`currency` text NOT NULL,
	`total` integer NOT NULL,
	`initial` integer NOT NULL,
	`months` integer NOT NULL,
	`period` integer NOT NULL,
	`start` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contracts_buyer` ON `contracts` (`buyer_id`);--> statement-breakpoint
CREATE TABLE `installments` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`number` integer NOT NULL,
	`due` text NOT NULL,
	`amount` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_installments_contract` ON `installments` (`contract_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`installment_id` text PRIMARY KEY NOT NULL,
	`paid_at` text NOT NULL,
	`receipt` text NOT NULL,
	FOREIGN KEY (`installment_id`) REFERENCES `installments`(`id`) ON UPDATE no action ON DELETE no action
);
