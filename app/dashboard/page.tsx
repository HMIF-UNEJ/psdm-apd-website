import type { CSSProperties } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type EventWithProgress = Awaited<ReturnType<typeof fetchEvents>>[number];

async function fetchEvents(periodId: string | null) {
  if (!periodId) return [];

  const events = await prisma.evaluationEvent.findMany({
    where: { periodId },
    orderBy: { startDate: "desc" },
    include: {
      period: true,
      proker: true,
      indicators: true,
      evaluations: {
        include: {
          _count: { select: { scores: true } },
        },
      },
      _count: { select: { evaluations: true } },
    },
  });

  return events;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function computeProgress(event: EventWithProgress) {
  const totalIndicators = event.indicators.length || 0;
  const totalAssignments = event._count.evaluations || 0;

  if (totalIndicators === 0 || totalAssignments === 0) {
    return { percent: 0, completed: 0, totalAssignments };
  }

  const completedEvaluations = event.evaluations.filter((ev) => ev._count.scores >= totalIndicators).length;

  const percent = Math.round((completedEvaluations / Math.max(totalAssignments, 1)) * 100);

  return {
    percent: Math.max(0, Math.min(100, percent)),
    completed: completedEvaluations,
    totalAssignments,
  }; 
}

export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const activePeriod = await prisma.period.findFirst({
    where: { isActive: true },
    orderBy: { startYear: "desc" },
  });

  const periodId = activePeriod?.id ?? session.periodId ?? null;

  const [userCount, divisionCount, prokerCount, events, currentUser] = await Promise.all([
    periodId ? prisma.user.count({ where: { periodId } }) : Promise.resolve(0),
    prisma.division.count(),
    periodId ? prisma.proker.count({ where: { periodId } }) : Promise.resolve(0),
    fetchEvents(periodId),
    session.userId ? prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const eventCount = events.length;
  const now = new Date();
  const runningEvents = events.filter((event) => event.isOpen && new Date(event.startDate) <= now && new Date(event.endDate) >= now);
  const runningCount = runningEvents.length;
  const tableEvents = events.slice(0, 8);

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as CSSProperties;

  const stats = [
    { label: "User", value: userCount },
    { label: "Divisi", value: divisionCount },
    { label: "Proker", value: prokerCount },
    { label: "Event", value: eventCount },
    { label: "Event Berjalan", value: runningCount },
  ];

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} />
      <SidebarInset>
        <SiteHeader activePeriod={activePeriod?.name ?? "-"} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="flex flex-col gap-4">
              <Card className="border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl font-semibold">Ringkasan</CardTitle>
                    <p className="text-muted-foreground text-sm">Gambaran singkat sistem pada periode aktif</p>
                  </div>
                  {activePeriod ? (
                    <Badge variant="outline">Periode aktif: {activePeriod.name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/40">
                      Periode belum dipilih
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 @4xl/main:grid-cols-5">
                    {stats.map((stat) => (
                      <div key={stat.label} className="border-border/60 bg-card/60 rounded-lg border px-3 py-3 shadow-xs">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                        <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Event Berjalan</CardTitle>
                </CardHeader>
                <CardContent>
                  {runningEvents.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Belum ada event yang sedang berjalan.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {runningEvents.map((event) => {
                        const { percent, completed, totalAssignments } = computeProgress(event);
                        return (
                          <div key={event.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                            <div className="flex items-center justify-between gap-2 text-sm font-medium">
                              <span className="line-clamp-1">{event.name}</span>
                              <span className="text-muted-foreground tabular-nums">{percent}%</span>
                            </div>
                            <Progress value={percent} />
                            <p className="text-muted-foreground text-xs">
                              {completed}/{totalAssignments} penilaian selesai · {event.indicators.length} indikator
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Penilaian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead className="min-w-30">Periode</TableHead>
                        <TableHead className="min-w-25">Tipe</TableHead>
                        <TableHead className="min-w-30">Jadwal</TableHead>
                        <TableHead className="min-w-30">Status</TableHead>
                        <TableHead className="text-right min-w-30">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableEvents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                            Belum ada event untuk periode ini.
                          </TableCell>
                        </TableRow>
                      )}
                      {tableEvents.map((event) => {
                        const { percent, completed, totalAssignments } = computeProgress(event);
                        const start = formatDate(new Date(event.startDate));
                        const end = formatDate(new Date(event.endDate));
                        const isOngoing = new Date(event.startDate) <= now && new Date(event.endDate) >= now;
                        return (
                          <TableRow key={event.id}>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium leading-tight">{event.name}</span>
                                {event.proker?.name && <span className="text-muted-foreground text-xs">Proker: {event.proker.name}</span>}
                              </div>
                            </TableCell>
                            <TableCell>{event.period?.name ?? "-"}</TableCell>
                            <TableCell className="uppercase text-xs font-semibold text-muted-foreground">{event.type}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {start} - {end}
                            </TableCell>
                            <TableCell>
                              <Badge variant={event.isOpen ? "default" : "outline"}>{event.isOpen ? (isOngoing ? "Berjalan" : "Dibuka") : "Ditutup"}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {percent}% ({completed}/{totalAssignments})
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
