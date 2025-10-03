"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Try to find extended profile in `users` table by email
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || user.email,
          email: data.email || user.email,
          nip: data.nip || "-",
          jabatan: data.jabatan || "-",
          golongan: data.golongan || "-",
          unit_kerja: data.unit_kerja || "-",
          app_version: data.app_version || "3.0.6",
          avatar_url: data.avatar_url || undefined,
        });
      } else {
        setProfile({
          full_name: user.email,
          email: user.email,
          app_version: "3.0.6",
        });
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 to-sky-300 p-4 flex flex-col items-center">
      <header className="w-full flex justify-center">
        <div className="w-full max-w-md flex items-center px-4 py-3 text-white">
          <a
            href="/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition"
            aria-label="Kembali"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </a>
          <h2 className="ml-3 text-base font-semibold">Profil</h2>
        </div>
      </header>

      <main className="w-full max-w-md mt-6 rounded-xl overflow-hidden">
        <div className="relative h-20 bg-sky-0" />
        <div className="-mt-10 flex flex-col items-center pb-6">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white">
            {/* avatar placeholder */}
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xl font-bold text-sky-700">
                {(profile?.full_name || "U").charAt(0)}
              </div>
            )}
          </div>

          <div className="text-center mt-3 px-4">
            <div className="font-bold text-lg">{profile?.full_name || "-"}</div>
            <div className="text-sm text-gray-600 mt-1">
              {profile?.nip || "-"}
            </div>
          </div>

          <div className="w-full px-4 mt-4">
            <div className="card p-4">
              <div className="mb-3">
                <div className="text-xs text-gray-500">Jabatan</div>
                <div className="text-sm">{profile?.jabatan || "-"}</div>
              </div>
              {/* <div className="mb-3">
                <div className="text-xs text-gray-500">Golongan</div>
                <div className="text-sm">{profile?.golongan || "-"}</div>
              </div> */}
              <div className="mb-3">
                <div className="text-xs text-gray-500">Unit Kerja</div>
                <div className="text-sm">{profile?.unit_kerja || "-"}</div>
              </div>
              {/* <div className="mb-4">
                <div className="text-xs text-gray-500">App Version</div>
                <div className="text-sm">{profile?.app_version || "3.0.6"}</div>
              </div> */}

              <div className="flex justify-center">
                <button onClick={handleLogout} className="btn-primary">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
