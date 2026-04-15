import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";
import { EvaluationForm } from "@/components/evaluation-form";

interface PageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EventEvaluationsPage({ params, searchParams }: PageProps) {
  const query = await searchParams;
  const { eventId } = await params;
  const session = await getSession();
  if (!session) redirect("/");

  const success = query?.success ? decodeURIComponent(query.success) : undefined;
  const error = query?.error ? decodeURIComponent(query.error) : undefined;

  async function submitAllEvaluations(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");

    const evaluationIds = formData.getAll("evaluationId").map(String);

    if (evaluationIds.length === 0) {
      redirect(`/evaluations/${eventId}?error=Tidak%20ada%20evaluasi%20untuk%20disubmit`);
    }

    const allPendingEvaluations = await prisma.evaluation.findMany({
      where: {
        evaluatorId: session.userId,
        eventId,
        scores: { none: {} },
      },
      include: {
        event: { include: { indicators: true } },
        scores: true,
      },
    });

    if (evaluationIds.length !== allPendingEvaluations.length) {
      redirect(
        `/evaluations/${eventId}?error=${encodeURIComponent(
          `Anda harus mengisi semua ${allPendingEvaluations.length} penilaian sebelum submit. Baru terisi: ${evaluationIds.length}`
        )}`
      );
    }

    const pendingIds = new Set(allPendingEvaluations.map((e) => e.id));
    for (const id of evaluationIds) {
      if (!pendingIds.has(id)) {
        redirect(`/evaluations/${eventId}?error=Evaluasi%20tidak%20ditemukan`);
      }
    }

    const eventData = allPendingEvaluations[0]?.event;
    if (!eventData) {
      redirect(`/evaluations/${eventId}?error=Event%20tidak%20ditemukan`);
    }

    const now = new Date();
    if (!eventData.isOpen || now < eventData.startDate || now > eventData.endDate) {
      redirect(`/evaluations/${eventId}?error=Event%20tidak%20sedang%20dibuka`);
    }

    const allEvalData: Array<{
      evaluationId: string;
      feedback: string;
      scores: Array<{ indicatorSnapshotId: string; score: number }>;
    }> = [];

    for (const evaluation of allPendingEvaluations) {
      const feedback = String(formData.get(`feedback-${evaluation.id}`) ?? "");
      const scores = evaluation.event.indicators.map((snap) => ({
        indicatorSnapshotId: snap.id,
        score: Number(formData.get(`score-${evaluation.id}-${snap.id}`)),
      }));

      const parsed = submitEvaluationSchema.safeParse({
        evaluationId: evaluation.id,
        feedback,
        scores,
      });

      if (!parsed.success) {
        redirect(`/evaluations/${eventId}?error=Input%20tidak%20valid%20untuk%20salah%20satu%20penilaian`);
      }

      allEvalData.push({ evaluationId: evaluation.id, feedback, scores });
    }

    await prisma.$transaction(async (tx) => {
      for (const evalData of allEvalData) {
        await tx.evaluationScore.createMany({
          data: evalData.scores.map((s) => ({
            evaluationId: evalData.evaluationId,
            indicatorSnapshotId: s.indicatorSnapshotId,
            score: s.score,
          })),
        });
        await tx.evaluation.update({
          where: { id: evalData.evaluationId },
          data: { feedback: evalData.feedback },
        });
      }
    });

    revalidatePath("/evaluations");
    revalidatePath("/evaluations/open");
    revalidatePath("/evaluations/progress");
    revalidatePath("/evaluations/completed");
    revalidatePath(`/evaluations/${eventId}`);
    redirect(
      `/evaluations/${eventId}?success=${encodeURIComponent(
        `${allEvalData.length} penilaian berhasil tersimpan`
      )}`
    );
  }

  const now = new Date();

  const [event, pending, completed] = await Promise.all([
    prisma.evaluationEvent.findUnique({
      where: { id: eventId },
      include: {
        period: true,
        proker: true,
        indicators: { include: { indicator: true } },
      },
    }),
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, eventId, scores: { none: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: { include: { indicators: { include: { indicator: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, eventId, scores: { some: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: true,
        scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!event) {
    redirect("/evaluations?error=Event%20tidak%20ditemukan");
  }

  if (pending.length === 0 && completed.length === 0) {
    redirect("/evaluations?error=Tidak%20ada%20tugas%20untuk%20event%20ini");
  }

  const totalTasks = pending.length + completed.length;
  const progressPercent = totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0;

  // Serialize pending data for client component
  const pendingForClient = pending.map((ev) => ({
    id: ev.id,
    evaluatee: {
      name: ev.evaluatee.name,
      division: ev.evaluatee.division ? { name: ev.evaluatee.division.name } : null,
    },
    event: {
      isOpen: ev.event.isOpen,
      indicators: ev.event.indicators.map((snap) => ({
        id: snap.id,
        indicator: { name: snap.indicator.name },
      })),
    },
  }));

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Event header */}
      <div>
        <Link href="/evaluations/open" className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
          ← Kembali ke Event Dibuka
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{event.name}</h2>
        <div className="mt-1 text-sm text-slate-600">
          {event.type} · {event.period?.name ?? "-"}
          {event.proker ? ` · ${event.proker.name ?? ""}` : ""}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
          <span>{new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}</span>
          {!event.isOpen && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">Ditutup</span>}
        </div>
      </div>

      {/* Progress summary bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            <span className="font-semibold text-emerald-600">{completed.length}</span> selesai ·{" "}
            <span className="font-semibold text-amber-600">{pending.length}</span> belum
          </span>
          <span className="text-sm font-semibold text-slate-700">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {/* Pending evaluations form — client component with validation */}
      {pending.length > 0 && (
        <EvaluationForm
          pending={pendingForClient}
          eventIsOpen={event.isOpen}
          submitAction={submitAllEvaluations}
        />
      )}

      {/* Completed evaluations */}
      {completed.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">Sudah disubmit</h3>
            <span className="text-xs text-slate-500">{completed.length} tugas</span>
          </div>

          <div className="divide-y divide-slate-100">
            {completed.map((ev) => (
              <div key={ev.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{ev.evaluatee.name}</div>
                    <div className="text-xs text-slate-500">{ev.evaluatee.division?.name ?? "-"}</div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Terkirim</span>
                </div>

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
      )}
    </div>
  );
}
