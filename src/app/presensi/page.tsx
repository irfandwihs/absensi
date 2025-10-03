"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type User = { id: string; email?: string };
type Attendance = {
  user_id: string;
  date?: string;
  check_in?: string;
  check_out?: string;
};

export default function PresensiPage() {
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const pad = (n: number) => String(n).padStart(2, "0");

  // helper: ambil tanggal lokal dengan format YYYY-MM-DD
  const getToday = () => new Date().toLocaleDateString("sv-SE");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", getToday())
          .single();
        setAttendance(data);
      }
    };
    getUser();
  }, []);

  const handleCheckIn = async () => {
    if (!user) return;
    const now = new Date();
    const displayTime = now.toLocaleTimeString("id-ID", { hour12: false });
    const timeForDb = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )}`;
    const today = getToday();

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        type: "in",
        time: timeForDb,
        date: today,
      }),
    });
    const insertJson = await res.json().catch(() => ({}));
    console.log("[presensi] check_in response:", insertJson, res.status);

    try {
      localStorage.setItem("absen-toast", `Masuk: ${displayTime}`);
      localStorage.removeItem("absen-fallback");
    } catch {}

    setAttendance(
      (prev) =>
        ({ ...(prev ?? {}), check_in: displayTime, date: today } as Attendance)
    );
    try {
      window.location.href = "/dashboard";
    } catch {}
  };

  const handleCheckOut = async () => {
    if (!user) return;
    const now = new Date();
    const displayTime = now.toLocaleTimeString("id-ID", { hour12: false });
    const timeForDb = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )}`;
    const today = getToday();

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        type: "out",
        time: timeForDb,
        date: today,
      }),
    });
    const outJson = await res.json().catch(() => ({}));
    console.log("[presensi] check_out response:", outJson, res.status);

    try {
      localStorage.setItem("absen-toast", `Pulang: ${displayTime}`);
      localStorage.removeItem("absen-fallback");
    } catch {}

    setAttendance(
      (prev) => ({ ...(prev ?? {}), check_out: displayTime } as Attendance)
    );
    try {
      window.location.href = "/dashboard";
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 to-sky-300 flex flex-col items-center p-4">
      <header className="w-full flex justify-center">
        <div className="w-full max-w-md flex items-center px-4 py-3 text-white">
          {/* Tombol Back */}
          <a
            href="/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition"
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

          {/* Judul */}
          <h2 className="ml-3 text-base font-semibold">Presensi</h2>
        </div>
      </header>

      <main className="w-full max-w-md mt-8 flex flex-col items-center">
        <div className="w-full grid grid-cols-2 gap-4">
          <button
            onClick={handleCheckIn}
            className="w-full border-2 border-green-500 text-green-800 bg-white/90 rounded-lg py-4 font-bold"
          >
            Absen Masuk
          </button>
          <button
            onClick={handleCheckOut}
            className="w-full border-2 border-red-500 text-red-800 bg-white/90 rounded-lg py-4 font-bold"
          >
            Absen Pulang
          </button>
        </div>

        <div className="w-full mt-6 text-center text-white/90">
          {attendance?.check_in && (
            <div className="mb-1">Masuk: {attendance.check_in}</div>
          )}
          {attendance?.check_out && <div>Pulang: {attendance.check_out}</div>}
        </div>
      </main>
    </div>
  );
}
