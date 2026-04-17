import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { evaluations, evaluationScores, evaluationEvents } from "@/lib/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";
import { EvaluationForm } from "@/components/evaluation-form";
import { ArrowLeft, CheckCircle2, TrendingUp } from "lucide-react";

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

    const submittedEvalIds = formData.getAll("evaluationId").map(String);

    if (submittedEvalIds.length === 0) {
      redirect(`/evaluations/${eventId}?error=Tidak%20ada%20evaluasi%20untuk%20disubmit`);
    }

    // Step 1: get all evaluation IDs for this evaluator + event
    const allEvalsForAction = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(and(
        eq(evaluations.evaluatorId, session.userId),
        eq(evaluations.eventId, eventId),
      ));
    const allEvalActionIds = allEvalsForAction.map((e) => e.id);

    // Step 2: find which already have scores
    const scoredRowsAction = allEvalActionIds.length > 0
      ? await db
        .select({ evaluationId: evaluationScores.evaluationId })
        .from(evaluationScores)
        .where(inArray(evaluationScores.evaluationId, allEvalActionIds))
      : [];
    const scoredActionIds = new Set(scoredRowsAction.map((r) => r.evaluationId));
    const pendingActionIds = allEvalActionIds.filter((id) => !scoredActionIds.has(id));

    // Step 3: fetch pending evaluations with event indicators (max 2 levels deep)
    const allPendingEvaluations = pendingActionIds.length > 0
      ? await db.query.evaluations.findMany({
        where: inArray(evaluations.id, pendingActionIds),
        with: {
          event: { with: { indicators: true } },
        },
      })
      : [];

    if (submittedEvalIds.length !== allPendingEvaluations.length) {
      redirect(
        `/evaluations/${eventId}?error=${encodeURIComponent(
          `Anda harus mengisi semua ${allPendingEvaluations.length} penilaian sebelum submit. Baru terisi: ${submittedEvalIds.length}`
        )}`
      );
    }

    const pendingIdsSet = new Set(allPendingEvaluations.map((e) => e.id));
    for (const id of submittedEvalIds) {
      if (!pendingIdsSet.has(id)) {
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
      const scores = evaluation.event.indicators.map((snap: any) => ({
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

    await db.transaction(async (tx) => {
      for (const evalData of allEvalData) {
        const scoresToInsert = evalData.scores.map((s) => ({
          id: crypto.randomUUID(),
          evaluationId: evalData.evaluationId,
          indicatorSnapshotId: s.indicatorSnapshotId,
          score: s.score,
        }));
        await tx.insert(evaluationScores).values(scoresToInsert);
        await tx.update(evaluations)
          .set({ feedback: evalData.feedback })
          .where(eq(evaluations.id, evalData.evaluationId));
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

  // ── Page Data ──────────────────────────────────────────────────────────────

  // Step 1: fetch event data + all evaluation IDs in parallel
  const [eventData, allEvalRows] = await Promise.all([
    db.query.evaluationEvents.findFirst({
      where: eq(evaluationEvents.id, eventId),
      with: {
        period: { columns: { name: true } },
        proker: { columns: { name: true } },
        indicators: { with: { indicator: { columns: { name: true } } } },
      },
    }),
    db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(and(
        eq(evaluations.evaluatorId, session.userId),
        eq(evaluations.eventId, eventId),
      )),
  ]);

  const allEvalIds = allEvalRows.map((r) => r.id);

  // Step 2: find completed IDs (those with scores)
  const scoredRowsPage = allEvalIds.length > 0
    ? await db
      .select({ evaluationId: evaluationScores.evaluationId })
      .from(evaluationScores)
      .where(inArray(evaluationScores.evaluationId, allEvalIds))
    : [];
  const scoredIdsPage = new Set(scoredRowsPage.map((r) => r.evaluationId));
  const pendingIdsPage = allEvalIds.filter((id) => !scoredIdsPage.has(id));
  const completedIdsPage = allEvalIds.filter((id) => scoredIdsPage.has(id));

  // Step 3: fetch pending evaluations (with evaluatee + event indicators, max 2-level deep)
  //         fetch completed evaluations (with evaluatee + scores, max 2-level deep)
  //         scores.indicatorSnapshot→indicator is ok because it's a separate query not mixing evaluation table
  const [pendingEvals, completedEvals] = await Promise.all([
    pendingIdsPage.length > 0
      ? db.query.evaluations.findMany({
        where: inArray(evaluations.id, pendingIdsPage),
        with: {
          evaluatee: {
            columns: { name: true, id: true },
            with: { division: { columns: { name: true } } },
          },
          event: {
            columns: { isOpen: true },
            with: { indicators: { columns: { id: true } } },
          },
        },
        orderBy: [desc(evaluations.createdAt)],
      })
      : Promise.resolve([] as any[]),
    completedIdsPage.length > 0
      ? db.query.evaluations.findMany({
        where: inArray(evaluations.id, completedIdsPage),
        with: {
          evaluatee: {
            columns: { name: true, id: true },
            with: { division: { columns: { name: true } } },
          },
          scores: {
            columns: { id: true, score: true },
            with: { indicatorSnapshot: { columns: { id: true }, with: { indicator: { columns: { name: true } } } } },
          },
        },
        orderBy: [desc(evaluations.createdAt)],
      })
      : Promise.resolve([] as any[]),
  ]);

  if (!eventData) {
    redirect("/evaluations?error=Event%20tidak%20ditemukan");
  }

  if (pendingEvals.length === 0 && completedEvals.length === 0) {
    redirect("/evaluations?error=Tidak%20ada%20tugas%20untuk%20event%20ini");
  }

  const totalTasks = pendingEvals.length + completedEvals.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedEvals.length / totalTasks) * 100) : 0;

  // Build indicators map from eventData (already fetched — no re-fetch needed)
  const indicatorsMap = new Map(
    (eventData.indicators ?? []).map((snap: any) => [snap.id, snap.indicator?.name ?? snap.id])
  );

  // Serialize pending data for client component
  const pendingForClient = pendingEvals.map((ev: any) => ({
    id: ev.id,
    evaluatee: {
      name: ev.evaluatee.name,
      division: ev.evaluatee.division ? { name: ev.evaluatee.division.name } : null,
    },
    event: {
      isOpen: ev.event.isOpen,
      indicators: (ev.event.indicators ?? []).map((snap: any) => ({
        id: snap.id,
        indicator: { name: indicatorsMap.get(snap.id) ?? snap.id },
      })),
    },
  }));

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link
        href="/evaluations/open"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#1a5632] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Event Dibuka
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#1a5632] to-emerald-400" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{eventData.name}</h2>
              <div className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-600">{eventData.type}</span>
                {" · "}{eventData.period?.name ?? "—"}
                {eventData.proker && ` · ${eventData.proker.name}`}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {formatDate(new Date(eventData.startDate))} – {formatDate(new Date(eventData.endDate))}
              </div>
            </div>
            {!eventData.isOpen ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Event Ditutup
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Event Terbuka
              </span>
            )}
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <TrendingUp className="h-3.5 w-3.5 text-[#1a5632]" />
                <span>
                  <span className="font-semibold text-emerald-600">{completedEvals.length}</span> selesai
                  {" · "}
                  <span className="font-semibold text-amber-600">{pendingEvals.length}</span> belum
                </span>
              </div>
              <span className="font-bold text-[#1a5632]">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1a5632] to-emerald-500 transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {pendingEvals.length > 0 && (
        <EvaluationForm
          pending={pendingForClient}
          eventIsOpen={eventData.isOpen}
          submitAction={submitAllEvaluations}
        />
      )}
      {completedEvals.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Sudah disubmit</h3>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {completedEvals.length} tugas
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {completedEvals.map((ev: any) => (
              <div key={ev.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{ev.evaluatee.name}</div>
                    <div className="text-xs text-slate-400">{ev.evaluatee.division?.name ?? "—"}</div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Terkirim
                  </span>
                </div>

                <div className="mt-3 rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <th className="text-left font-semibold px-4 py-2">Indikator</th>
                        <th className="text-right font-semibold px-4 py-2 w-20">Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ev.scores.map((s: any) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2.5 text-slate-700">{s.indicatorSnapshot.indicator.name}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-bold text-[#1a5632]">{s.score}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {ev.feedback && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Catatan: </span>{ev.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
