ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_userId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluation` DROP FOREIGN KEY `Evaluation_evaluateeId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluation` DROP FOREIGN KEY `Evaluation_evaluatorId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluation` DROP FOREIGN KEY `Evaluation_eventId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluationevent` DROP FOREIGN KEY `EvaluationEvent_periodId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluationevent` DROP FOREIGN KEY `EvaluationEvent_prokerId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluationscore` DROP FOREIGN KEY `EvaluationScore_evaluationId_fkey`;
--> statement-breakpoint
ALTER TABLE `evaluationscore` DROP FOREIGN KEY `EvaluationScore_indicatorSnapshotId_fkey`;
--> statement-breakpoint
ALTER TABLE `indicatorsnapshot` DROP FOREIGN KEY `IndicatorSnapshot_eventId_fkey`;
--> statement-breakpoint
ALTER TABLE `indicatorsnapshot` DROP FOREIGN KEY `IndicatorSnapshot_indicatorId_fkey`;
--> statement-breakpoint
ALTER TABLE `panitia` DROP FOREIGN KEY `Panitia_prokerId_fkey`;
--> statement-breakpoint
ALTER TABLE `panitia` DROP FOREIGN KEY `Panitia_userId_fkey`;
--> statement-breakpoint
ALTER TABLE `proker` DROP FOREIGN KEY `Proker_divisionId_fkey`;
--> statement-breakpoint
ALTER TABLE `proker` DROP FOREIGN KEY `Proker_periodId_fkey`;
--> statement-breakpoint
ALTER TABLE `user` DROP FOREIGN KEY `User_divisionId_fkey`;
--> statement-breakpoint
ALTER TABLE `user` DROP FOREIGN KEY `User_periodId_fkey`;
--> statement-breakpoint
ALTER TABLE `auditlog` MODIFY COLUMN `success` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `evaluationevent` MODIFY COLUMN `isOpen` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `indicator` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `period` MODIFY COLUMN `isActive` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `systemsettings` MODIFY COLUMN `smtpSecure` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `user` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `auditlog` ADD CONSTRAINT `auditlog_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluation` ADD CONSTRAINT `evaluation_evaluatorId_user_id_fk` FOREIGN KEY (`evaluatorId`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluation` ADD CONSTRAINT `evaluation_evaluateeId_user_id_fk` FOREIGN KEY (`evaluateeId`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluation` ADD CONSTRAINT `evaluation_eventId_evaluationevent_id_fk` FOREIGN KEY (`eventId`) REFERENCES `evaluationevent`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationevent` ADD CONSTRAINT `evaluationevent_periodId_period_id_fk` FOREIGN KEY (`periodId`) REFERENCES `period`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationevent` ADD CONSTRAINT `evaluationevent_prokerId_proker_id_fk` FOREIGN KEY (`prokerId`) REFERENCES `proker`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationscore` ADD CONSTRAINT `evaluationscore_evaluationId_evaluation_id_fk` FOREIGN KEY (`evaluationId`) REFERENCES `evaluation`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `evaluationscore` ADD CONSTRAINT `evaluationscore_indicatorSnapshotId_indicatorsnapshot_id_fk` FOREIGN KEY (`indicatorSnapshotId`) REFERENCES `indicatorsnapshot`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `indicatorsnapshot` ADD CONSTRAINT `indicatorsnapshot_indicatorId_indicator_id_fk` FOREIGN KEY (`indicatorId`) REFERENCES `indicator`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `indicatorsnapshot` ADD CONSTRAINT `indicatorsnapshot_eventId_evaluationevent_id_fk` FOREIGN KEY (`eventId`) REFERENCES `evaluationevent`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `panitia` ADD CONSTRAINT `panitia_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `panitia` ADD CONSTRAINT `panitia_prokerId_proker_id_fk` FOREIGN KEY (`prokerId`) REFERENCES `proker`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `proker` ADD CONSTRAINT `proker_divisionId_division_id_fk` FOREIGN KEY (`divisionId`) REFERENCES `division`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `proker` ADD CONSTRAINT `proker_periodId_period_id_fk` FOREIGN KEY (`periodId`) REFERENCES `period`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_periodId_period_id_fk` FOREIGN KEY (`periodId`) REFERENCES `period`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_divisionId_division_id_fk` FOREIGN KEY (`divisionId`) REFERENCES `division`(`id`) ON DELETE set null ON UPDATE cascade;