import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
    prisma.evaluation.count({
      where: { evaluatorId: session.userId, scores: { none: {} } },
    }),
    prisma.evaluation.count({
      where: { evaluatorId: session.userId, scores: { some: {} } },
    }),
    prisma.evaluationEvent.count({
      where: {
        isOpen: true,
        startDate: { lte: now },
        endDate: { gte: now },
        evaluations: { some: { evaluatorId: session.userId } },
      },
    }),
  ]);

  const totalAll = pendingCount + completedCount;
  const overallPercent = totalAll > 0 ? Math.round((completedCount / totalAll) * 100) : 0;

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const error = params?.error ? decodeURIComponent(params.error) : undefined;

  return (
    <div className="space-y-5">
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {/* Stat cards — top-level items, no wrapping container */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/evaluations/open" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="text-sm text-slate-500">Event Dibuka</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{openEventCount}</div>
          <div className="mt-2 text-xs text-slate-500">Event aktif saat ini</div>
        </Link>

        <Link href="/evaluations/progress" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="text-sm text-slate-500">Belum Disubmit</div>
          <div className="mt-1 text-3xl font-bold text-amber-600">{pendingCount}</div>
          <div className="mt-2 text-xs text-slate-500">Tugas yang perlu dikerjakan</div>
        </Link>

        <Link href="/evaluations/completed" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="text-sm text-slate-500">Sudah Disubmit</div>
          <div className="mt-1 text-3xl font-bold text-emerald-600">{completedCount}</div>
          <div className="mt-2 text-xs text-slate-500">Lihat riwayat penilaian</div>
        </Link>
      </div>

      {/* Tips — smaller, below stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Fokus pada objektivitas dan beri feedback singkat yang membangun.
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Pastikan menyelesaikan semua penilaian sebelum event ditutup.
        </div>
      </div>

      {/* Overall progress */}
      {totalAll > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Progres Keseluruhan</h2>
            <span className="text-sm font-semibold text-slate-700">{overallPercent}%</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
            <span>{completedCount} dari {totalAll} tugas selesai</span>
            <span>{pendingCount} tugas tersisa</span>
          </div>
        </div>
      )}

      {totalAll === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
          Belum ada tugas penilaian yang diberikan.
        </div>
      )}
    </div>
  );
}
