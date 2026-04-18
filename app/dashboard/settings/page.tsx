import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { KeyRound, Shield, User } from "lucide-react";

import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, periods, divisions } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export default async function SettingsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const [activePeriod, currentUser] = await Promise.all([
        db.query.periods.findFirst({ where: eq(periods.isActive, true), orderBy: [desc(periods.startYear)] }),
        session.userId
            ? db.query.users.findFirst({
                where: eq(users.id, session.userId),
                columns: { name: true, email: true, nim: true, role: true, passwordUpdatedAt: true },
                with: { division: { columns: { name: true } } },
            })
            : Promise.resolve(null),
    ]);

    const user = currentUser as any;

    const sidebarStyle = {
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
    } as CSSProperties;

    const roleLabel: Record<string, string> = {
        ADMIN: "Admin",
        BPI: "BPI",
        KADIV: "Kepala Divisi",
        KASUBDIV: "Kepala Sub Divisi",
        ANGGOTA: "Anggota",
        SUPERADMIN: "Super Admin",
    };

    return (
        <SidebarShell
            user={user ? { name: user.name, email: user.email ?? undefined } : undefined}
            sidebarStyle={sidebarStyle}
        >
            <SiteHeader title="Pengaturan Akun" activePeriod={activePeriod?.name ?? "-"} />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">

                    <div>
                        <h1 className="text-xl font-semibold">Pengaturan Akun</h1>
                        <p className="text-muted-foreground text-sm">Kelola informasi dan keamanan akun Anda.</p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">

                        {/* Profil Info */}
                        <Card className="border-primary/10">
                            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Informasi Akun</CardTitle>
                                    <CardDescription className="text-xs">Detail profil Anda saat ini</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nama</p>
                                        <p className="text-sm font-medium">{user?.name ?? "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NIM</p>
                                        <p className="text-sm font-medium font-mono">{user?.nim ?? "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                                        <p className="text-sm font-medium">{user?.email ?? <span className="text-muted-foreground italic">Belum diset</span>}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Divisi</p>
                                        <p className="text-sm font-medium">{user?.division?.name ?? "-"}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Badge variant="outline" className="text-xs">
                                        {roleLabel[user?.role] ?? user?.role ?? "-"}
                                    </Badge>
                                    {user?.passwordUpdatedAt ? (
                                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                                            <Shield className="mr-1 h-3 w-3" />
                                            Password sudah diperbarui
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-700 dark:text-orange-400">
                                            <Shield className="mr-1 h-3 w-3" />
                                            Password belum pernah diubah
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ganti Password */}
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <KeyRound className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Ganti Password</CardTitle>
                                    <CardDescription className="text-xs">
                                        Disarankan menggunakan kombinasi huruf, angka, dan simbol
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ChangePasswordForm />
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </SidebarShell>
    );
}
