import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
    params: Promise<{ eventId: string }>;
}

export default async function CompletedEventDetailPage({ params }: PageProps) {
    const { eventId } = await params;
    const session = await getSession();
    if (!session) redirect("/");

    const [event, completed] = await Promise.all([
        prisma.evaluationEvent.findUnique({
            where: { id: eventId },
            include: {
                period: true,
                proker: true,
            },
        }),
        prisma.evaluation.findMany({
            where: { evaluatorId: session.userId, eventId, scores: { some: {} } },
            include: {
                evaluatee: { include: { division: true } },
                scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    if (!event) {
        redirect("/evaluations/completed?error=Event%20tidak%20ditemukan");
    }

    if (completed.length === 0) {
        redirect("/evaluations/completed");
    }

    return (
        <div className="space-y-5">
            {/* Breadcrumb + Event header */}
            <div>
                <Link href="/evaluations/completed" className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                    ← Kembali ke Sudah Disubmit
                </Link>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{event.name}</h2>
                <div className="mt-1 text-sm text-slate-600">
                    {event.type} · {event.period?.name ?? "-"}
                    {event.proker ? ` · ${event.proker.name ?? ""}` : ""}
                </div>
                <div className="text-xs text-slate-500">
                    {new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}
                </div>
            </div>

            {/* Summary bar */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                        <span className="font-semibold text-emerald-600">{completed.length}</span> penilaian terkirim
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        Selesai
                    </span>
                </div>
            </div>

            {/* Evaluation details */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {completed.map((ev) => (
                        <div key={ev.id} className="px-5 py-4">
                            {/* Person row */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{ev.evaluatee.name}</div>
                                    <div className="text-xs text-slate-500">{ev.evaluatee.division?.name ?? "-"}</div>
                                </div>
                                <div className="text-xs text-slate-500">{ev.scores.length} indikator</div>
                            </div>

                            {/* Scores table */}
                            <div className="mt-3 rounded-lg border border-slate-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-xs text-slate-500">
                                            <th className="text-left font-medium px-3 py-1.5">Indikator</th>
                                            <th className="text-right font-medium px-3 py-1.5 w-20">Skor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ev.scores.map((s) => (
                                            <tr key={s.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2 text-slate-800">{s.indicatorSnapshot.indicator.name}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-slate-900">{s.score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {ev.feedback && (
                                <p className="mt-2 text-sm text-slate-600">
                                    <span className="font-medium text-slate-700">Catatan:</span> {ev.feedback}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
