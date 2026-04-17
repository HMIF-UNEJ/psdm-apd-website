import { relations } from "drizzle-orm/relations";
import { user, auditlog, evaluation, evaluationevent, period, proker, evaluationscore, indicatorsnapshot, indicator, panitia, division } from "./schema";

export const auditlogRelations = relations(auditlog, ({one}) => ({
	user: one(user, {
		fields: [auditlog.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({one, many}) => ({
	auditlogs: many(auditlog),
	evaluations_evaluateeId: many(evaluation, {
		relationName: "evaluation_evaluateeId_user_id"
	}),
	evaluations_evaluatorId: many(evaluation, {
		relationName: "evaluation_evaluatorId_user_id"
	}),
	panitias: many(panitia),
	division: one(division, {
		fields: [user.divisionId],
		references: [division.id]
	}),
	period: one(period, {
		fields: [user.periodId],
		references: [period.id]
	}),
}));

export const evaluationRelations = relations(evaluation, ({one, many}) => ({
	user_evaluateeId: one(user, {
		fields: [evaluation.evaluateeId],
		references: [user.id],
		relationName: "evaluation_evaluateeId_user_id"
	}),
	user_evaluatorId: one(user, {
		fields: [evaluation.evaluatorId],
		references: [user.id],
		relationName: "evaluation_evaluatorId_user_id"
	}),
	evaluationevent: one(evaluationevent, {
		fields: [evaluation.eventId],
		references: [evaluationevent.id]
	}),
	evaluationscores: many(evaluationscore),
}));

export const evaluationeventRelations = relations(evaluationevent, ({one, many}) => ({
	evaluations: many(evaluation),
	period: one(period, {
		fields: [evaluationevent.periodId],
		references: [period.id]
	}),
	proker: one(proker, {
		fields: [evaluationevent.prokerId],
		references: [proker.id]
	}),
	indicatorsnapshots: many(indicatorsnapshot),
}));

export const periodRelations = relations(period, ({many}) => ({
	evaluationevents: many(evaluationevent),
	prokers: many(proker),
	users: many(user),
}));

export const prokerRelations = relations(proker, ({one, many}) => ({
	evaluationevents: many(evaluationevent),
	panitias: many(panitia),
	division: one(division, {
		fields: [proker.divisionId],
		references: [division.id]
	}),
	period: one(period, {
		fields: [proker.periodId],
		references: [period.id]
	}),
}));

export const evaluationscoreRelations = relations(evaluationscore, ({one}) => ({
	evaluation: one(evaluation, {
		fields: [evaluationscore.evaluationId],
		references: [evaluation.id]
	}),
	indicatorsnapshot: one(indicatorsnapshot, {
		fields: [evaluationscore.indicatorSnapshotId],
		references: [indicatorsnapshot.id]
	}),
}));

export const indicatorsnapshotRelations = relations(indicatorsnapshot, ({one, many}) => ({
	evaluationscores: many(evaluationscore),
	evaluationevent: one(evaluationevent, {
		fields: [indicatorsnapshot.eventId],
		references: [evaluationevent.id]
	}),
	indicator: one(indicator, {
		fields: [indicatorsnapshot.indicatorId],
		references: [indicator.id]
	}),
}));

export const indicatorRelations = relations(indicator, ({many}) => ({
	indicatorsnapshots: many(indicatorsnapshot),
}));

export const panitiaRelations = relations(panitia, ({one}) => ({
	proker: one(proker, {
		fields: [panitia.prokerId],
		references: [proker.id]
	}),
	user: one(user, {
		fields: [panitia.userId],
		references: [user.id]
	}),
}));

export const divisionRelations = relations(division, ({many}) => ({
	prokers: many(proker),
	users: many(user),
}));