"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService } from "@/services/admin.service";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface ServiceStatus {
  status: "up" | "down";
}

interface HealthResponse {
  status: "ok" | "error";
  info?: Record<string, ServiceStatus>;
  error?: Record<string, ServiceStatus>;
  details?: Record<string, ServiceStatus>;
}

function StatusCard({
  name,
  status,
}: {
  name: string;
  status: "up" | "down" | undefined;
}) {
  const isUp = status === "up";
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      {isUp ? (
        <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
      ) : (
        <XCircle className="w-6 h-6 text-red-400 shrink-0" />
      )}
      <div>
        <p className="font-semibold capitalize text-white">{name}</p>
        <p
          className={`text-sm font-medium ${isUp ? "text-green-400" : "text-red-400"}`}
        >
          {isUp ? "Healthy" : "Unreachable"}
        </p>
      </div>
    </div>
  );
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getHealth();
      setHealth(data as HealthResponse);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const services = health?.details ?? health?.info ?? {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System Health</h1>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-gray-500">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {Object.keys(services).length === 0 && loading
          ? [0, 1].map((i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-xl h-20 animate-pulse"
              />
            ))
          : Object.entries(services).map(([name, svc]) => (
              <StatusCard key={name} name={name} status={svc?.status} />
            ))}
      </div>

      {/* Raw JSON */}
      {health && (
        <details className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200">
            Raw response
          </summary>
          <pre className="mt-3 text-xs text-gray-300 overflow-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
