import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { evaluations, evaluationScores, evaluationEvents } from "@/lib/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function EvaluationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");

  const now = new Date();

  const [pendingCount, completedCount, openEventCount] = await Promise.all([
    // evaluations with NO scores
    db
      .select({ cnt: sql<number>`count(distinct ${evaluations.id})` })
      .from(evaluations)
      .leftJoin(evaluationScores, eq(evaluationScores.evaluationId, evaluations.id))
      .where(and(eq(evaluations.evaluatorId, session.userId), sql`${evaluationScores.id} IS NULL`))
      .then((r) => Number(r[0]?.cnt ?? 0)),
    // evaluations WITH at least one score
    db
      .select({ cnt: sql<number>`count(distinct ${evaluations.id})` })
      .from(evaluations)
      .innerJoin(evaluationScores, eq(evaluationScores.evaluationId, evaluations.id))
      .where(eq(evaluations.evaluatorId, session.userId))
      .then((r) => Number(r[0]?.cnt ?? 0)),
    // open events with at least one assignment for this user
    db
      .select({ cnt: sql<number>`count(distinct ${evaluationEvents.id})` })
      .from(evaluationEvents)
      .innerJoin(
        evaluations,
        and(
          eq(evaluations.eventId, evaluationEvents.id),
          eq(evaluations.evaluatorId, session.userId)
        )
      )
      .where(
        and(
          eq(evaluationEvents.isOpen, 1),
          lte(evaluationEvents.startDate, now),
          gte(evaluationEvents.endDate, now)
        )
      )
      .then((r) => Number(r[0]?.cnt ?? 0)),
  ]);

  const totalAll = pendingCount + completedCount;
  const overallPercent = totalAll > 0 ? Math.round((completedCount / totalAll) * 100) : 0;

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const error = params?.error ? decodeURIComponent(params.error) : undefined;

  const stats = [
    {
      label: "Event Aktif",
      value: openEventCount,
      valueColor: "text-[#1a5632]",
      href: "/evaluations/open",
      sub: "Event yang sedang dibuka",
    },
    {
      label: "Belum Disubmit",
      value: pendingCount,
      valueColor: "text-amber-600",
      href: "/evaluations/progress",
      sub: "Tugas menunggu penilaian",
    },
    {
      label: "Sudah Selesai",
      value: completedCount,
      valueColor: "text-emerald-600",
      href: "/evaluations/completed",
      sub: "Riwayat penilaian terkirim",
    },
  ];

  return (
    <div className="space-y-5">
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{s.label}</div>
            <div className={`text-4xl font-bold tabular-nums ${s.valueColor}`}>{s.value}</div>
            <div className="mt-2 text-xs text-slate-400">{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* Overall progress */}
      {totalAll > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-700">Progres Keseluruhan</h2>
            <span className="text-sm font-bold text-[#1a5632]">{overallPercent}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1a5632] to-emerald-500 transition-all duration-700"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{completedCount} dari {totalAll} tugas selesai</span>
            {pendingCount > 0 && <span className="font-medium text-amber-600">{pendingCount} tersisa</span>}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3.5">
          <p className="text-xs font-semibold text-emerald-800 mb-0.5">💡 Tips Penilaian</p>
          <p className="text-sm text-emerald-700">Fokus pada objektivitas dan beri feedback singkat yang membangun.</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3.5">
          <p className="text-xs font-semibold text-sky-800 mb-0.5">⏰ Pengingat</p>
          <p className="text-sm text-sky-700">Pastikan menyelesaikan semua penilaian sebelum event ditutup.</p>
        </div>
      </div>

      {totalAll === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-slate-500 font-medium">Belum ada tugas penilaian</p>
          <p className="text-slate-400 text-sm mt-1">Tugas penilaian akan muncul setelah admin membuka event.</p>
        </div>
      )}
    </div>
  );
}
