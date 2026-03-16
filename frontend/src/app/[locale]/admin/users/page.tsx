"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminService, AdminUser } from "@/services/admin.service";
import { Shield, ShieldOff, Trash2, UserX, UserCheck } from "lucide-react";

const PAGE_LIMIT = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hideGuests, setHideGuests] = useState(true);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Guest cleanup state
  const [cleanupDays, setCleanupDays] = useState(7);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // Debounce search input
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
      });
      setUsers(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBan = async (userId: string, isBanned: boolean) => {
    if (
      !confirm(
        isBanned
          ? "Unban this user?"
          : "Ban this user? Their sessions will be invalidated."
      )
    )
      return;
    const updated = await adminService.updateBan(userId, !isBanned);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: updated.isBanned } : u))
    );
  };

  const handleRole = async (userId: string, currentRole: "USER" | "ADMIN") => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    if (
      !confirm(
        `Set role to ${newRole} for this user?`
      )
    )
      return;
    const updated = await adminService.updateRole(userId, newRole);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: updated.role as "USER" | "ADMIN" } : u
      )
    );
  };

  const handlePreview = async () => {
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const res = await adminService.previewGuestCleanup(cleanupDays);
      setPreviewCount(res.count);
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (previewCount === null) return;
    if (
      !confirm(
        `Permanently delete ${previewCount} guest account${previewCount !== 1 ? "s" : ""} older than ${cleanupDays} day${cleanupDays !== 1 ? "s" : ""} with no games? This cannot be undone.`
      )
    )
      return;
    setCleanupLoading(true);
    try {
      const res = await adminService.cleanupGuests(cleanupDays);
      setCleanupResult(`Deleted ${res.deleted} guest account${res.deleted !== 1 ? "s" : ""}.`);
      setPreviewCount(null);
      fetchUsers();
    } finally {
      setCleanupLoading(false);
    }
  };

  const visibleUsers = hideGuests
    ? users.filter((u) => !u.phoneNumber?.startsWith("GUEST_"))
    : users;
  const hiddenGuestCount = hideGuests
    ? users.filter((u) => u.phoneNumber?.startsWith("GUEST_")).length
    : 0;
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by username, email or phone…"
          className="w-full max-w-sm px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
        />
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideGuests}
            onChange={(e) => setHideGuests(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-amber-400"
          />
          Hide guests
          {hiddenGuestCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-500">
              {hiddenGuestCount} hidden
            </span>
          )}
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse bg-gray-900/40">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-4 bg-gray-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : visibleUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {hideGuests && users.length > 0
                    ? "All users on this page are guests"
                    : "No users found"}
                </td>
              </tr>
            ) : (
              visibleUsers.map((u) => (
                <tr key={u.id} className="bg-gray-900/20 hover:bg-gray-900/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.displayName}</p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <p>{u.email ?? "—"}</p>
                    <p className="text-xs">{u.phoneNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {u.rating?.rating ?? 1200}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === "ADMIN"
                          ? "bg-amber-400/20 text-amber-400"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                        Banned
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBan(u.id, u.isBanned)}
                        title={u.isBanned ? "Unban" : "Ban"}
                        className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                      >
                        {u.isBanned ? (
                          <UserCheck className="w-4 h-4 text-green-400" />
                        ) : (
                          <UserX className="w-4 h-4 text-red-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRole(u.id, u.role)}
                        title={
                          u.role === "ADMIN" ? "Remove Admin" : "Make Admin"
                        }
                        className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                      >
                        {u.role === "ADMIN" ? (
                          <ShieldOff className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Shield className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Guest Cleanup */}
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/40 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white">Guest Cleanup</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Permanently delete guest accounts older than N days that have never played a game.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">Older than</label>
            <input
              type="number"
              min={1}
              max={365}
              value={cleanupDays}
              onChange={(e) => {
                setPreviewCount(null);
                setCleanupResult(null);
                setCleanupDays(Math.max(1, Number(e.target.value)));
              }}
              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs text-gray-400">days</span>
          </div>

          <button
            onClick={handlePreview}
            disabled={cleanupLoading}
            className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-40 transition-colors"
          >
            {cleanupLoading && previewCount === null ? "Checking…" : "Preview"}
          </button>

          {previewCount !== null && (
            <button
              onClick={handleCleanup}
              disabled={cleanupLoading || previewCount === 0}
              className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-600/40 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-40 transition-colors"
            >
              {cleanupLoading
                ? "Deleting…"
                : previewCount === 0
                ? "Nothing to delete"
                : `Delete ${previewCount} guest${previewCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {cleanupResult && (
          <p className="mt-3 text-xs text-green-400">{cleanupResult}</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>
            {total} user{total !== 1 ? "s" : ""}
            {hideGuests && (
              <span className="text-gray-600 ml-1">(guests hidden)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-gray-700 disabled:opacity-40 hover:border-gray-500"
            >
              Prev
            </button>
            <span className="px-3 py-1">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-gray-700 disabled:opacity-40 hover:border-gray-500"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
