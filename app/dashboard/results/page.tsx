import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { SuccessAlert } from "@/components/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canViewResults } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, periods, evaluationEvents } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getEventReport } from "@/services/reports";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewResults(session.role)) redirect("/dashboard");

  const [events, activePeriod, currentUser] = await Promise.all([
    db.select({ id: evaluationEvents.id, name: evaluationEvents.name }).from(evaluationEvents).orderBy(desc(evaluationEvents.startDate)),
    db.query.periods.findFirst({ where: eq(periods.isActive, true), orderBy: [desc(periods.startYear)] }),
    session.userId ? db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const selectedId = params.eventId ?? events[0]?.id;
  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const alert = params?.alert ? (params.alert as "success" | "info" | "error") : success ? "success" : undefined;

  if (!selectedId) {
    return (
      <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined}>
        <SiteHeader title="Hasil & Laporan" activePeriod={activePeriod?.name ?? "-"} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <SuccessAlert message={success} type={alert} />
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Belum ada event</CardTitle>
                <p className="text-muted-foreground text-sm">Buat atau buka event penilaian sebelum melihat laporan.</p>
              </CardHeader>
            </Card>
          </div>
        </div>
      </SidebarShell>
    );
  }

  const report = await getEventReport(selectedId, session);

  const evaluateeWithScores = report.results.length;
  const overallAvg = evaluateeWithScores ? report.results.reduce((acc, r) => acc + r.overallAvg, 0) / evaluateeWithScores : 0;
  const totalAssignments = report.stats.totalAssignments;
  const submissionCount = report.stats.submittedCount;
  const pendingCount = Math.max(totalAssignments - submissionCount, 0);
  const raterCount = report.stats.evaluatorCount;
  const evaluateeCount = report.stats.evaluateeCount;
  const indicatorCount = report.event.indicators.length;
  const hardCount = report.event.indicators.filter((i) => i.category === "hardskill").length;
  const softCount = report.event.indicators.filter((i) => i.category === "softskill").length;

  const indicatorAverages = buildIndicatorAverages(report.results);
  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  const typeLabel = report.event.type === "PROKER" ? "Event Proker" : "Event Periodik";

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Hasil & Laporan" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success} type={alert} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Laporan Penilaian</h1>
              <p className="text-muted-foreground text-sm">Rekap rata-rata per anggota, kategori, dan indikator dengan ekspor cepat.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/results/${selectedId}/export?format=xlsx`}>Export Excel</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/api/results/${selectedId}/export?format=csv`}>Export CSV</Link>
              </Button>
            </div>
          </div>

          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Pilih event</p>
                <p className="text-muted-foreground text-xs">Ganti event untuk melihat progres submission dan ringkasan.</p>
              </div>
              <form className="flex flex-col gap-2 sm:flex-row sm:items-center" method="get">
                <select name="eventId" defaultValue={selectedId} className="rounded-lg border border-border px-3 py-2 text-sm">
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="default" size="sm">
                  Tampilkan
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="relative flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:pr-48">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{report.event.name}</CardTitle>
                  <Badge variant="secondary">{typeLabel}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {report.event.period}
                  {report.event.proker ? ` · ${report.event.proker}` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  Timeline: {dateFmt.format(new Date(report.event.startDate))} - {dateFmt.format(new Date(report.event.endDate))}
                </p>
              </div>
              <div className="sm:absolute sm:right-4 sm:top-4 flex flex-wrap gap-2">
                <Badge variant="outline">{raterCount} penilai</Badge>
                <Badge variant="outline">{evaluateeCount} dinilai</Badge>
                <Badge variant="outline">{indicatorCount} indikator</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total penilaian", value: totalAssignments },
                  { label: "Sudah submit", value: submissionCount },
                  { label: "Belum submit", value: pendingCount },
                  { label: "Indikator hard", value: hardCount },
                  { label: "Indikator soft", value: softCount },
                ]
                  .filter(Boolean)
                  .map((stat) => (
                    <div key={stat!.label} className="border-border/60 bg-card/70 rounded-lg border px-3 py-3 shadow-xs">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat!.label}</p>
                      <p className="text-2xl font-semibold tabular-nums">{typeof stat!.value === "number" ? (stat!.value as number).toLocaleString("id-ID") : stat!.value}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan indikator</CardTitle>
              <p className="text-muted-foreground text-sm">Rata-rata gabungan per indikator untuk event ini.</p>
            </CardHeader>
            <CardContent className="p-0">
              {indicatorAverages.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada skor indikator.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Indikator</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="pr-4 text-right">Rata-rata</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indicatorAverages.map((ind) => (
                        <TableRow key={ind.id}>
                          <TableCell className="pl-4 font-medium">{ind.name}</TableCell>
                          <TableCell className="text-muted-foreground">{ind.category}</TableCell>
                          <TableCell className="pr-4 text-right font-semibold">{ind.avg.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Per anggota</CardTitle>
              <p className="text-muted-foreground text-sm">Daftar anggota yang dinilai beserta overall rating. Klik untuk melihat detail.</p>
            </CardHeader>
            <CardContent className="p-0">
              {report.results.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada submission.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Nama</TableHead>
                        <TableHead>Divisi</TableHead>
                        <TableHead className="text-center">Penilai</TableHead>
                        <TableHead className="text-right">Overall</TableHead>
                        <TableHead className="pr-4 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.results.map((res) => (
                        <TableRow key={res.evaluateeId}>
                          <TableCell className="pl-4 font-medium">{res.name}</TableCell>
                          <TableCell className="text-muted-foreground">{res.division ?? "-"}</TableCell>
                          <TableCell className="text-center tabular-nums">{res.raterCount}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-base font-semibold tabular-nums">{res.overallAvg.toFixed(2)}</span>
                            <span className="text-muted-foreground text-xs"> /5</span>
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/results/${res.evaluateeId}?eventId=${selectedId}`}>Lihat detail →</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarShell>
  );
}

function buildIndicatorAverages(
  results: Array<{
    indicators: Array<{ id: string; name: string; category: string; avg: number }>;
  }>,
) {
  const sums = new Map<string, { name: string; category: string; total: number; count: number }>();
  for (const res of results) {
    for (const ind of res.indicators) {
      const current = sums.get(ind.id) ?? { name: ind.name, category: ind.category, total: 0, count: 0 };
      current.total += ind.avg;
      current.count += 1;
      sums.set(ind.id, current);
    }
  }

  return Array.from(sums.entries()).map(([id, value]) => ({ id, name: value.name, category: value.category, avg: value.count ? value.total / value.count : 0 }));
}
