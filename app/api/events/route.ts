import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createEventSchema } from "@/lib/validation";
import { generateAssignmentsForEvent } from "@/lib/assignment-generator";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId") || undefined;

  const events = await prisma.evaluationEvent.findMany({
    where: { periodId: periodId ?? undefined },
    orderBy: { startDate: "desc" },
    include: {
      period: true,
      proker: true,
      indicators: { include: { indicator: true } },
      _count: { select: { evaluations: true } },
    },
  });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, type, periodId, prokerId, startDate, endDate, isOpen, indicatorIds } = parsed.data;

  // ensure indicators exist and active
  const indicators = await prisma.indicator.findMany({ where: { id: { in: indicatorIds }, isActive: true } });
  if (indicators.length !== indicatorIds.length) {
    return NextResponse.json({ error: "Beberapa indikator tidak ditemukan/aktif" }, { status: 400 });
  }

  if (type === "PROKER") {
    if (!prokerId) return NextResponse.json({ error: "Proker wajib diisi" }, { status: 400 });
    const proker = await prisma.proker.findUnique({ where: { id: prokerId } });
    if (!proker) return NextResponse.json({ error: "Proker tidak ditemukan" }, { status: 400 });
    if (proker.periodId !== periodId) {
      return NextResponse.json({ error: "Proker harus berasal dari periode yang sama" }, { status: 400 });
    }
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.evaluationEvent.create({
        data: {
          name,
          type,
          periodId,
          prokerId: type === "PROKER" ? prokerId : null,
          startDate,
          endDate,
          isOpen: isOpen ?? true,
        },
      });

      await tx.indicatorSnapshot.createMany({
        data: indicatorIds.map((indicatorId) => ({ indicatorId, eventId: created.id })),
      });

      const assignmentCount = await generateAssignmentsForEvent(tx, created);
      console.log(`[Events API] Event "${name}" created with ${assignmentCount} assignments`);

      return created;
    });

    const full = await prisma.evaluationEvent.findUnique({
      where: { id: event.id },
      include: { indicators: { include: { indicator: true } }, period: true, proker: true, _count: { select: { evaluations: true } } },
    });

    return NextResponse.json({ event: full }, { status: 201 });
  } catch (err) {
    console.error("[Events API] Failed to create event:", err);
    const message = err instanceof Error ? err.message : "Gagal membuat event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
