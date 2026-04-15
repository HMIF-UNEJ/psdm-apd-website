"use client";

import { useState } from "react";
import { Mail, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SingleSendButton({ nim, disabled }: { nim: string, disabled?: boolean }) {
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (disabled) return;
        setLoading(true);
        try {
            const res = await fetch("/api/admin/send-credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nims: [nim] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Terjadi kesalahan!");

            const result = data.data?.[0];
            if (result?.status === "Success") {
                toast.success(`Akses terkirim ke user ${nim}`);
            } else {
                toast.error(`Gagal: ${result?.reason}`);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={handleSend}
            disabled={loading || disabled}
            aria-label="Kirim Email Akses"
            title="Kirim Email Akses"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />}
        </Button>
    );
}

export function BulkSendButton({ nims }: { nims: string[] }) {
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!confirm(`Semua ${nims.length} user (aktif dan punya email) akan menerima akses. Lanjutkan?`)) return;
        setLoading(true);
        try {
            const res = await fetch("/api/admin/send-credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nims })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal bulk kirim");

            const successCount = data.data?.filter((r: any) => r.status === "Success").length || 0;
            toast.success(`Selesai! Berhasil mengirim ${successCount} dari ${nims.length} email.`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleSend}
            disabled={loading || nims.length === 0}
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/5"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-primary" />}
            Kirim Akses Massal
        </Button>
    );
}
