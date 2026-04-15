import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { EvalNav } from "@/components/eval-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EvaluationsLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/");

    const currentUser = session.userId
        ? await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })
        : null;

    const greetingName = currentUser?.name ?? "";

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-5">
                {/* Header + Nav combined into one card for cleaner layout */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-6 pb-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-sm text-slate-500">Halo{greetingName ? `, ${greetingName}` : ""}!</p>
                                <h1 className="text-2xl font-semibold text-slate-900">Dashboard Penilaian</h1>
                                <p className="text-sm text-slate-600 mt-1">
                                    Kelola tugas penilaian pengurus HMIF dari satu tempat.
                                </p>
                            </div>
                            <LogoutButton />
                        </div>
                    </div>
                    {/* Navigation — attached to header card bottom for visual grouping */}
                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-2">
                        <EvalNav />
                    </div>
                </div>

                {/* Page content */}
                {children}
            </div>
        </div>
    );
}
