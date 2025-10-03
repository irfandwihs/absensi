"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type User = {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  jabatan?: string;
  unit_kerja?: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [jabatan, setJabatan] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [fetchErrorDetail, setFetchErrorDetail] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const refreshUsers = async () => {
    setLoadingUsers(true);
    setFetchErrorDetail(null);
    try {
      const res = await fetch("/api/admin-users");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Gagal mengambil pengguna dari server");
      }
      setUsers(json.users || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[admin] refreshUsers error:", err);
      setMessage("Gagal memuat daftar pengguna: " + msg);
      setMessageType("error");
      setFetchErrorDetail(msg);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // protect page: ensure current user has role 'admin'
  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setCurrentUserEmail(user.email ?? null);
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("email", user.email)
        .single();
      if (!data || data.role !== "admin") {
        window.location.href = "/login";
        return;
      }
      // now that we confirmed admin, fetch the users list (ensures session is established for RLS)
      await refreshUsers();
    };
    checkAdmin();
  }, []);

  const handleAddUser = async () => {
    setMessage(null);
    setMessageType(null);
    // basic validation
    if (!email || !password || !fullName) {
      setMessage("Isi semua field yang diperlukan (nama, email, kata sandi)");
      setMessageType("error");
      return;
    }
    // disable double submit by setting a temporary message
    setMessage("Mengirim... please wait");
    setMessageType(null);
    // Use server API to create auth user and users record
    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role,
        jabatan,
        unit_kerja: unitKerja,
      }),
    });
    const data = await res.json();
    if (data?.error) {
      setMessage("Error creating user: " + data.error);
      setMessageType("error");
      // clear the temporary sending state after 4s
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    setMessage("Pengguna berhasil dibuat");
    setMessageType("success");
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("user");
    setJabatan("");
    setUnitKerja("");
    await refreshUsers();
    // auto-clear success message shortly
    setTimeout(() => setMessage(null), 4000);
  };

  const handleEditInit = (u: User) => {
    setEditingUser(u);
    setEmail(u.email || "");
    setFullName(u.full_name || "");
    setJabatan(u.jabatan || "");
    setUnitKerja(u.unit_kerja || "");
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    // call server API to perform update (uses service role)
    try {
      const res = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          email,
          full_name: fullName,
          jabatan,
          unit_kerja: unitKerja,
          role,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan perubahan");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage("Gagal menyimpan perubahan: " + msg);
      setMessageType("error");
      return;
    }
    setEditingUser(null);
    setEmail("");
    setFullName("");
    setJabatan("");
    setUnitKerja("");
    await refreshUsers();
    setMessage("Perubahan pengguna tersimpan");
    setMessageType("success");
  };

  const handleDeleteUser = async (id?: string) => {
    if (!id) return;
    try {
      const res = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal menghapus pengguna");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage("Gagal menghapus pengguna: " + msg);
      setMessageType("error");
      return;
    }
    await refreshUsers();
    setMessage("Pengguna dihapus");
    setMessageType("success");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center">
      <div className="w-full max-w-md">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="bg-red-400 text-white px-3 py-1 rounded"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-4">
            <div className="text-xs text-gray-500">Total User</div>
            <div className="text-xl font-bold text-sky-600">{users.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500">Total Admin</div>
            <div className="text-xl font-bold text-sky-600">
              {users.filter((u) => u.role === "admin").length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500">Absensi Hari Ini</div>
            <div className="text-xl font-bold text-sky-600">-</div>
          </div>
        </div>
        {currentUserEmail && (
          <div className="text-sm text-gray-500 mb-4">
            Signed in as {currentUserEmail}
          </div>
        )}
        {message && (
          <div
            className={`p-3 mb-4 rounded ${
              messageType === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mb-6">
          <h2 className="font-semibold mb-2">
            {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
          </h2>
          <div className="card p-4 mb-4">
            <input
              type="text"
              placeholder="Nama Lengkap"
              className="input w-full mb-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="input w-full mb-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Jabatan"
              className="input w-full mb-2"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
            />
            <input
              type="text"
              placeholder="Unit Kerja"
              className="input w-full mb-2"
              value={unitKerja}
              onChange={(e) => setUnitKerja(e.target.value)}
            />
            {!editingUser && (
              <>
                <input
                  type="password"
                  placeholder="Kata Sandi"
                  className="input w-full mb-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input w-full mb-2"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </>
            )}
            {editingUser ? (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateUser}
                  className="bg-yellow-500 text-white py-2 px-4 rounded"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEmail("");
                    setFullName("");
                    setJabatan("");
                    setUnitKerja("");
                  }}
                  className="bg-gray-300 py-2 px-4 rounded"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddUser}
                className="btn-primary w-full mt-2"
              >
                Tambah Pengguna
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold mb-2 mt-8">Daftar Pengguna</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshUsers}
              className="bg-slate-600 text-white px-3 py-1 rounded text-sm"
            >
              Refresh
            </button>
            {loadingUsers && (
              <div className="text-sm text-neutral-400">Memuat...</div>
            )}
          </div>
        </div>
        {fetchErrorDetail && (
          <div className="text-sm text-red-300 mb-2">
            Detail: {fetchErrorDetail}
          </div>
        )}
        <div className="overflow-x-auto">
          <div className="bg-white rounded shadow p-4">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-neutral-300 border-b">
                  <th className="p-3">Nama</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3">Unit Kerja</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-neutral-400">
                      Belum ada pengguna
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-neutral-700">
                      <td className="p-3">{u.full_name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.jabatan}</td>
                      <td className="p-3">{u.unit_kerja}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditInit(u)}
                            className="bg-yellow-400 px-2 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="bg-red-500 px-2 py-1 rounded text-sm text-white"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
