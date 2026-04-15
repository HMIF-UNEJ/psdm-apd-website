import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSuperAdmin } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyRank, getAvailableMonths } from "@/services/monthly-rank";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MonthlyRankPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const session = await getSession();
    if (!session) redirect("/");
    if (!isSuperAdmin(session.role)) redirect("/dashboard");

    const [activePeriod, currentUser] = await Promise.all([
        prisma.period.findFirst({ where: { isActive: true }, orderBy: { startYear: "desc" } }),
        session.userId
            ? prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } })
            : Promise.resolve(null),
    ]);

    const periodId = activePeriod?.id ?? session.periodId;
    const availableMonths = await getAvailableMonths(periodId);

    const now = new Date();
    const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1;
    const selectedYear = params.year ? parseInt(params.year) : now.getFullYear();

    const report = await getMonthlyRank(selectedMonth, selectedYear, periodId, session);

    // Pagination
    const PAGE_SIZE = 10;
    const currentPage = params.page ? Math.max(1, parseInt(params.page)) : 1;
    const totalItems = report.rankings.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const paginatedRankings = report.rankings.slice(startIndex, startIndex + PAGE_SIZE);

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    const allMonths = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year: selectedYear,
        label: `${monthNames[i]} ${selectedYear}`,
    }));

    // Merge available + all months list
    const displayMonths = allMonths;

    const sidebarStyle = {
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
    } as React.CSSProperties;


    function getRankBadge(rank: number) {
        if (rank === 1) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
        if (rank === 2) return "bg-slate-300/20 text-slate-500 border-slate-400/30";
        if (rank === 3) return "bg-orange-400/15 text-orange-600 border-orange-400/30";
        return "";
    }

    function getScoreColor(score: number) {
        if (score >= 4) return "text-emerald-600";
        if (score >= 3) return "text-blue-600";
        if (score >= 2) return "text-amber-600";
        return "text-red-600";
    }

    return (
        <SidebarShell
            user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined}
            sidebarStyle={sidebarStyle}
        >
            <SiteHeader title="Monthly Rank" activePeriod={activePeriod?.name ?? "-"} />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">

                    {/* Page Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">Ranking Bulanan</h1>
                            <p className="text-muted-foreground text-sm">
                                Peringkat anggota berdasarkan rata-rata penilaian seluruh proker per bulan.
                            </p>
                        </div>
                        <Badge variant="outline" className="w-fit">
                            Superadmin Only
                        </Badge>
                    </div>

                    {/* Month Selector */}
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Pilih bulan</p>
                                <p className="text-muted-foreground text-xs">
                                    Ganti bulan untuk melihat ranking berdasarkan periode waktu.
                                </p>
                            </div>
                            <form className="flex flex-col gap-2 sm:flex-row sm:items-center" method="get">
                                <select
                                    name="month"
                                    defaultValue={selectedMonth}
                                    className="rounded-lg border border-border px-3 py-2 text-sm"
                                >
                                    {displayMonths.map((m) => (
                                        <option key={m.month} value={m.month}>
                                            {monthNames[m.month - 1]}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    name="year"
                                    defaultValue={selectedYear}
                                    min={2020}
                                    max={2030}
                                    className="w-24 rounded-lg border border-border px-3 py-2 text-sm"
                                />
                                <Button type="submit" variant="default" size="sm">
                                    Tampilkan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Stats Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Dinilai</p>
                                <p className="text-2xl font-semibold tabular-nums">{report.totalEvaluated}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-emerald-500">
                            <CardContent className="p-4">
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Rata-rata Skor</p>
                                <p className="text-2xl font-semibold tabular-nums">{report.averageScore.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-amber-500">
                            <CardContent className="p-4">
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Skor Tertinggi</p>
                                <p className="text-2xl font-semibold tabular-nums">{report.highestScore.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500">
                            <CardContent className="p-4">
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Skor Terendah</p>
                                <p className="text-2xl font-semibold tabular-nums">{report.lowestScore.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ranking Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle className="text-lg">
                                        Ranking Bulan {report.monthLabel}
                                    </CardTitle>
                                    <p className="text-muted-foreground text-sm">
                                        Periode: {report.periodName} · {totalItems} anggota · Halaman {safePage} dari {totalPages}
                                    </p>
                                </div>
                                {availableMonths.length > 0 && (
                                    <Badge variant="secondary" className="w-fit">
                                        {availableMonths.length} bulan memiliki data
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {report.rankings.length === 0 ? (
                                <div className="px-4 py-10 text-center">
                                    <p className="text-muted-foreground text-sm">
                                        Belum ada data penilaian untuk bulan {report.monthLabel}.
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-1">
                                        Pastikan event evaluasi sudah berjalan dan ada submission pada bulan ini.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="pl-4 w-16 text-center">#</TableHead>
                                                    <TableHead>Nama</TableHead>
                                                    <TableHead>NIM</TableHead>
                                                    <TableHead>Divisi</TableHead>
                                                    <TableHead className="text-center">Jumlah Proker</TableHead>
                                                    <TableHead>Proker</TableHead>
                                                    <TableHead className="text-center">Evaluasi</TableHead>
                                                    <TableHead className="pr-4 text-right">Rata-rata Skor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedRankings.map((entry) => (
                                                    <TableRow
                                                        key={entry.userId}
                                                        className={entry.rank <= 3 ? "bg-muted/30" : entry.evaluationCount === 0 ? "opacity-60" : ""}
                                                    >
                                                        <TableCell className="pl-4 text-center">
                                                            {entry.rank <= 3 ? (
                                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border ${getRankBadge(entry.rank)}`}>
                                                                    {entry.rank}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground font-medium">{entry.rank}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{entry.name}</TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{entry.nim}</TableCell>
                                                        <TableCell>
                                                            {entry.division ? (
                                                                <Badge variant="secondary">{entry.division}</Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-sm font-medium">{entry.prokerCount}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1 max-w-48">
                                                                {entry.prokerNames.length > 0 ? (
                                                                    entry.prokerNames.slice(0, 3).map((name, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                                            {name}
                                                                        </Badge>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs">-</span>
                                                                )}
                                                                {entry.prokerNames.length > 3 && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        +{entry.prokerNames.length - 3}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-sm">{entry.evaluationCount}</span>
                                                        </TableCell>
                                                        <TableCell className="pr-4 text-right">
                                                            {entry.evaluationCount > 0 ? (
                                                                <span className={`text-lg font-bold tabular-nums ${getScoreColor(entry.overallAvg)}`}>
                                                                    {entry.overallAvg.toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground italic">Belum dinilai</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between border-t px-4 py-3">
                                            <p className="text-muted-foreground text-sm">
                                                Menampilkan {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalItems)} dari {totalItems} anggota
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {safePage > 1 ? (
                                                    <Link
                                                        href={`/dashboard/monthly-rank?month=${selectedMonth}&year=${selectedYear}&page=${safePage - 1}`}
                                                    >
                                                        <Button variant="outline" size="sm">
                                                            ← Sebelumnya
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button variant="outline" size="sm" disabled>
                                                        ← Sebelumnya
                                                    </Button>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                                        <Link
                                                            key={pageNum}
                                                            href={`/dashboard/monthly-rank?month=${selectedMonth}&year=${selectedYear}&page=${pageNum}`}
                                                        >
                                                            <Button
                                                                variant={pageNum === safePage ? "default" : "ghost"}
                                                                size="sm"
                                                                className="w-8 h-8 p-0"
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        </Link>
                                                    ))}
                                                </div>
                                                {safePage < totalPages ? (
                                                    <Link
                                                        href={`/dashboard/monthly-rank?month=${selectedMonth}&year=${selectedYear}&page=${safePage + 1}`}
                                                    >
                                                        <Button variant="outline" size="sm">
                                                            Selanjutnya →
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button variant="outline" size="sm" disabled>
                                                        Selanjutnya →
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top 3 Highlight */}
                    {report.rankings.length >= 3 && (
                        <Card className="border-primary/10 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/10">
                            <CardHeader>
                                <CardTitle className="text-lg">3 Manusia Keren Bulan Ini</CardTitle>
                                <p className="text-muted-foreground text-sm">
                                    Anggota dengan performa terbaik pada {report.monthLabel}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {report.rankings.slice(0, 3).map((entry, idx) => {
                                        const medals = ["🥇", "🥈", "🥉"];
                                        const borderColors = [
                                            "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20",
                                            "border-slate-400/50 bg-slate-50/30 dark:bg-slate-950/20",
                                            "border-orange-400/50 bg-orange-50/30 dark:bg-orange-950/20",
                                        ];
                                        return (
                                            <div key={entry.userId} className={`rounded-xl border-2 p-4 text-center ${borderColors[idx]}`}>
                                                <div className="text-3xl mb-2">{medals[idx]}</div>
                                                <p className="text-base font-bold">{entry.name}</p>
                                                <p className="text-muted-foreground text-sm">{entry.division ?? "-"}</p>
                                                <div className="mt-3">
                                                    <p className={`text-2xl font-bold tabular-nums ${getScoreColor(entry.overallAvg)}`}>
                                                        {entry.overallAvg.toFixed(2)}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs mt-1">
                                                        {entry.prokerCount} proker · {entry.evaluationCount} evaluasi
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </SidebarShell>
    );
}
