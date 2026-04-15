import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProgressPage() {
    const session = await getSession();
    if (!session) redirect("/");

    const [pending, completed] = await Promise.all([
        prisma.evaluation.findMany({
            where: { evaluatorId: session.userId, scores: { none: {} } },
            include: {
                evaluatee: { include: { division: true } },
                event: { include: { indicators: { include: { indicator: true } }, period: true, proker: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.evaluation.findMany({
            where: { evaluatorId: session.userId, scores: { some: {} } },
            select: { eventId: true },
        }),
    ]);

    // Group pending by event
    const pendingByEvent = (() => {
        const map = new Map<
            string,
            {
                event: (typeof pending)[number]["event"];
                items: (typeof pending)[number][];
            }
        >();
        for (const ev of pending) {
            const key = ev.event.id;
            const bucket = map.get(key) ?? { event: ev.event, items: [] };
            bucket.items.push(ev);
            map.set(key, bucket);
        }
        return Array.from(map.values());
    })();

    // Count completed per event
    const completedCountByEvent = new Map<string, number>();
    for (const c of completed) {
        completedCountByEvent.set(c.eventId, (completedCountByEvent.get(c.eventId) ?? 0) + 1);
    }

    return (
        <div className="space-y-5">
            {/* Page title row — not in a card, just text */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Progres Penilaian</h2>
                <span className="text-sm text-slate-500">{pending.length} tugas belum disubmit</span>
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
                                {/* Event header section */}
                                <div className="px-5 pt-5 pb-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">{group.event.name}</div>
                                            <div className="mt-0.5 text-xs text-slate-500">
                                                {group.event.type} · {group.event.period?.name ?? "-"}
                                                {group.event.proker ? ` · ${group.event.proker.name ?? ""}` : ""}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(group.event.startDate).toLocaleDateString()} – {new Date(group.event.endDate).toLocaleDateString()}
                                                {!group.event.isOpen && (
                                                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Ditutup</span>
                                                )}
                                            </div>
                                        </div>
                                        <Link
                                            href={`/evaluations/${group.event.id}`}
                                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
                                        >
                                            Buka penilaian
                                        </Link>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3 space-y-1.5">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>{completedCount} selesai · {pendingCount} belum</span>
                                            <span>{percent}%</span>
                                        </div>
                                        <Progress value={percent} />
                                    </div>
                                </div>

                                {/* Evaluatee list — visually separated from header with bg */}
                                <div className="border-t border-slate-100 bg-slate-50/60">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {group.items.map((ev) => (
                                                <tr key={ev.id} className="border-b border-slate-100 last:border-b-0">
                                                    <td className="px-5 py-2.5">
                                                        <div className="font-medium text-slate-800">{ev.evaluatee.name}</div>
                                                        <div className="text-xs text-slate-500">{ev.evaluatee.division?.name ?? "-"}</div>
                                                    </td>
                                                    <td className="px-5 py-2.5 text-right">
                                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                                                            Belum dinilai
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-500">
                    Semua tugas penilaian sudah selesai! 🎉
                </div>
            )}
        </div>
    );
}
