"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type User = { uid: string; email?: string | null };
type Attendance = {
  user_id: string;
  date?: string;
  check_in?: string;
  check_out?: string;
};

export default function PresensiPage() {
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);

  // helper: ambil tanggal lokal dengan format YYYY-MM-DD
  const getToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

  useEffect(() => {
    const getUser = async () => {
      const user = auth.currentUser;
      setUser(user);
      if (user) {
        const snapshot = await getDoc(doc(db, "attendance", user.uid + "_" + getToday()));
        setAttendance(snapshot.exists() ? snapshot.data() as Attendance : null);
      }
    };
    const unsubscribe = onAuthStateChanged(auth, () => { void getUser(); });
    return unsubscribe;
  }, []);

  const handleCheckIn = async () => {
    if (!user) return;
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "in" }),
    });
    const result = await res.json();
    if (!res.ok) { alert(result.error || "Presensi gagal disimpan."); return; }
    const displayTime = result.time as string;
    const today = result.date as string;

    try {
      localStorage.setItem("absen-toast", `Masuk: ${displayTime}`);
      localStorage.removeItem("absen-fallback");
    } catch {}

    setAttendance(
      (prev) =>
        ({ ...(prev ?? {}), check_in: displayTime, date: today } as Attendance)
    );
    try {
      window.location.href = "/"
    } catch {}
  };

  const handleCheckOut = async () => {
    if (!user) return;
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "out" }),
    });
    const result = await res.json();
    if (!res.ok) { alert(result.error || "Presensi gagal disimpan."); return; }
    const displayTime = result.time as string;

    try {
      localStorage.setItem("absen-toast", `Pulang: ${displayTime}`);
      localStorage.removeItem("absen-fallback");
    } catch {}

    setAttendance(
      (prev) => ({ ...(prev ?? {}), check_out: displayTime } as Attendance)
    );
    try {
      window.location.href = "/"
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 to-sky-300 flex flex-col items-center p-4">
      <header className="w-full flex justify-center">
        <div className="w-full max-w-md flex items-center px-4 py-3 text-white">
          {/* Tombol Back */}
          <Link
            href="/"
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
          </Link>

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
