"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FiUserPlus, FiUsers, FiEdit2, FiTrash2 } from "react-icons/fi";

type User = {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  jabatan?: string;
  unit_kerja?: string;
};

type ApiResponse<T> = {
  error?: string;
  users?: T[];
  ok?: boolean;
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
  const [activeTab, setActiveTab] = useState<"tambah" | "daftar">("tambah");
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const adminFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const token = await auth.currentUser?.getIdToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", "Bearer " + token);
    return fetch(input, { ...init, headers });
  }, []);

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("user");
    setJabatan("");
    setUnitKerja("");
  };

  const refreshUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await adminFetch("/api/admin-users");
      const json: ApiResponse<User> = await res.json();
      if (res.ok) {
        setUsers(json.users || []);
      } else {
        console.error("refreshUsers error:", json);
        alert("Gagal memuat daftar pengguna");
      }
    } catch (err) {
      console.error("refreshUsers unexpected:", err);
      alert("Terjadi kesalahan saat memuat pengguna");
    } finally {
      setLoadingUsers(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { window.location.href = "/login"; return; }
      void refreshUsers();
    });
    return unsubscribe;
  }, [refreshUsers]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFullName(user.full_name || "");
    setEmail(user.email || "");
    setJabatan(user.jabatan || "");
    setUnitKerja(user.unit_kerja || "");
    setRole(user.role || "user");
    setPassword("");
    setActiveTab("daftar"); // tetap di tab daftar saat edit
  };

  const handleAddUser = async () => {
    if (!email || !fullName || !password) {
      alert(
        "Mohon isi Nama, Email, dan Kata Sandi untuk menambahkan pengguna."
      );
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          password,
          jabatan,
          unit_kerja: unitKerja,
          role,
        }),
      });
      const json: ApiResponse<User> = await res.json();
      if (!res.ok) {
        console.error("add user error:", json);
        alert("Gagal menambahkan pengguna: " + (json.error || "server error"));
        return;
      }

      await refreshUsers();
      resetForm();
      setActiveTab("daftar");
      alert("Pengguna berhasil ditambahkan");
    } catch (err) {
      console.error("add user unexpected:", err);
      alert("Terjadi kesalahan saat menambahkan pengguna");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: fullName,
          email,
          jabatan,
          unit_kerja: unitKerja,
          role,
          // password tidak dikirim karena route PUT contoh kita tidak menangani password update.
        }),
      });
      const json: ApiResponse<User> = await res.json();
      if (!res.ok) {
        console.error("save edit error:", json);
        alert("Gagal menyimpan perubahan: " + (json.error || "server error"));
        return;
      }

      await refreshUsers();
      setEditingUser(null);
      resetForm();
      alert("Perubahan berhasil disimpan");
    } catch (err) {
      console.error("save edit unexpected:", err);
      alert("Terjadi kesalahan saat menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    resetForm();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pengguna ini?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json: ApiResponse<User> = await res.json();
      if (!res.ok) {
        console.error("delete error:", json);
        alert("Gagal menghapus pengguna: " + (json.error || "server error"));
        return;
      }
      await refreshUsers();
      alert("Pengguna dihapus");
    } catch (err) {
      console.error("delete unexpected:", err);
      alert("Terjadi kesalahan saat menghapus pengguna");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-sky-400 flex justify-center">
      <div className="w-full max-w-sm bg-sky-100 flex flex-col">
        {/* HEADER */}
        <header className="flex justify-between items-center px-4 py-3 bg-sky-500 text-white shadow">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <button
            onClick={async () => {
              await signOut(auth);
              window.location.href = "/login";
            }}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto bg-sky-500 px-4 py-4">
          {/* --- Tab Tambah Pengguna --- */}
          {activeTab === "tambah" && !editingUser && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="font-semibold mb-3 text-gray-700">
                Tambah Pengguna
              </h2>

              <input
                type="text"
                placeholder="Nama Lengkap"
                className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Jabatan"
                className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
              />
              <input
                type="text"
                placeholder="Unit Kerja"
                className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                value={unitKerja}
                onChange={(e) => setUnitKerja(e.target.value)}
              />
              <input
                type="password"
                placeholder="Kata Sandi"
                className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full mb-2 px-3 py-2 border rounded text-gray-800"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleAddUser}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded"
                disabled={adding}
              >
                {adding ? "Menyimpan..." : "Tambah Pengguna"}
              </button>
            </div>
          )}

          {/* --- Tab Daftar Pengguna --- */}
          {activeTab === "daftar" && (
            <div className="bg-white rounded-lg shadow-md p-4">
              {!editingUser ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-700">
                      Daftar Pengguna
                    </h2>
                    <button
                      onClick={refreshUsers}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow"
                    >
                      {loadingUsers ? "..." : "Refresh"}
                    </button>
                  </div>

                  {users.length === 0 ? (
                    <p className="text-gray-500 text-sm">Belum ada pengguna</p>
                  ) : (
                    <div className="space-y-3">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="bg-white rounded-lg shadow p-3 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-gray-800">
                              {u.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {u.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              {u.role}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Edit"
                              onClick={() => handleEditUser(u)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="text-red-500 hover:text-red-700"
                              title="Hapus"
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={deletingId === u.id}
                            >
                              {deletingId === u.id ? "..." : <FiTrash2 />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // FORM EDIT (tetap di tab daftar)
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h2 className="font-semibold mb-3 text-gray-700">
                    Edit Pengguna
                  </h2>
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Jabatan"
                    className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Unit Kerja"
                    className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Kata Sandi (opsional - tidak tersimpan di contoh ini)"
                    className="w-full mb-2 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full mb-2 px-3 py-2 border rounded text-gray-800"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded"
                      disabled={saving}
                    >
                      {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded"
                      disabled={saving}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* NAVIGATION */}
        <nav className="flex border-t bg-white shadow">
          <button
            className={`flex-1 flex flex-col items-center py-2 text-sm ${
              activeTab === "tambah"
                ? "text-sky-600 font-semibold"
                : "text-gray-400"
            }`}
            onClick={() => {
              setEditingUser(null);
              resetForm();
              setActiveTab("tambah");
            }}
          >
            <FiUserPlus className="text-lg mb-1" />
            Tambah Pengguna
          </button>
          <button
            className={`flex-1 flex flex-col items-center py-2 text-sm ${
              activeTab === "daftar"
                ? "text-sky-600 font-semibold"
                : "text-gray-400"
            }`}
            onClick={() => {
              setEditingUser(null);
              resetForm();
              setActiveTab("daftar");
            }}
          >
            <FiUsers className="text-lg mb-1" />
            Daftar Pengguna
          </button>
        </nav>
      </div>
    </div>
  );
}
