"use client";

import { useEffect, useState } from "react";
import { adminService, AdminStats } from "@/services/admin.service";
import { Users, Gamepad2, CalendarDays } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-5">
      <div className="p-3 bg-amber-400/10 rounded-lg">
        <Icon className="w-6 h-6 text-amber-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService
      .getStats()
      .then(setStats)
      .catch(() => setError("Failed to load stats"));
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
          <StatCard
            label="Active Games"
            value={stats.activeGames}
            icon={Gamepad2}
          />
          <StatCard
            label="Games Today"
            value={stats.gamesPlayedToday}
            icon={CalendarDays}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl h-24 animate-pulse"
            />
          ))}
        </div>
      )}
    </div>
  );
}
