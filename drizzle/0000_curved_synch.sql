CREATE TABLE `megaships` (
	`name` text NOT NULL,
	`week` integer NOT NULL,
	`system_id` integer,
	PRIMARY KEY(`name`, `week`)
);
--> statement-breakpoint
CREATE TABLE `systems` (
	`id64` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`power` text
);
--> statement-breakpoint
CREATE INDEX `power_idx` ON `systems` (`power`);