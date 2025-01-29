CREATE TABLE `megaships` (
	`name` text,
	`week` integer,
	`system_id` integer NOT NULL,
	`system_name` text NOT NULL,
	`system_x` real NOT NULL,
	`system_y` real NOT NULL,
	`system_z` real NOT NULL,
	PRIMARY KEY(`name`, `week`)
);
