import { Prisma, EventType } from "@prisma/client";


export async function generateAssignmentsForEvent(tx: Prisma.TransactionClient, event: { id: string; type: EventType; periodId: string; prokerId: string | null }) {
  if (event.type === "PERIODIC") {
    return await generatePeriodicAssignments(tx, event.id, event.periodId);
  } else if (event.type === "PROKER" && event.prokerId) {
    return await generateProkerAssignments(tx, event.id, event.prokerId, event.periodId);
  }
  return 0;
}

async function generatePeriodicAssignments(tx: Prisma.TransactionClient, eventId: string, periodId: string) {
  const users = await tx.user.findMany({
    where: { periodId, isActive: true },
    select: { id: true, role: true, divisionId: true },
  });

  const bpi = users.filter((u) => u.role === "BPI");
  const kadiv = users.filter((u) => u.role === "KADIV");
  const anggota = users.filter((u) => u.role === "ANGGOTA");

  const pairs: { evaluatorId: string; evaluateeId: string; eventId: string }[] = [];

  for (const ev of users) {
    if (ev.role === "BPI") {
      for (const target of users) {
        if (target.id !== ev.id) pairs.push({ evaluatorId: ev.id, evaluateeId: target.id, eventId });
      }
    } else if (ev.role === "KADIV") {
      const sameDivAnggota = anggota.filter((a) => a.divisionId && a.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivAnggota]) {
        if (target.id !== ev.id) pairs.push({ evaluatorId: ev.id, evaluateeId: target.id, eventId });
      }
    } else if (ev.role === "ANGGOTA") {
      const sameDivAnggota = anggota.filter((a) => a.divisionId && a.divisionId === ev.divisionId && a.id !== ev.id);
      const sameDivKadiv = kadiv.filter((k) => k.divisionId && k.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivKadiv, ...sameDivAnggota]) {
        if (target.id !== ev.id) pairs.push({ evaluatorId: ev.id, evaluateeId: target.id, eventId });
      }
    }
  }

  if (pairs.length > 0) {
    await tx.evaluation.createMany({ data: pairs, skipDuplicates: true });
  }

  console.log(`[Assignment Generator] PERIODIC event ${eventId}: ${users.length} users → ${pairs.length} assignments`);
  return pairs.length;
}

async function generateProkerAssignments(tx: Prisma.TransactionClient, eventId: string, prokerId: string, periodId: string) {
  const panitia = await tx.panitia.findMany({
    where: { prokerId },
    include: { user: true },
  });

  console.log(`[Assignment Generator] PROKER event ${eventId}: Found ${panitia.length} total panitia for proker ${prokerId}`);

  const activeUsers = panitia.filter((p) => p.user && p.user.isActive).map((p) => p.user);

  console.log(`[Assignment Generator] PROKER event ${eventId}: ${activeUsers.length} active users after filtering`);
  if (activeUsers.length > 0) {
    console.log(`[Assignment Generator] Active user IDs: ${activeUsers.map((u) => u.id).join(", ")}`);
  }

  // Validate minimum panitia — need at least 2 to form evaluation pairs
  if (activeUsers.length < 2) {
    throw new Error(
      `Gagal membuat assignment: Proker ini hanya memiliki ${activeUsers.length} panitia aktif. ` +
      `Minimal 2 panitia aktif diperlukan untuk membuat pasangan evaluasi.`
    );
  }

  const pairs: { evaluatorId: string; evaluateeId: string; eventId: string }[] = [];
  for (const eva of activeUsers) {
    for (const evb of activeUsers) {
      if (eva.id !== evb.id) {
        pairs.push({ evaluatorId: eva.id, evaluateeId: evb.id, eventId });
      }
    }
  }

  if (pairs.length > 0) {
    await tx.evaluation.createMany({ data: pairs, skipDuplicates: true });
  }

  console.log(`[Assignment Generator] PROKER event ${eventId}: Created ${pairs.length} assignment pairs`);
  return pairs.length;
}

