"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EvaluationItem {
    id: string;
    evaluatee: { name: string; division: { name: string } | null };
    event: {
        isOpen: boolean;
        indicators: Array<{
            id: string;
            indicator: { name: string };
        }>;
    };
}

interface EvaluationFormProps {
    pending: EvaluationItem[];
    eventIsOpen: boolean;
    submitAction: (formData: FormData) => Promise<void>;
}

export function EvaluationForm({ pending, eventIsOpen, submitAction }: EvaluationFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, startTransition] = useTransition();
    const [incompleteNames, setIncompleteNames] = useState<string[]>([]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const form = formRef.current;
        if (!form) return;

        const formData = new FormData(form);
        const missing: string[] = [];

        // Validate each evaluation: check all score selects are filled
        for (const ev of pending) {
            let hasEmpty = false;
            for (const snap of ev.event.indicators) {
                const val = formData.get(`score-${ev.id}-${snap.id}`);
                if (!val || val === "") {
                    hasEmpty = true;
                    break;
                }
            }
            if (hasEmpty) {
                missing.push(ev.evaluatee.name);
            }
        }

        if (missing.length > 0) {
            setIncompleteNames(missing);
            toast.error(`${missing.length} penilaian belum lengkap`, {
                description: `Lengkapi skor untuk: ${missing.join(", ")}`,
                duration: 5000,
            });
            return;
        }

        // Clear errors and submit
        setIncompleteNames([]);

        startTransition(async () => {
            try {
                await submitAction(formData);
            } catch {
                // Server action will redirect, errors handled via URL params
            }
        });
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-semibold text-slate-900">Belum disubmit</h3>
                    <span className="text-xs text-slate-500">{pending.length} tugas</span>
                </div>

                {/* Info banner */}
                <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                    Isi penilaian untuk <strong>seluruh {pending.length} tugas</strong>, lalu klik &quot;Submit Semua Penilaian&quot;.
                </div>

                {/* Error notification for incomplete evaluations */}
                {incompleteNames.length > 0 && (
                    <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <div className="font-medium">Penilaian belum lengkap:</div>
                        <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                            {incompleteNames.map((name) => (
                                <li key={name}>{name} — ada skor yang belum dipilih</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Accordion items */}
                <div className="divide-y divide-slate-100 mt-2">
                    {pending.map((ev, index) => {
                        const isIncomplete = incompleteNames.includes(ev.evaluatee.name);

                        return (
                            <details key={ev.id} className="group" open={isIncomplete}>
                                <summary
                                    className={`flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm font-semibold transition-colors hover:bg-slate-50 ${isIncomplete
                                            ? "text-red-800 bg-red-50/50"
                                            : "text-slate-900"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${isIncomplete
                                                    ? "bg-red-200 text-red-700"
                                                    : "bg-slate-200 text-slate-600"
                                                }`}
                                        >
                                            {index + 1}
                                        </span>
                                        <div>
                                            <span>{ev.evaluatee.name}</span>
                                            <span className="ml-2 text-xs font-normal text-slate-500">{ev.evaluatee.division?.name ?? "-"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isIncomplete && (
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 border border-red-200">
                                                Belum lengkap
                                            </span>
                                        )}
                                        <span className="text-xs font-normal text-slate-500">{ev.event.indicators.length} indikator</span>
                                    </div>
                                </summary>

                                <div className="px-5 pb-4 pt-1 ml-9 space-y-3 border-l-2 border-slate-100">
                                    <input type="hidden" name="evaluationId" value={ev.id} />

                                    {/* Score inputs */}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {ev.event.indicators.map((snap) => (
                                            <label key={snap.id} className="flex flex-col gap-1 text-sm text-slate-700">
                                                <span className="font-medium text-slate-800">{snap.indicator.name}</span>
                                                <select
                                                    name={`score-${ev.id}-${snap.id}`}
                                                    defaultValue=""
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                                                    disabled={!ev.event.isOpen}
                                                >
                                                    <option value="" disabled>Pilih Skor</option>
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        ))}
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Feedback</p>
                                        <Textarea
                                            name={`feedback-${ev.id}`}
                                            placeholder="Catatan singkat (opsional)"
                                            className="mt-1"
                                            disabled={!ev.event.isOpen}
                                        />
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>

                {/* Submit footer */}
                <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                            Total: <strong>{pending.length}</strong> tugas
                        </p>
                        <Button type="submit" disabled={!eventIsOpen || isPending} className="px-6">
                            {isPending ? "Mengirim..." : `Submit Semua Penilaian (${pending.length})`}
                        </Button>
                    </div>
                    {!eventIsOpen && (
                        <p className="mt-1 text-xs text-amber-700">Event ini sedang ditutup.</p>
                    )}
                </div>
            </div>
        </form>
    );
}
