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
          .eq("date", new Date().toISOString().split("T")[0])
          .single();
        setAttendance(data);
      }
    };
    // removed incidental time calculations from useEffect
    getUser();
  }, []);

  const handleCheckIn = async () => {
    if (!user) return;
    const now = new Date();
    const displayTime = now.toLocaleTimeString("id-ID", { hour12: false });
    const timeForDb = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )}`;
    const today = new Date().toISOString().split("T")[0];

    // Try to insert; if a row already exists for (user_id,date), fall back to update
    // call server endpoint to write attendance (service role key used server-side)
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
    console.log(
      "[presensi] /api/attendance insert response:",
      insertJson,
      res.status
    );
    const insertError = insertJson?.error;

    try {
      localStorage.setItem("absen-toast", `Masuk: ${displayTime}`);
    } catch {}

    if (insertError) {
      // attempt to update existing row's check_in
      try {
        // call server endpoint to update check_in
        try {
          const updRes = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              type: "in",
              time: timeForDb,
              date: today,
            }),
          });
          const updJson = await updRes.json().catch(() => ({}));
          console.log(
            "[presensi] /api/attendance update check_in:",
            updJson,
            updRes.status
          );
          try {
            localStorage.removeItem("absen-fallback");
          } catch {}
        } catch (e) {
          console.error("[presensi] failed update check_in", e);
          try {
            localStorage.setItem(
              "absen-fallback",
              JSON.stringify({ check_in: timeForDb, date: today })
            );
          } catch {}
        }
      } catch (e) {
        console.error("[presensi] failed update check_in", e);
        try {
          localStorage.setItem(
            "absen-fallback",
            JSON.stringify({ check_in: displayTime, date: today })
          );
        } catch {}
      }
    } else {
      try {
        localStorage.removeItem("absen-fallback");
      } catch {}
    }

    // update local state immediately for UI
    setAttendance(
      (prev) =>
        ({ ...(prev ?? {}), check_in: displayTime, date: today } as Attendance)
    );
    // redirect to dashboard so the new time appears there (dashboard reads absen-toast / attendance)
    try {
      window.location.href = "/dashboard";
    } catch {
      // ignore in non-browser environments
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    const now = new Date();
    const displayTime = now.toLocaleTimeString("id-ID", { hour12: false });
    const timeForDb = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )}`;
    const today = new Date().toISOString().split("T")[0];

    // call server endpoint to set check_out
    const outRes = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        type: "out",
        time: timeForDb,
        date: today,
      }),
    });
    const outJson = await outRes.json().catch(() => ({}));
    console.log(
      "[presensi] /api/attendance check_out:",
      outJson,
      outRes.status
    );
    const error = outJson?.error;

    try {
      localStorage.setItem("absen-toast", `Pulang: ${displayTime}`);
    } catch {}

    if (error) {
      try {
        localStorage.setItem(
          "absen-fallback",
          JSON.stringify({ check_out: displayTime, date: today })
        );
      } catch {}
    } else {
      try {
        localStorage.removeItem("absen-fallback");
      } catch {}
    }

    // update local state immediately for UI
    setAttendance(
      (prev) => ({ ...(prev ?? {}), check_out: displayTime } as Attendance)
    );
    // redirect to dashboard to show the pulang time
    try {
      window.location.href = "/dashboard";
    } catch {
      // ignore
    }
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
          {/* Small helper text showing current state */}
          {attendance?.check_in && (
            <div className="mb-1">Masuk: {attendance.check_in}</div>
          )}
          {attendance?.check_out && <div>Pulang: {attendance.check_out}</div>}
        </div>
      </main>
    </div>
  );
}
