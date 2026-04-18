import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { EvalNav } from "@/components/eval-nav";
import { EvalTopbar } from "@/components/eval-topbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EvaluationsLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/");

    const currentUser = session.userId
        ? await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { name: true, nim: true, role: true },
            with: { division: { columns: { name: true } } },
        })
        : null;

    const roleLabel: Record<string, string> = {
        ADMIN: "Admin",
        BPI: "BPI",
        KADIV: "Kepala Divisi",
        KASUBDIV: "Kepala Sub Divisi",
        ANGGOTA: "Anggota",
        SUPERADMIN: "Super Admin",
    };

    const userInfo = {
        name: currentUser?.name ?? "",
        nim: currentUser?.nim ?? "",
        role: roleLabel[currentUser?.role ?? ""] ?? currentUser?.role ?? "",
        division: currentUser?.division?.name ?? "",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sticky top navbar */}
            <EvalTopbar user={userInfo} />

            {/* Tab navigation */}
            <div className="sticky top-14 z-30 border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto max-w-5xl px-4">
                    <EvalNav />
                </div>
            </div>

            {/* Page content */}
            <div className="mx-auto max-w-5xl px-4 py-6">
                {children}
            </div>
        </div>
    );
}
