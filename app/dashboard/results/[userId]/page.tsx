import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canViewResults } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, periods } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getEventReport } from "@/services/reports";

type PageProps = {
    params: Promise<{ userId: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MemberDetailPage({ params, searchParams }: PageProps) {
    const { userId } = await params;
    const { eventId } = await searchParams;

    const session = await getSession();
    if (!session) redirect("/login");
    if (!canViewResults(session.role)) redirect("/dashboard");

    if (!eventId) notFound();

    const [activePeriod, currentUser] = await Promise.all([
        db.query.periods.findFirst({ where: eq(periods.isActive, true), orderBy: [desc(periods.startYear)] }),
        session.userId
            ? db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { name: true, email: true } })
            : Promise.resolve(null),
    ]);

    const report = await getEventReport(eventId, session);
    const memberResult = report.results.find((r) => r.evaluateeId === userId);

    if (!memberResult) notFound();

    const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
    const typeLabel = report.event.type === "PROKER" ? "Event Proker" : "Event Periodik";

    const hardIndicators = memberResult.indicators.filter((i) => i.category === "hardskill");
    const softIndicators = memberResult.indicators.filter((i) => i.category === "softskill");

    return (
        <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined}>
            <SiteHeader title="Hasil & Laporan" activePeriod={activePeriod?.name ?? "-"} />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">

                    {/* Back button */}
                    <div>
                        <Button asChild variant="ghost" size="sm" className="-ml-2">
                            <Link href={`/dashboard/results?eventId=${eventId}`}>← Kembali ke daftar</Link>
                        </Button>
                    </div>

                    {/* Member header */}
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold">{memberResult.name}</h1>
                            {memberResult.division && <Badge variant="secondary">{memberResult.division}</Badge>}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {report.event.name}
                            <span className="mx-2">·</span>
                            <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {report.event.period}
                            {report.event.proker ? ` · ${report.event.proker}` : ""}
                            <span className="mx-2">·</span>
                            {dateFmt.format(new Date(report.event.startDate))} – {dateFmt.format(new Date(report.event.endDate))}
                        </p>
                    </div>

                    {/* Summary stats */}
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="border-border/60 bg-card rounded-xl border px-5 py-4 shadow-xs">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Overall Rating</p>
                            <p className="mt-1 text-4xl font-bold tabular-nums">{memberResult.overallAvg.toFixed(2)}</p>
                            <p className="text-muted-foreground text-xs mt-1">dari skala 5</p>
                        </div>
                        <div className="border-border/60 bg-card rounded-xl border px-5 py-4 shadow-xs">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Jumlah Penilai</p>
                            <p className="mt-1 text-4xl font-bold tabular-nums">{memberResult.raterCount}</p>
                            <p className="text-muted-foreground text-xs mt-1">orang</p>
                        </div>
                        <div className="border-border/60 bg-card rounded-xl border px-5 py-4 shadow-xs">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Jumlah Indikator</p>
                            <p className="mt-1 text-4xl font-bold tabular-nums">{memberResult.indicators.length}</p>
                            <p className="text-muted-foreground text-xs mt-1">indikator dinilai</p>
                        </div>
                    </div>

                    {/* Category averages */}
                    {Object.keys(memberResult.categoryAvg).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Rata-rata per Kategori</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {Object.entries(memberResult.categoryAvg).map(([cat, val]) => (
                                        <div key={cat} className="border-border/60 bg-muted/30 rounded-lg border px-4 py-3">
                                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{cat}</p>
                                            <p className="text-2xl font-semibold tabular-nums mt-1">{(val as number).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Per indicator — hard skills */}
                    {hardIndicators.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Hard Skill</CardTitle>
                                <p className="text-muted-foreground text-sm">Rata-rata skor per indikator hard skill.</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {hardIndicators.map((ind) => (
                                        <div key={ind.id} className="border-border/60 rounded-lg border px-4 py-3">
                                            <p className="text-sm font-medium leading-snug">{ind.name}</p>
                                            <p className="text-2xl font-semibold tabular-nums mt-1">{ind.avg.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Per indicator — soft skills */}
                    {softIndicators.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Soft Skill</CardTitle>
                                <p className="text-muted-foreground text-sm">Rata-rata skor per indikator soft skill.</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {softIndicators.map((ind) => (
                                        <div key={ind.id} className="border-border/60 rounded-lg border px-4 py-3">
                                            <p className="text-sm font-medium leading-snug">{ind.name}</p>
                                            <p className="text-2xl font-semibold tabular-nums mt-1">{ind.avg.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Feedback */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Feedback (Anonim)</CardTitle>
                            <p className="text-muted-foreground text-sm">Komentar dari para penilai, identitas disembunyikan.</p>
                        </CardHeader>
                        <CardContent>
                            {memberResult.feedback.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Belum ada feedback.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {memberResult.feedback.map((fb, idx) => (
                                        <li key={idx} className="border-border/60 rounded-lg border px-4 py-3 text-sm">
                                            &ldquo;{fb}&rdquo;
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </SidebarShell>
    );
}
