"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type User = {
  id: string;
  email?: string;
};

type Attendance = {
  user_id: string;
  date?: string;
  check_in?: string;
  check_out?: string;
};

export default function Dashboard() {
  const [, /* user */ setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [dateString, setDateString] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user as User | null);
        setIsAuthenticated(!!user);
        if (user) {
          const { data } = await supabase
            .from("attendance")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", new Date().toISOString().split("T")[0])
            .single();
          if (data) setAttendance(data as Attendance);
          else {
            // try fallback
            try {
              const fb = localStorage.getItem("absen-fallback");
              if (fb) {
                const obj = JSON.parse(fb);
                setAttendance({
                  user_id: user.id,
                  date: obj.date,
                  check_in: obj.check_in,
                  check_out: obj.check_out,
                } as Attendance);
              } else setAttendance(null);
            } catch {
              setAttendance(null);
            }
          }
        }
      } catch {
        // ignore errors retrieving user/attendance
      }
    };
    getUser();

    // set initial date and time only on client
    setDateString(
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    setCurrentTime(new Date().toLocaleTimeString("id-ID", { hour12: false }));
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("id-ID", { hour12: false }));
    }, 1000);

    // check for toast set by presensi page
    try {
      const tmsg = localStorage.getItem("absen-toast");
      if (tmsg) {
        setToast(tmsg);
        localStorage.removeItem("absen-toast");
        setTimeout(() => setToast(null), 5000);
      }
    } catch {
      /* ignore */
    }
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 to-sky-300 flex flex-col items-center p-6">
      <header className="w-full max-w-md mt-6 relative">
        <div className="absolute left-0 top-0 mt-2 ml-2">
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="p-2 rounded bg-white/20 text-white"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {menuOpen && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm">
              {isAuthenticated ? (
                <>
                  <a href="/profile" className="block px-2 py-1 text-sky-700">
                    Profile
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-2 py-1 text-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <a href="/login" className="block px-2 py-1 text-sky-700">
                  Login
                </a>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-white">
          <h1 className="text-3xl font-extrabold tracking-widest">PRESENSI</h1>
          <div className="mt-3 text-sm">
            Hari ini, {dateString}
            <div className="mt-1 text-lg font-semibold">{currentTime}</div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md mt-6">
        <section className="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-gray-500">Masuk</div>
              <div className="text-lg font-semibold text-gray-800">
                {attendance?.check_in || "-"}{" "}
                {/* <div className="text-xs text-gray-400">Wfo</div> */}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Pulang</div>
              <div className="text-lg font-semibold text-gray-800">
                {attendance?.check_out || "-"}
              </div>
            </div>
          </div>
        </section>
        {toast && (
          <div className="fixed top-6 right-6 bg-white rounded shadow p-3 text-sm">
            {toast}
            <button
              className="ml-3 text-xs text-sky-600"
              onClick={() => setToast(null)}
            >
              OK
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 mt-5">
          <a
            href="/presensi"
            className="bg-white/95 rounded-lg p-4 flex flex-col items-center shadow-inner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">Presensi</span>
          </a>
          <a
            href="/rekap"
            className="bg-white/95 rounded-lg p-4 flex flex-col items-center shadow-inner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 mb-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 13h2v-2H3v2zm4 0h2v-4H7v4zm4 0h2V7h-2v6zm4 0h2v-8h-2v8zm4 0h2v-6h-2v6z" />
            </svg>
            <span className="text-sm">Rekap Presensi</span>
          </a>
        </section>

        <div className="mt-6">
          {/* Actions area for check in/out when not using the grid button */}
          {/* {!attendance?.check_in && (
            <button
              onClick={handleCheckIn}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold"
            >
              Presensi Masuk
            </button>
          )} */}

          {/* {attendance?.check_in && !attendance?.check_out && (
            <button
              onClick={handleCheckOut}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold"
            >
              Presensi Pulang
            </button>
          )} */}
        </div>
      </main>

      <footer className="w-full max-w-md mt-8 text-center text-white text-sm opacity-90">
        &nbsp;
      </footer>
    </div>
  );
}
