import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpenEventsPage() {
    const session = await getSession();
    if (!session) redirect("/");

    const now = new Date();

    const openEvents = await prisma.evaluationEvent.findMany({
        where: {
            isOpen: true,
            startDate: { lte: now },
            endDate: { gte: now },
            evaluations: { some: { evaluatorId: session.userId } },
        },
        orderBy: { startDate: "asc" },
        include: {
            period: true,
            proker: true,
            indicators: true,
            evaluations: {
                where: { evaluatorId: session.userId },
                select: {
                    id: true,
                    scores: { select: { id: true }, take: 1 },
                },
            },
        },
    });

    return (
        <div className="space-y-5">
            {/* Page title row */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Event Dibuka</h2>
                <span className="text-sm text-slate-500">{openEvents.length} event aktif</span>
            </div>

            {openEvents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {openEvents.map((ev) => {
                        const totalAssignments = ev.evaluations.length;
                        const completedAssignments = ev.evaluations.filter((e) => e.scores.length > 0).length;
                        const pendingAssignments = totalAssignments - completedAssignments;
                        const percent = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
                        const allDone = pendingAssignments === 0 && totalAssignments > 0;

                        return (
                            <Link
                                key={ev.id}
                                href={`/evaluations/${ev.id}`}
                                className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                            >
                                {/* Content */}
                                <div className="flex-1 p-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">{ev.name}</div>
                                        {allDone ? (
                                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">✓ Selesai</span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">{pendingAssignments} sisa</span>
                                        )}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {ev.type} · {ev.period.name}
                                        {ev.proker ? ` · ${ev.proker.name}` : ""}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {new Date(ev.startDate).toLocaleDateString()} – {new Date(ev.endDate).toLocaleDateString()}
                                    </div>

                                    <div className="mt-3 text-xs text-slate-500">
                                        {ev.indicators.length} indikator · {totalAssignments} tugas
                                    </div>
                                </div>

                                {/* Progress footer */}
                                {totalAssignments > 0 && (
                                    <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">
                                            {completedAssignments}/{totalAssignments} selesai
                                        </div>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-500">
                    Tidak ada event yang sedang dibuka saat ini.
                </div>
            )}
        </div>
    );
}
