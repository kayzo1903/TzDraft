"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminService, AdminUser } from "@/services/admin.service";
import { Shield, ShieldOff, UserX, UserCheck } from "lucide-react";

const PAGE_LIMIT = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by username, email or phone…"
        className="mb-6 w-full max-w-sm px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
      />

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
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>
            {total} user{total !== 1 ? "s" : ""}
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
