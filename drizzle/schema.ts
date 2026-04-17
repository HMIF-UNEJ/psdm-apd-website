import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, foreignKey, primaryKey, varchar, json, datetime, unique, mysqlEnum, int, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const auditlog = mysqlTable("auditlog", {
	id: varchar({ length: 191 }).notNull(),
	userId: varchar({ length: 191 }).references(() => user.id, { onDelete: "set null", onUpdate: "cascade" } ),
	action: varchar({ length: 191 }).notNull(),
	success: tinyint().notNull(),
	ip: varchar({ length: 191 }),
	userAgent: varchar({ length: 191 }),
	metadata: json(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	index("AuditLog_action_idx").on(table.action),
	index("AuditLog_userId_idx").on(table.userId),
	primaryKey({ columns: [table.id], name: "auditlog_id"}),
]);

export const division = mysqlTable("division", {
	id: varchar({ length: 191 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "division_id"}),
]);

export const evaluation = mysqlTable("evaluation", {
	id: varchar({ length: 191 }).notNull(),
	evaluatorId: varchar({ length: 191 }).notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	evaluateeId: varchar({ length: 191 }).notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	eventId: varchar({ length: 191 }).notNull().references(() => evaluationevent.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	feedback: varchar({ length: 191 }),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "evaluation_id"}),
	unique("Evaluation_evaluatorId_evaluateeId_eventId_key").on(table.evaluatorId, table.evaluateeId, table.eventId),
]);

export const evaluationevent = mysqlTable("evaluationevent", {
	id: varchar({ length: 191 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	type: mysqlEnum(['PERIODIC','PROKER']).notNull(),
	isOpen: tinyint().default(1).notNull(),
	startDate: datetime({ mode: 'string', fsp: 3 }).notNull(),
	endDate: datetime({ mode: 'string', fsp: 3 }).notNull(),
	periodId: varchar({ length: 191 }).notNull().references(() => period.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	prokerId: varchar({ length: 191 }).references(() => proker.id, { onDelete: "set null", onUpdate: "cascade" } ),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "evaluationevent_id"}),
]);

export const evaluationscore = mysqlTable("evaluationscore", {
	id: varchar({ length: 191 }).notNull(),
	evaluationId: varchar({ length: 191 }).notNull().references(() => evaluation.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	indicatorSnapshotId: varchar({ length: 191 }).notNull().references(() => indicatorsnapshot.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	score: int().notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "evaluationscore_id"}),
]);

export const indicator = mysqlTable("indicator", {
	id: varchar({ length: 191 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	category: varchar({ length: 191 }).notNull(),
	isActive: tinyint().default(1).notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "indicator_id"}),
]);

export const indicatorsnapshot = mysqlTable("indicatorsnapshot", {
	id: varchar({ length: 191 }).notNull(),
	indicatorId: varchar({ length: 191 }).notNull().references(() => indicator.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	eventId: varchar({ length: 191 }).notNull().references(() => evaluationevent.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => [
	primaryKey({ columns: [table.id], name: "indicatorsnapshot_id"}),
]);

export const panitia = mysqlTable("panitia", {
	id: varchar({ length: 191 }).notNull(),
	userId: varchar({ length: 191 }).notNull().references(() => user.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	prokerId: varchar({ length: 191 }).notNull().references(() => proker.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => [
	primaryKey({ columns: [table.id], name: "panitia_id"}),
]);

export const period = mysqlTable("period", {
	id: varchar({ length: 191 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	isActive: tinyint().default(0).notNull(),
	startYear: int().notNull(),
	endYear: int().notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "period_id"}),
]);

export const proker = mysqlTable("proker", {
	id: varchar({ length: 191 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	divisionId: varchar({ length: 191 }).notNull().references(() => division.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	periodId: varchar({ length: 191 }).notNull().references(() => period.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "proker_id"}),
]);

export const systemsettings = mysqlTable("systemsettings", {
	id: varchar({ length: 191 }).default('default').notNull(),
	smtpHost: varchar({ length: 191 }),
	smtpPort: int(),
	smtpUser: varchar({ length: 191 }),
	smtpPass: varchar({ length: 191 }),
	smtpSecure: tinyint().default(0).notNull(),
	smtpFromEmail: varchar({ length: 191 }),
	smtpFromName: varchar({ length: 191 }),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "systemsettings_id"}),
]);

export const user = mysqlTable("user", {
	id: varchar({ length: 191 }).notNull(),
	nim: varchar({ length: 191 }).notNull(),
	name: varchar({ length: 191 }).notNull(),
	email: varchar({ length: 191 }),
	role: mysqlEnum(['ADMIN','BPI','KADIV','ANGGOTA']).notNull(),
	isActive: tinyint().default(1).notNull(),
	passwordHash: varchar({ length: 191 }).notNull(),
	passwordUpdatedAt: datetime({ mode: 'string', fsp: 3 }),
	periodId: varchar({ length: 191 }).notNull().references(() => period.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	divisionId: varchar({ length: 191 }).references(() => division.id, { onDelete: "set null", onUpdate: "cascade" } ),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "user_id"}),
	unique("User_nim_key").on(table.nim),
]);
