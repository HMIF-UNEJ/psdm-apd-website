import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { evaluations } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ListTodo, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProgressPage() {
    const session = await getSession();
    if (!session) redirect("/");

    const allEvaluations = await db.query.evaluations.findMany({
        where: eq(evaluations.evaluatorId, session.userId),
        orderBy: [desc(evaluations.createdAt)],
        with: {
            evaluatee: {
                columns: { name: true, id: true },
                with: { division: { columns: { name: true } } },
            },
            event: {
                columns: { id: true, name: true, type: true, isOpen: true, startDate: true, endDate: true },
                with: {
                    period: { columns: { name: true } },
                    proker: { columns: { name: true } },
                    indicators: { columns: { id: true } },
                },
            },
            scores: { columns: { id: true } },
        },
    });

    const pending = allEvaluations.filter((ev) => ev.scores.length === 0);
    const completed = allEvaluations.filter((ev) => ev.scores.length > 0);

    // Group pending by event
    const pendingByEvent = (() => {
        const map = new Map<string, { event: (typeof pending)[number]["event"]; items: (typeof pending)[number][] }>();
        for (const ev of pending) {
            const key = ev.event.id;
            const bucket = map.get(key) ?? { event: ev.event, items: [] };
            bucket.items.push(ev);
            map.set(key, bucket);
        }
        return Array.from(map.values());
    })();

    const completedCountByEvent = new Map<string, number>();
    for (const c of completed) {
        completedCountByEvent.set(c.eventId, (completedCountByEvent.get(c.eventId) ?? 0) + 1);
    }

    function formatDate(d: Date) {
        return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
    }

    return (
        <div className="space-y-5">
            {/* Page title */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-[#1a5632]" />
                    <h2 className="text-lg font-bold text-slate-900">Progres Penilaian</h2>
                </div>
                {pending.length > 0 && (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                        {pending.length} tugas belum selesai
                    </span>
                )}
            </div>

            {pendingByEvent.length > 0 ? (
                <div className="space-y-4">
                    {pendingByEvent.map((group) => {
                        const completedCount = completedCountByEvent.get(group.event.id) ?? 0;
                        const pendingCount = group.items.length;
                        const total = completedCount + pendingCount;
                        const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

                        return (
                            <div key={group.event.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                {/* Event header */}
                                <div className="px-5 pt-5 pb-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-slate-900">{group.event.name}</span>
                                                {!group.event.isOpen && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                                        Ditutup
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 text-xs text-slate-500">
                                                {group.event.type} · {group.event.period?.name ?? "—"}
                                                {group.event.proker ? ` · ${group.event.proker.name}` : ""}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {formatDate(new Date(group.event.startDate))} – {formatDate(new Date(group.event.endDate))}
                                            </div>
                                        </div>
                                        <Link
                                            href={`/evaluations/${group.event.id}`}
                                            className="flex items-center gap-1.5 rounded-lg bg-[#1a5632] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#154d2b] transition-colors"
                                        >
                                            Buka <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4 space-y-1.5">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>
                                                <span className="font-semibold text-emerald-600">{completedCount}</span> selesai ·{" "}
                                                <span className="font-semibold text-amber-600">{pendingCount}</span> belum
                                            </span>
                                            <span className="font-semibold text-slate-700">{percent}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#1a5632] to-emerald-500 transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Evaluatee list */}
                                <div className="border-t border-slate-100 bg-slate-50/50">
                                    {group.items.map((ev, i) => (
                                        <div
                                            key={ev.id}
                                            className={`flex items-center justify-between px-5 py-3 ${i < group.items.length - 1 ? "border-b border-slate-100" : ""}`}
                                        >
                                            <div>
                                                <div className="text-sm font-medium text-slate-800">{ev.evaluatee.name}</div>
                                                <div className="text-xs text-slate-400">{ev.evaluatee.division?.name ?? "—"}</div>
                                            </div>
                                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                                <Clock className="h-3 w-3" /> Belum dinilai
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="font-medium text-slate-500">Semua tugas penilaian sudah selesai!</p>
                    <p className="text-sm text-slate-400 mt-1">Tidak ada tugas yang tersisa saat ini.</p>
                </div>
            )}
        </div>
    );
}
