import 'dotenv/config';
import { db } from "../lib/db";
import { indicators, prokers, periods, divisions, users, evaluationEvents, indicatorSnapshots, evaluations, evaluationScores } from "../lib/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

const hardIndicators = [
  "Perencanaan Program",
  "Eksekusi Tugas",
  "Manajemen Waktu",
  "Dokumentasi",
  "Penggunaan Tools Digital",
  "Analisis Data",
  "Penyusunan Laporan",
  "Kepatuhan Prosedur",
  "Problem Solving Teknis",
  "Kualitas Deliverable",
  "Kolaborasi Teknis",
  "Kerapihan Administrasi",
];

const softIndicators = ["Komunikasi", "Kepemimpinan", "Kerja Tim", "Inisiatif", "Adaptabilitas", "Tanggung Jawab", "Integritas"];

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "JayalahHimpunanku123!";
const DEFAULT_PERIOD = {
  name: "2025/2026",
  startYear: 2025,
  endYear: 2026,
  isActive: true,
};

const DEFAULT_DIVISIONS = ["BPI", "PSDM", "Kewirausahaan","Mediatek","Humas","Litbang"];

const DEFAULT_USERS = [
  { nim: "18082018", name: "Super Admin", role: "ADMIN" as const, division: null },
];

async function seedIndicators() {
  console.log("Seeding indicators...");
  for (const name of hardIndicators) {
    const existing = await db.query.indicators.findFirst({ where: eq(indicators.name, name) });
    if (!existing) {
      await db.insert(indicators).values({ id: crypto.randomUUID(), name, category: "hardskill" });
    }
  }

  for (const name of softIndicators) {
    const existing = await db.query.indicators.findFirst({ where: eq(indicators.name, name) });
    if (!existing) {
      await db.insert(indicators).values({ id: crypto.randomUUID(), name, category: "softskill" });
    }
  }
}

// async function seedProker(periodId: string, divisionMap: Record<string, string>) {
//   console.log("Seeding sample proker...");
//   const name = "Pengembangan Kepemimpinan";
//   const existing = await db.query.prokers.findFirst({ where: and(eq(prokers.name, name), eq(prokers.periodId, periodId)) });
//   if (existing) return existing.id;

//   const divisionId = divisionMap["PSDM"] ?? Object.values(divisionMap)[0];
//   const id = crypto.randomUUID();
//   await db.insert(prokers).values({ id, name, periodId, divisionId });
//   return id;
// }

// async function seedEventsAndEvaluations(periodId: string, prokerId: string | null, userMap: Record<string, string>) {
//   console.log("Seeding events, snapshots, and evaluations...");

//   const indicatorsData = await db.query.indicators.findMany({ orderBy: [asc(indicators.name)] });
//   const hard = indicatorsData.filter((i: any) => i.category === "hardskill").slice(0, 2);
//   const soft = indicatorsData.filter((i: any) => i.category === "softskill").slice(0, 2);
//   const chosenIndicators = [...hard, ...soft];
//   if (chosenIndicators.length === 0) {
//     console.warn("No indicators found; skipping event seeding.");
//     return;
//   }

//   let periodicEvent = await db.query.evaluationEvents.findFirst({ where: and(eq(evaluationEvents.name, "Evaluasi Tengah Periode"), eq(evaluationEvents.periodId, periodId)) });
//   if (!periodicEvent) {
//     const id = crypto.randomUUID();
//     await db.insert(evaluationEvents).values({
//       id,
//       name: "Evaluasi Tengah Periode",
//       type: "PERIODIC",
//       periodId,
//       startDate: new Date(),
//       endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       isOpen: true,
//     });
//     periodicEvent = await db.query.evaluationEvents.findFirst({ where: eq(evaluationEvents.id, id) });
//   }

//   let prokerEvent = null;
//   if (prokerId) {
//     prokerEvent = await db.query.evaluationEvents.findFirst({ where: and(eq(evaluationEvents.name, "Evaluasi Proker PSDM"), eq(evaluationEvents.periodId, periodId), eq(evaluationEvents.prokerId, prokerId)) });
//     if (!prokerEvent) {
//       const id = crypto.randomUUID();
//       await db.insert(evaluationEvents).values({
//         id,
//         name: "Evaluasi Proker PSDM",
//         type: "PROKER",
//         prokerId,
//         periodId,
//         startDate: new Date(),
//         endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
//         isOpen: true,
//       });
//       prokerEvent = await db.query.evaluationEvents.findFirst({ where: eq(evaluationEvents.id, id) });
//     }
//   }

//   async function ensureSnapshots(eventId: string) {
//     const existing = await db.query.indicatorSnapshots.findMany({ where: eq(indicatorSnapshots.eventId, eventId) });
//     if (existing.length > 0) return existing;

//     const values = chosenIndicators.map((ind) => ({
//       id: crypto.randomUUID(),
//       indicatorId: ind.id,
//       eventId
//     }));
//     await db.insert(indicatorSnapshots).values(values);
//     return db.query.indicatorSnapshots.findMany({ where: eq(indicatorSnapshots.eventId, eventId) });
//   }

//   const periodicSnapshots = await ensureSnapshots(periodicEvent!.id);
//   const prokerSnapshots = prokerEvent ? await ensureSnapshots(prokerEvent.id) : [];

//   const scoresA = [4, 5, 4, 5];
//   const scoresB = [3, 4, 3, 4];

