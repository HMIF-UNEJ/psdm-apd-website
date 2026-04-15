import { prisma } from "@/lib/prisma";

type Session = { userId: string; role: string; periodId: string };

export type MonthlyRankEntry = {
    userId: string;
    name: string;
    nim: string;
    division: string | null;
    prokerCount: number;
    prokerNames: string[];
    evaluationCount: number;
    overallAvg: number;
    rank: number;
    trend: "up" | "down" | "same" | "new";
};

export type MonthlyRankResult = {
    month: number;
    year: number;
    monthLabel: string;
    periodName: string;
    rankings: MonthlyRankEntry[];
    totalEvaluated: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
};

/**
 * Get monthly rankings for all users based on their overall rating
 * across all proker they participate in during a given month.
 */
export async function getMonthlyRank(
    month: number,
    year: number,
    periodId: string,
    _session: Session
): Promise<MonthlyRankResult> {
    // Get the period name
    const period = await prisma.period.findUnique({
        where: { id: periodId },
        select: { name: true },
    });

    if (!period) throw new Error("Periode tidak ditemukan");

    // Fetch ALL non-admin users in this period
    const allUsers = await prisma.user.findMany({
        where: {
            periodId,
            role: { not: "ADMIN" },
        },
        include: {
            division: true,
        },
    });

    // Date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all evaluations in PROKER events within the given month and period
    const evaluations = await prisma.evaluation.findMany({
        where: {
            event: {
                periodId,
                type: "PROKER",
            },
            createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
            scores: { some: {} },
        },
        include: {
            evaluatee: {
                include: { division: true },
            },
            event: {
                include: { proker: true },
            },
            scores: true,
        },
    });

    // Also include PERIODIC evaluations within the month
    const periodicEvaluations = await prisma.evaluation.findMany({
        where: {
            event: {
                periodId,
                type: "PERIODIC",
            },
            createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
            scores: { some: {} },
        },
        include: {
            evaluatee: {
                include: { division: true },
            },
            event: {
                include: { proker: true },
            },
            scores: true,
        },
    });

    const allEvals = [...evaluations, ...periodicEvaluations];

    // Group by evaluatee
    const userMap = new Map<
        string,
        {
            userId: string;
            name: string;
            nim: string;
            division: string | null;
            prokerSet: Set<string>;
            prokerNames: Set<string>;
            totalScore: number;
            scoreCount: number;
            evalCount: number;
        }
    >();

    // Pre-populate userMap with ALL non-admin users
    for (const user of allUsers) {
        userMap.set(user.id, {
            userId: user.id,
            name: user.name,
            nim: user.nim ?? "",
            division: user.division?.name ?? null,
            prokerSet: new Set(),
            prokerNames: new Set(),
            totalScore: 0,
            scoreCount: 0,
            evalCount: 0,
        });
    }

    for (const ev of allEvals) {
        const key = ev.evaluateeId;
        if (!userMap.has(key)) {
            userMap.set(key, {
                userId: ev.evaluateeId,
                name: ev.evaluatee.name,
                nim: (ev.evaluatee as any).nim ?? "",
                division: ev.evaluatee.division?.name ?? null,
                prokerSet: new Set(),
                prokerNames: new Set(),
                totalScore: 0,
                scoreCount: 0,
                evalCount: 0,
            });
        }

        const bucket = userMap.get(key)!;
        bucket.evalCount += 1;

        if (ev.event.proker) {
            bucket.prokerSet.add(ev.event.prokerId!);
            bucket.prokerNames.add(ev.event.proker.name);
        }

        for (const score of ev.scores) {
            bucket.totalScore += score.score;
            bucket.scoreCount += 1;
        }
    }

    // Calculate averages and sort (users with evaluations first sorted by avg, then users without)
    const entries = Array.from(userMap.values())
        .map((u) => ({
            userId: u.userId,
            name: u.name,
            nim: u.nim,
            division: u.division,
            prokerCount: u.prokerSet.size,
            prokerNames: Array.from(u.prokerNames),
            evaluationCount: u.evalCount,
            overallAvg: u.scoreCount > 0 ? u.totalScore / u.scoreCount : 0,
            rank: 0,
            trend: "new" as "up" | "down" | "same" | "new",
        }))
        .sort((a, b) => {
            // Users with evaluations come first, sorted by avg descending
            if (a.evaluationCount > 0 && b.evaluationCount === 0) return -1;
            if (a.evaluationCount === 0 && b.evaluationCount > 0) return 1;
            if (a.evaluationCount === 0 && b.evaluationCount === 0) return a.name.localeCompare(b.name);
            return b.overallAvg - a.overallAvg;
        });

    // Assign ranks
    entries.forEach((entry, idx) => {
        entry.rank = idx + 1;
    });

    // Calculate trend by comparing with previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartOfMonth = new Date(prevYear, prevMonth - 1, 1);
    const prevEndOfMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    const prevEvaluations = await prisma.evaluation.findMany({
        where: {
            event: { periodId },
            createdAt: {
                gte: prevStartOfMonth,
                lte: prevEndOfMonth,
            },
            scores: { some: {} },
        },
        include: {
            scores: true,
        },
    });

    // Build previous month rankings
    const prevUserMap = new Map<string, { totalScore: number; scoreCount: number }>();
    for (const ev of prevEvaluations) {
        const key = ev.evaluateeId;
        if (!prevUserMap.has(key)) {
            prevUserMap.set(key, { totalScore: 0, scoreCount: 0 });
        }
        const bucket = prevUserMap.get(key)!;
        for (const score of ev.scores) {
            bucket.totalScore += score.score;
            bucket.scoreCount += 1;
        }
    }

    const prevEntries = Array.from(prevUserMap.entries())
        .map(([userId, data]) => ({
            userId,
            avg: data.scoreCount > 0 ? data.totalScore / data.scoreCount : 0,
        }))
        .sort((a, b) => b.avg - a.avg);

    const prevRankMap = new Map<string, number>();
    prevEntries.forEach((entry, idx) => {
        prevRankMap.set(entry.userId, idx + 1);
    });

    // Assign trends
    for (const entry of entries) {
        const prevRank = prevRankMap.get(entry.userId);
        if (prevRank === undefined) {
            entry.trend = "new";
        } else if (entry.rank < prevRank) {
            entry.trend = "up";
        } else if (entry.rank > prevRank) {
            entry.trend = "down";
        } else {
            entry.trend = "same";
        }
    }

    // Aggregate stats (only from users who have evaluations)
    const evaluatedEntries = entries.filter((e) => e.evaluationCount > 0);
    const evaluatedScores = evaluatedEntries.map((e) => e.overallAvg);
    const totalEvaluated = evaluatedEntries.length;
    const averageScore = totalEvaluated > 0 ? evaluatedScores.reduce((a, b) => a + b, 0) / totalEvaluated : 0;
    const highestScore = totalEvaluated > 0 ? Math.max(...evaluatedScores) : 0;
    const lowestScore = totalEvaluated > 0 ? Math.min(...evaluatedScores) : 0;

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    return {
        month,
        year,
        monthLabel: `${monthNames[month - 1]} ${year}`,
        periodName: period.name,
        rankings: entries,
        totalEvaluated,
        averageScore,
        highestScore,
        lowestScore,
    };
}

/**
 * Get available months that have evaluation data for a given period.
 */
export async function getAvailableMonths(periodId: string) {
    const evaluations = await prisma.evaluation.findMany({
        where: {
            event: { periodId },
            scores: { some: {} },
        },
        select: {
            createdAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const monthSet = new Set<string>();
    const months: { month: number; year: number; label: string }[] = [];

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    for (const ev of evaluations) {
        const date = new Date(ev.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthSet.has(key)) {
            monthSet.add(key);
            months.push({
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
            });
        }
    }

    return months;
}
