import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompletedPage() {
    const session = await getSession();
    if (!session) redirect("/");

    const completed = await prisma.evaluation.findMany({
        where: { evaluatorId: session.userId, scores: { some: {} } },
        include: {
            event: true,
        },
        orderBy: { createdAt: "desc" },
    });

    // Group by event
    const completedByEvent = (() => {
        const map = new Map<
            string,
            {
                event: (typeof completed)[number]["event"];
                count: number;
            }
        >();
        for (const ev of completed) {
            const key = ev.event.id;
            const bucket = map.get(key) ?? { event: ev.event, count: 0 };
            bucket.count++;
            map.set(key, bucket);
        }
        return Array.from(map.values());
    })();

    return (
        <div className="space-y-5">
            {/* Page title row */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Sudah Disubmit</h2>
                <span className="text-sm text-slate-500">{completed.length} tugas · {completedByEvent.length} event</span>
            </div>

            {completedByEvent.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {completedByEvent.map((group) => (
                        <Link
                            key={group.event.id}
                            href={`/evaluations/completed/${group.event.id}`}
                            className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                            <div className="flex-1 p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">{group.event.name}</div>
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                        {group.count} terkirim
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">{group.event.type}</div>
                                <div className="text-xs text-slate-500">
                                    {new Date(group.event.startDate).toLocaleDateString()} – {new Date(group.event.endDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-xs text-slate-500">
                                Klik untuk lihat detail penilaian →
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-500">
                    Belum ada penilaian yang disubmit.
                </div>
            )}
        </div>
    );
}
