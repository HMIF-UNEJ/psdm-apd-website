import { redirect } from "next/navigation";
import { KeyRound, Shield, User } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Badge } from "@/components/ui/badge";

export default async function EvalSettingsPage() {
    const session = await getSession();
    if (!session) redirect("/");

    const user = session.userId
        ? await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { name: true, email: true, nim: true, role: true, passwordUpdatedAt: true },
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

    const u = user as any;

    return (
        <div className="space-y-5">
            {/* Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                        <User className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Informasi Akun</h2>
                        <p className="text-xs text-slate-500">Detail profil Anda saat ini</p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Nama</p>
                            <p className="text-sm font-medium text-slate-900">{u?.name ?? "-"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">NIM</p>
                            <p className="text-sm font-medium text-slate-900 font-mono">{u?.nim ?? "-"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
                            <p className="text-sm font-medium text-slate-900">
                                {u?.email ?? <span className="text-slate-400 italic">Belum diset</span>}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Divisi</p>
                            <p className="text-sm font-medium text-slate-900">{u?.division?.name ?? "-"}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs text-slate-600">
                            {roleLabel[u?.role] ?? u?.role ?? "-"}
                        </Badge>
                        {u?.passwordUpdatedAt ? (
                            <Badge variant="outline" className="text-xs border-emerald-400/40 text-emerald-700">
                                <Shield className="mr-1 h-3 w-3" />
                                Password sudah diperbarui
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs border-orange-400/40 text-orange-700">
                                <Shield className="mr-1 h-3 w-3" />
                                Password belum pernah diubah
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Password Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                        <KeyRound className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Ganti Password</h2>
                        <p className="text-xs text-slate-500">
                            Disarankan menggunakan kombinasi huruf, angka, dan simbol
                        </p>
                    </div>
                </div>
                <div className="p-6 max-w-md">
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    );
}
