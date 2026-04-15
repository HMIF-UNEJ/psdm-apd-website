import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import nodemailer from "nodemailer";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";

const SECRET = new TextEncoder().encode(process.env.SETUP_JWT_SECRET || process.env.AUTH_SECRET || "default_secret");

// Konfigurasi internal Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function POST(req: Request) {
    // Pengecekan sesi & hak akses jika diperlukan (opsional, karena ini rute admin)
    const session = await getSession();
    if (!session || !canManageRoles(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { nims } = body;

        if (!Array.isArray(nims)) {
            return NextResponse.json({ error: "Payload 'nims' harus berupa array" }, { status: 400 });
        }

        const results = [];

        // Lakukan looping untuk setiap NIM
        for (const nim of nims) {
            const user = await prisma.user.findUnique({ where: { nim } });

            if (!user) {
                results.push({ nim, status: "Failed", reason: "User tidak ditemukan berdasarkan NIM" });
                continue;
            }

            if (!user.email) {
                results.push({ nim, status: "Failed", reason: "User tidak memiliki email yang tersimpan" });
                continue;
            }

            // Buat JWT token untuk setup password, expires in 1 hour
            const token = await new SignJWT({ nim })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("1h")
                .sign(SECRET);

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const setupUrl = `${appUrl}/setup-password?token=${token}`;

            // Kirim email (TIDAK ADA perubahan pada Database di sini)
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Admin Sistem" <admin@hmif.com>',
                    to: user.email,
                    subject: "Setup Akses Akun Anda",
                    html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Halo, ${user.name}</h2>
              <p>Akun Anda telah didaftarkan/diperbarui di Sistem Penilaian Pengurus.</p>
              <p>Silakan klik tautan di bawah ini untuk melakukan setup atau mengganti password Anda secara mandiri:</p>
              <div style="margin: 30px 0;">
                <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a5632; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Setup Password
                </a>
              </div>
              <p style="color: #555;">Tautan ini dibuat menggunakan sistem yang aman dan <strong>hanya berlaku selama 1 jam</strong> dari sekarang.</p>
              <p style="font-size: 0.9em; color: #888;">Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.</p>
            </div>
          `,
                });
                results.push({ nim, status: "Success", reason: "Email rujukan berhasil dikirim" });
            } catch (err: any) {
                results.push({ nim, status: "Failed", reason: err.message || "Gagal saat SMTP mengirim email" });
            }
        }

        return NextResponse.json({ success: true, message: "Selesai memproses nims", data: results }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Terjadi kesalahan pada server" }, { status: 500 });
    }
}
