import React from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { Prisma } from "@prisma/client";

import { Info, Pencil, Trash2 } from "lucide-react";

import { ConfirmForm } from "@/components/confirm-form";
import { SingleSendButton, BulkSendButton } from "@/components/send-credential-buttons";
import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { SuccessAlert } from "@/components/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createUserSchema, updateUserSchema } from "@/lib/validation";

const roles = [
  { value: "ADMIN", label: "Admin" },
  { value: "BPI", label: "BPI" },
  { value: "KADIV", label: "Kepala Divisi" },
  { value: "ANGGOTA", label: "Anggota" },
];

type UsersPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createUser(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      nim: String(formData.get("nim") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      password: require("crypto").randomUUID().slice(0, 16),
      isActive: formData.get("isActive") === "on",
    };

    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const { password, ...data } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await prisma.user.create({ data: { ...data, passwordHash } });
      revalidatePath("/dashboard/users");
      redirect(`/dashboard/users?success=${encodeURIComponent("User ditambahkan")}&alert=success`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        redirect(`/dashboard/users?success=${encodeURIComponent("NIM sudah digunakan")}&alert=error`);
      }
      throw error;
    }
  }

  async function updateUser(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      nim: String(formData.get("nim") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      password: "",
      isActive: formData.get("isActive") === "on",
    };

    const parsed = updateUserSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const { password, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    try {
      await prisma.user.update({ where: { id }, data: updateData });
      revalidatePath("/dashboard/users");
      redirect(`/dashboard/users?success=${encodeURIComponent("User diperbarui")}&alert=success`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        redirect(`/dashboard/users?success=${encodeURIComponent("NIM sudah digunakan")}&alert=error`);
      }
      throw error;
    }
  }

  async function deleteUser(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/users");
    redirect(`/dashboard/users?success=${encodeURIComponent("User dihapus")}&alert=success`);
  }

  const [activePeriod, periods, divisions, users, currentUser] = await Promise.all([
    prisma.period.findFirst({ where: { isActive: true }, orderBy: { startYear: "desc" } }),
    prisma.period.findMany({ orderBy: { startYear: "desc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { period: true, division: true } }),
    session.userId ? prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const alert = params?.alert;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  const stats = [
    { label: "Total User", value: totalUsers },
    { label: "Aktif", value: activeUsers },
    { label: "Nonaktif", value: inactiveUsers },
    { label: "Divisi", value: divisions.length },
    { label: "Periode", value: periods.length },
  ];

  const divisionStats = divisions.map((d) => ({ id: d.id, name: d.name, count: d._count.users }));

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="User" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success} type={alert === "error" ? "error" : "success"} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">User</h1>
              <p className="text-muted-foreground text-sm">Kelola akun, role, dan divisi.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <BulkSendButton nims={users.filter(u => u.isActive && !!u.email).map(u => u.nim)} />
              <Sheet>
                <SheetTrigger asChild>
                  <Button>Tambah User</Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Tambah User</SheetTitle>
                    <SheetDescription>Masukkan data user baru.</SheetDescription>
                  </SheetHeader>
                  <form action={createUser} className="grid gap-3 p-4 pt-0">
                    <label className="text-sm font-medium text-foreground">
                      Nama
                      <Input name="name" placeholder="Nama lengkap" required className="mt-1" />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      NIM
                      <Input name="nim" placeholder="0001" required className="mt-1" />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Email
                      <Input name="email" type="email" placeholder="opsional" className="mt-1" />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Role
                      <select name="role" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Periode
                      <select name="periodId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        {periods.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Divisi
                      <select name="divisionId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        <option value="">(Tanpa divisi)</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                      <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                      Aktif
                    </label>
                    <Button type="submit" className="mt-2">
                      Simpan
                    </Button>
                  </form>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl font-semibold">Ringkasan User</CardTitle>
                <p className="text-muted-foreground text-sm">Distribusi akun pada periode aktif dan seluruh data</p>
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
              <CardTitle className="text-lg">Ringkasan per Divisi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {divisionStats.length === 0 && <p className="text-muted-foreground text-sm">Belum ada divisi.</p>}
              {divisionStats.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="font-medium">{d.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {d.count} user
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Daftar User</CardTitle>
                <p className="text-muted-foreground text-sm">Detail akun dan aksi cepat.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Nama</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[148px] pr-4 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="pl-4 font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.nim}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.division?.name ?? "-"}</TableCell>
                        <TableCell>{user.period?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "outline"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
                        </TableCell>
                        <TableCell className="w-[148px] pr-4">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <SingleSendButton nim={user.nim} disabled={!user.email || !user.isActive} />
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Detail user">
                                  <Info className="h-4 w-4" />
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="sm:max-w-md">
                                <SheetHeader>
                                  <SheetTitle>Detail User</SheetTitle>
                                  <SheetDescription>Informasi akun dan kredensial.</SheetDescription>
                                </SheetHeader>
                                <div className="space-y-3 p-4 pt-0 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Nama</p>
                                    <p className="font-medium">{user.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">NIM (username)</p>
                                    <p className="font-medium">{user.nim}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Email</p>
                                    <p className="font-medium">{user.email || "-"}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-muted-foreground">Role</p>
                                      <p className="font-medium">{user.role}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Status</p>
                                      <Badge variant={user.isActive ? "default" : "outline"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-muted-foreground">Periode</p>
                                      <p className="font-medium">{user.period?.name ?? "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Divisi</p>
                                      <p className="font-medium">{user.division?.name ?? "-"}</p>
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                                    <p className="font-semibold text-foreground">Kredensial</p>
                                    <p>Username: {user.nim}</p>
                                    <p>Password: tidak dapat ditampilkan (tersimpan aman)</p>
                                  </div>
                                </div>
                              </SheetContent>
                            </Sheet>

                            <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Edit user">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="sm:max-w-md">
                                <SheetHeader>
                                  <SheetTitle>Edit User</SheetTitle>
                                  <SheetDescription>Perbarui data user. Kosongkan password jika tidak diubah.</SheetDescription>
                                </SheetHeader>
                                <form action={updateUser} className="grid gap-3 p-4 pt-0">
                                  <input type="hidden" name="id" value={user.id} />
                                  <label className="text-sm font-medium text-foreground">
                                    Nama
                                    <Input name="name" defaultValue={user.name} required className="mt-1" />
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    NIM
                                    <Input name="nim" defaultValue={user.nim} required className="mt-1" />
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    Email
                                    <Input name="email" type="email" defaultValue={user.email ?? ""} className="mt-1" />
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    Role
                                    <select name="role" defaultValue={user.role} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                                      {roles.map((role) => (
                                        <option key={role.value} value={role.value}>
                                          {role.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    Periode
                                    <select name="periodId" defaultValue={user.periodId} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                                      {periods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    Divisi
                                    <select name="divisionId" defaultValue={user.divisionId ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                                      <option value="">(Tanpa divisi)</option>
                                      {divisions.map((d) => (
                                        <option key={d.id} value={d.id}>
                                          {d.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                                    <input name="isActive" type="checkbox" defaultChecked={user.isActive} className="h-4 w-4 rounded border-border" />
                                    Aktif
                                  </label>
                                  <Button type="submit" className="mt-2">
                                    Simpan
                                  </Button>
                                </form>
                              </SheetContent>
                            </Sheet>

                            <ConfirmForm action={deleteUser}>
                              <input type="hidden" name="id" value={user.id} />
                              <Button type="submit" variant="outline" size="icon" className="text-destructive hover:text-destructive" aria-label="Hapus user">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ConfirmForm>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                          Belum ada user.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarShell>
  );
}
