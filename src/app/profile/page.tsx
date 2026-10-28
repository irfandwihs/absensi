"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FiUser } from "react-icons/fi";
import { AppLayout, Button, Card, Chip } from "../components/ui";

type Profile = {
  id?: string;
  full_name?: string;
  email?: string;
  nip?: string;
  jabatan?: string;
  golongan?: string;
  unit_kerja?: string;
  app_version?: string;
  avatar_url?: string;
  role?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "/login"; return; }
      const snapshot = await getDoc(doc(db, "users", user.uid));
      const data = snapshot.data();
      setProfile({
        id: user.uid,
        full_name: data?.full_name || user.displayName || user.email || "Pengguna",
        email: data?.email || user.email || "",
        nip: data?.nip || "-",
        jabatan: data?.jabatan || "-",
        golongan: data?.golongan || "-",
        unit_kerja: data?.unit_kerja || "-",
        app_version: data?.app_version || "3.0.6",
        avatar_url: data?.avatar_url,
        role: data?.role || "user",
      });
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const name = profile?.full_name || "Pengguna";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const isAdmin = profile?.role === "admin";

  return (
    <AppLayout active="profile">
      <div className="page-stack">
        <Card>
          <div className="profile-summary">
            <div className="profile-avatar" aria-label={`Profil: ${name}`}>{profile?.avatar_url ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatar_url} alt="" className="profile-avatar-image" />
            </> : initials || <FiUser aria-hidden="true" />}</div>
            <h1 className="page-title-inline">{profile?.full_name || "Memuat profil…"}</h1>
            <span className="body-secondary">{profile?.email || ""}</span>
            <Chip variant={isAdmin ? "accent" : "neutral"}>{isAdmin ? "Admin" : "User"}</Chip>
          </div>
        </Card>
        <Card>
          <div className="profile-details">
            <div className="profile-row"><span>Jabatan</span><strong>{profile?.jabatan || "—"}</strong></div>
            <div className="profile-row"><span>Unit kerja</span><strong>{profile?.unit_kerja || "—"}</strong></div>
            <div className="profile-row"><span>Peran</span><strong>{isAdmin ? "Admin" : "User"}</strong></div>
          </div>
        </Card>
        <Button variant="danger-outline" className="full-width" onClick={handleLogout}>Keluar</Button>
      </div>
    </AppLayout>
  );
}