//   async function createEvaluation(eventId: string, evaluatorNim: string, evaluateeNim: string, snapshotList: any[], scores: number[], feedback?: string) {
//     const evaluatorId = userMap[evaluatorNim];
//     const evaluateeId = userMap[evaluateeNim];
//     if (!evaluatorId || !evaluateeId) return;

//     let evaluation = await db.query.evaluations.findFirst({
//       where: and(
//         eq(evaluations.evaluatorId, evaluatorId),
//         eq(evaluations.evaluateeId, evaluateeId),
//         eq(evaluations.eventId, eventId)
//       )
//     });

//     if (evaluation) {
//       await db.update(evaluations).set({ feedback }).where(eq(evaluations.id, evaluation.id));
//     } else {
//       const id = crypto.randomUUID();
//       await db.insert(evaluations).values({
//         id,
//         evaluatorId,
//         evaluateeId,
//         eventId,
//         feedback
//       });
//       evaluation = { id } as any;
//     }

//     const existingScores = await db.query.evaluationScores.findMany({ where: eq(evaluationScores.evaluationId, evaluation!.id) });
//     if (existingScores.length === 0) {
//       const scoreValues = snapshotList.map((snap, idx) => ({
//         id: crypto.randomUUID(),
//         evaluationId: evaluation!.id,
//         indicatorSnapshotId: snap.id,
//         score: scores[idx] ?? scores[scores.length - 1] ?? 4,
//       }));
//       await db.insert(evaluationScores).values(scoreValues);
//     }
//   }

//   // Periodic event evaluations
//   await createEvaluation(periodicEvent!.id, "0001", "2001", periodicSnapshots, scoresA, "Kinerja solid, teruskan ritme.");
//   await createEvaluation(periodicEvent!.id, "1001", "3001", periodicSnapshots, scoresB, "Perbaiki dokumentasi dan komunikasi.");

//   // Proker event evaluations
//   if (prokerEvent) {
//     await createEvaluation(prokerEvent.id, "0001", "3001", prokerSnapshots, scoresA, "Eksekusi proker baik, deadline terjaga.");
//     await createEvaluation(prokerEvent.id, "2001", "3001", prokerSnapshots, scoresB, "Butuh lebih proaktif koordinasi.");
//   }
// }

async function seedUserPasswords() {
  console.log("Backfilling password hashes for existing users (if needed)...");
  const usersData = await db.query.users.findMany({ columns: { id: true, passwordHash: true } });
  const targets = usersData.filter((u: any) => !u.passwordHash || u.passwordHash.length < 20 || !u.passwordHash.startsWith("$2"));
  if (targets.length === 0) return;

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await Promise.all(
    targets.map((u: any) =>
      db.update(users).set({ passwordHash: hash }).where(eq(users.id, u.id))
    ),
  );
  console.log(`Updated passwordHash for ${targets.length} user(s) with default password.`);
}

async function seedPeriodAndDivisions() {
  console.log("Seeding period and divisions...");
  let period = await db.query.periods.findFirst({ where: eq(periods.name, DEFAULT_PERIOD.name) });
  if (!period) {
    const id = crypto.randomUUID();
    await db.insert(periods).values({
      id,
      ...DEFAULT_PERIOD,
    });
    period = await db.query.periods.findFirst({ where: eq(periods.id, id) });
  }

  const divisionMap: Record<string, string> = {};
  for (const name of DEFAULT_DIVISIONS) {
    let division = await db.query.divisions.findFirst({ where: eq(divisions.name, name) });
    if (!division) {
      const id = crypto.randomUUID();
      await db.insert(divisions).values({ id, name });
      division = await db.query.divisions.findFirst({ where: eq(divisions.id, id) });
    }
    divisionMap[name] = division!.id;
  }

  return { periodId: period!.id, divisionMap };
}

async function seedUsers(periodId: string, divisionMap: Record<string, string>) {
  console.log("Seeding default users...");
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of DEFAULT_USERS) {
    try {
      const existing = await db.query.users.findFirst({ where: eq(users.nim, u.nim) });
      const userData = {
        name: u.name,
        role: u.role,
        isActive: true,
        periodId,
        divisionId: u.division ? divisionMap[u.division] : null,
        passwordHash: hash,
      };

      if (existing) {
        await db.update(users).set(userData).where(eq(users.id, existing.id));
      } else {
        await db.insert(users).values({
          id: crypto.randomUUID(),
          nim: u.nim,
          ...userData
        });
      }
      console.log(`Upserted user ${u.nim}`);
    } catch (err) {
      console.error(`Failed to upsert user ${u.nim}`, err);
      throw err;
    }
  }
  console.log(`Seeded/updated ${DEFAULT_USERS.length} default users.`);

  const usersData = await db.query.users.findMany({ columns: { id: true, nim: true } });
  return usersData.reduce<Record<string, string>>((acc: Record<string, string>, u: any) => {
    acc[u.nim] = u.id;
    return acc;
  }, {});
}

async function main() {
  const { periodId, divisionMap } = await seedPeriodAndDivisions();
  await seedIndicators();
  const userMap = await seedUsers(periodId, divisionMap);
  await seedUserPasswords();

  console.log("all proses finished");
  process.exit(0); // Selesaikan proses di sini
  // const prokerId = await seedProker(periodId, divisionMap);
  // await seedEventsAndEvaluations(periodId, prokerId, userMap);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
