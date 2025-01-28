CREATE TABLE `megaships` (
	`name` text PRIMARY KEY NOT NULL,
	`system_id` integer NOT NULL,
	`system_name` text NOT NULL,
	`system_x` real NOT NULL,
	`system_y` real NOT NULL,
	`system_z` real NOT NULL,
	`last_update` integer NOT NULL
);
