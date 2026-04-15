import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { getMonthlyRank, getAvailableMonths } from "@/services/monthly-rank";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSuperAdmin(session.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = req.nextUrl;
        const action = searchParams.get("action");

        if (action === "months") {
            const months = await getAvailableMonths(session.periodId);
            return NextResponse.json({ months });
        }

        const monthStr = searchParams.get("month");
        const yearStr = searchParams.get("year");

        const now = new Date();
        const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;
        const year = yearStr ? parseInt(yearStr) : now.getFullYear();

        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
            return NextResponse.json({ error: "Invalid month/year" }, { status: 400 });
        }

        const result = await getMonthlyRank(month, year, session.periodId, session);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
