"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/auth-store";
import { LayoutDashboard, Users, Activity, Trophy, Puzzle } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.replace(`/${locale}`);
    }
  }, [isAuthenticated, user, router, locale]);

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null;
  }

  const nav = [
    { href: `/${locale}/admin`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/${locale}/admin/tournaments`, label: "Tournaments", icon: Trophy },
    { href: `/${locale}/admin/puzzles`, label: "Puzzles", icon: Puzzle },
    { href: `/${locale}/admin/users`, label: "Users", icon: Users },
    { href: `/${locale}/admin/health`, label: "Health", icon: Activity },
  ];

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-widest">
            Admin
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
