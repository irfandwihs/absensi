"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { FiUserPlus, FiUsers, FiEdit2, FiTrash2 } from "react-icons/fi";
import { AppLayout, Button, Card, Chip, EmptyState, FieldInput, FieldSelect, FormField, PageHeading, Skeleton, StatusMessage } from "../components/ui";

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
  const [loadError, setLoadError] = useState(false);

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
    setLoadError(false);
    try {
      const res = await adminFetch("/api/admin-users");
      const json: ApiResponse<User> = await res.json();
      if (res.ok) {
        setUsers(json.users || []);
      } else {
        console.error("refreshUsers error:", json);
        setLoadError(true);
        alert("Gagal memuat daftar pengguna");
      }
    } catch (err) {
      console.error("refreshUsers unexpected:", err);
      setLoadError(true);
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

  const inputProps = { autoComplete: "off" as const };
  return (
    <AppLayout active="admin">
      <div className="page-stack">
        <PageHeading title="Kelola Pengguna" subtitle="Atur akun dan akses pengguna absensi." />
        <div className="admin-tab-nav" role="group" aria-label="Bagian pengguna">
          <button type="button" className="admin-tab" aria-current={activeTab === "tambah" ? "page" : undefined} onClick={() => { setEditingUser(null); resetForm(); setActiveTab("tambah"); }}><FiUserPlus aria-hidden="true" /> Tambah pengguna</button>
          <button type="button" className="admin-tab" aria-current={activeTab === "daftar" ? "page" : undefined} onClick={() => { setEditingUser(null); resetForm(); setActiveTab("daftar"); }}><FiUsers aria-hidden="true" /> Daftar pengguna</button>
        </div>
        {(activeTab === "tambah" || editingUser) && <Card>
          <h2 className="card-title">{editingUser ? "Edit pengguna" : "Tambah pengguna"}</h2>
          <div className="admin-form">
            <FormField label="Nama lengkap" htmlFor="admin-full-name"><FieldInput id="admin-full-name" type="text" placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} {...inputProps} /></FormField>
            <FormField label="Email" htmlFor="admin-email"><FieldInput id="admin-email" type="email" placeholder="nama@perusahaan.id" value={email} onChange={(e) => setEmail(e.target.value)} {...inputProps} /></FormField>
            {!editingUser && <FormField label="Kata sandi sementara" htmlFor="admin-password"><FieldInput id="admin-password" type="password" placeholder="Masukkan kata sandi sementara" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></FormField>}
            <FormField label="Jabatan" htmlFor="admin-jabatan"><FieldInput id="admin-jabatan" type="text" placeholder="Jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} {...inputProps} /></FormField>
            <FormField label="Unit kerja" htmlFor="admin-unit"><FieldInput id="admin-unit" type="text" placeholder="Unit kerja" value={unitKerja} onChange={(e) => setUnitKerja(e.target.value)} {...inputProps} /></FormField>
            <FormField label="Peran" htmlFor="admin-role"><FieldSelect id="admin-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="user">User</option><option value="admin">Admin</option></FieldSelect></FormField>
            <div className="admin-form-actions">
              <Button className="full-width" onClick={() => void (editingUser ? handleSaveEdit() : handleAddUser())} disabled={adding || saving}>{adding || saving ? "Menyimpan…" : editingUser ? "Simpan" : "Tambah pengguna"}</Button>
              {editingUser && <Button variant="secondary" className="full-width" onClick={handleCancelEdit} disabled={saving}>Batal</Button>}
            </div>
          </div>
        </Card>}
        {activeTab === "daftar" && !editingUser && <Card>
          <div className="list-card-head"><h2 className="card-title">Daftar pengguna</h2><Button size="sm" variant="secondary" onClick={() => void refreshUsers()} disabled={loadingUsers}>{loadingUsers ? "Memuat…" : "Muat ulang"}</Button></div>
          {loadingUsers ? <Skeleton rows={3} /> : loadError ? <StatusMessage variant="error">Gagal memuat daftar pengguna. Periksa koneksi Anda lalu coba lagi.</StatusMessage> : users.length === 0 ? <EmptyState icon={<FiUsers />}>Belum ada pengguna. Tambahkan pengguna pertama.</EmptyState> : <div className="data-list">{users.map((u) => <article key={u.id} className="admin-user-card">
            <div><div className="list-card-head"><strong>{u.full_name || "Tanpa nama"}</strong><Chip variant={u.role === "admin" ? "accent" : "neutral"}>{u.role === "admin" ? "Admin" : "User"}</Chip></div><p className="body-secondary" style={{ margin: "5px 0 0" }}>{u.email}</p><p className="body-secondary" style={{ margin: "2px 0 0" }}>{u.jabatan || "—"} · {u.unit_kerja || "—"}</p></div>
            <div className="admin-row-actions"><Button size="sm" variant="secondary" onClick={() => handleEditUser(u)} aria-label={`Edit ${u.full_name || u.email}`}><FiEdit2 aria-hidden="true" /> Edit</Button><Button size="sm" variant="danger-outline" onClick={() => void handleDeleteUser(u.id)} disabled={deletingId === u.id} aria-label={`Hapus ${u.full_name || u.email}`}><FiTrash2 aria-hidden="true" /> {deletingId === u.id ? "Menghapus…" : "Hapus"}</Button></div>
          </article>)}</div>}
        </Card>}
      </div>
    </AppLayout>
  );
}
