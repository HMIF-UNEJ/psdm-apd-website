-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `auditlog` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191),
	`action` varchar(191) NOT NULL,
	`success` tinyint(1) NOT NULL,
	`ip` varchar(191),
	`userAgent` varchar(191),
	`metadata` json,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `auditlog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `division` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `division_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation` (
	`id` varchar(191) NOT NULL,
	`evaluatorId` varchar(191) NOT NULL,
	`evaluateeId` varchar(191) NOT NULL,
	`eventId` varchar(191) NOT NULL,
	`feedback` varchar(191),
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `evaluation_id` PRIMARY KEY(`id`),
	CONSTRAINT `Evaluation_evaluatorId_evaluateeId_eventId_key` UNIQUE(`evaluatorId`,`evaluateeId`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `evaluationevent` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`type` enum('PERIODIC','PROKER') NOT NULL,
	`isOpen` tinyint(1) NOT NULL DEFAULT 1,
	`startDate` datetime(3) NOT NULL,
	`endDate` datetime(3) NOT NULL,
	`periodId` varchar(191) NOT NULL,
	`prokerId` varchar(191),
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `evaluationevent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationscore` (
	`id` varchar(191) NOT NULL,
	`evaluationId` varchar(191) NOT NULL,
	`indicatorSnapshotId` varchar(191) NOT NULL,
	`score` int NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `evaluationscore_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicator` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`category` varchar(191) NOT NULL,
	`isActive` tinyint(1) NOT NULL DEFAULT 1,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `indicator_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicatorsnapshot` (
	`id` varchar(191) NOT NULL,
	`indicatorId` varchar(191) NOT NULL,
	`eventId` varchar(191) NOT NULL,
	CONSTRAINT `indicatorsnapshot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `panitia` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`prokerId` varchar(191) NOT NULL,
	CONSTRAINT `panitia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `period` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`isActive` tinyint(1) NOT NULL DEFAULT 0,
	`startYear` int NOT NULL,
	`endYear` int NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `period_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proker` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`divisionId` varchar(191) NOT NULL,
	`periodId` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `proker_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemsettings` (
	`id` varchar(191) NOT NULL DEFAULT 'default',
	`smtpHost` varchar(191),
	`smtpPort` int,
	`smtpUser` varchar(191),
	`smtpPass` varchar(191),
	`smtpSecure` tinyint(1) NOT NULL DEFAULT 0,
	`smtpFromEmail` varchar(191),
	`smtpFromName` varchar(191),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `systemsettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(191) NOT NULL,
	`nim` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191),
	`role` enum('ADMIN','BPI','KADIV','ANGGOTA') NOT NULL,
	`isActive` tinyint(1) NOT NULL DEFAULT 1,
	`passwordHash` varchar(191) NOT NULL,
	`passwordUpdatedAt` datetime(3),
	`periodId` varchar(191) NOT NULL,
	`divisionId` varchar(191),
	`createdAt` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_nim_key` UNIQUE(`nim`)
);
--> statement-breakpoint
ALTER TABLE `auditlog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluation` ADD CONSTRAINT `Evaluation_evaluateeId_fkey` FOREIGN KEY (`evaluateeId`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluation` ADD CONSTRAINT `Evaluation_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluation` ADD CONSTRAINT `Evaluation_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `evaluationevent`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationevent` ADD CONSTRAINT `EvaluationEvent_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `period`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationevent` ADD CONSTRAINT `EvaluationEvent_prokerId_fkey` FOREIGN KEY (`prokerId`) REFERENCES `proker`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationscore` ADD CONSTRAINT `EvaluationScore_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `evaluation`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationscore` ADD CONSTRAINT `EvaluationScore_indicatorSnapshotId_fkey` FOREIGN KEY (`indicatorSnapshotId`) REFERENCES `indicatorsnapshot`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `indicatorsnapshot` ADD CONSTRAINT `IndicatorSnapshot_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `evaluationevent`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `indicatorsnapshot` ADD CONSTRAINT `IndicatorSnapshot_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `indicator`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `panitia` ADD CONSTRAINT `Panitia_prokerId_fkey` FOREIGN KEY (`prokerId`) REFERENCES `proker`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `panitia` ADD CONSTRAINT `Panitia_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `proker` ADD CONSTRAINT `Proker_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `division`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `proker` ADD CONSTRAINT `Proker_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `period`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `User_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `division`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `User_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `period`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `AuditLog_action_idx` ON `auditlog` (`action`);--> statement-breakpoint
CREATE INDEX `AuditLog_userId_idx` ON `auditlog` (`userId`);
*/