"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/evaluations", label: "Ringkasan" },
    { href: "/evaluations/open", label: "Event Dibuka" },
    { href: "/evaluations/progress", label: "Progres" },
    { href: "/evaluations/completed", label: "Sudah Disubmit" },
];

export function EvalNav() {
    const pathname = usePathname();

    return (
        <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                            }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
