"use client";

import { useEffect, useState } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FiCalendar, FiMapPin, FiUser } from "react-icons/fi";
import { AppLayout, Card, Chip, PageHeading } from "./components/ui";

type User = {
  uid: string;
  email?: string;
  displayName?: string | null;
};

type Attendance = {
  user_id: string;
  date?: string;
  check_in?: string;
  check_out?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [dateString, setDateString] = useState<string>("");
  const [todayISO, setTodayISO] = useState<string>(
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }) // format lokal YYYY-MM-DD
  );
  const [toast, setToast] = useState<string | null>(null);

  // ambil data user & attendance
  useEffect(() => {
    const loadUserAndAttendance = async () => {
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
      try {
        const user = auth.currentUser;
        setUser(user as User | null);
        if (user) {
          const snapshot = await getDoc(doc(db, "attendance", user.uid + "_" + today));
          const data = snapshot.exists() ? snapshot.data() : null;
          if (data) {
            setAttendance(data as Attendance);
          } else {
            // fallback localStorage
            const fb = localStorage.getItem("absen-fallback");
            if (fb) {
              const obj = JSON.parse(fb);
              if (obj.date === today) {
                setAttendance({
                  user_id: user.uid,
                  date: obj.date,
                  check_in: obj.check_in,
                  check_out: obj.check_out,
                });
              } else {
                localStorage.removeItem("absen-fallback");
                setAttendance(null);
              }
            } else {
              setAttendance(null);
            }
          }
        }
      } catch {
        setAttendance(null);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, () => { void loadUserAndAttendance(); });

    // set tanggal & jam realtime
    setDateString(
      new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    setCurrentTime(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()));
    const timer = setInterval(() => {
      setCurrentTime(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()));
    }, 1000);

    // cek toast dari localStorage
    const tmsg = localStorage.getItem("absen-toast");
    if (tmsg) {
      setToast(tmsg);
      localStorage.removeItem("absen-toast");
      setTimeout(() => setToast(null), 5000);
    }

    return () => { clearInterval(timer); unsubscribe(); };
  }, []);

  // cron-like untuk reset ketika ganti hari (lokal)
  useEffect(() => {
    const cron = setInterval(() => {
      const nowISO = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
      if (nowISO !== todayISO) {
        // reset data ke hari baru
        setTodayISO(nowISO);
        setAttendance(null);
        localStorage.removeItem("absen-fallback");
        setDateString(
          new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        );
      }
    }, 60 * 1000); // cek tiap 1 menit
    return () => clearInterval(cron);
  }, [todayISO]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 19 ? "sore" : "malam";
  return (
    <AppLayout active="home">
      <div className="page-stack">
        <PageHeading title={`Selamat ${greeting}, ${user?.displayName || user?.email?.split("@")[0] || "Pengguna"}`} subtitle={`${dateString} · ${currentTime || "--:--"}`} />
        <Card>
          <p className="eyebrow">Presensi hari ini</p>
          <div className="attendance-grid">
            <div className="attendance-cell">
              <span className="attendance-label">Masuk</span>
              <strong className="attendance-value">{attendance?.check_in || "—"}</strong>
              <Chip variant={attendance?.check_in ? "success" : "neutral"}>{attendance?.check_in ? "Sudah" : "Belum"}</Chip>
            </div>
            <div className="attendance-cell">
              <span className="attendance-label">Pulang</span>
              <strong className="attendance-value">{attendance?.check_out || "—"}</strong>
              <Chip variant={attendance?.check_out ? "success" : "neutral"}>{attendance?.check_out ? "Sudah" : "Belum"}</Chip>
            </div>
          </div>
          <a href="/presensi" className="ui-button button-primary full-width" style={{ marginTop: 16 }}>Buka Presensi</a>
        </Card>
        {toast && <div className="status-message status-success" role="status">{toast}<button className="ui-button button-secondary button-sm" style={{ marginLeft: 12 }} onClick={() => setToast(null)}>Tutup</button></div>}
        <section>
          <p className="eyebrow">Pintasan</p>
          <div className="shortcut-grid">
            <a href="/presensi" className="shortcut-link"><FiMapPin aria-hidden="true"/><span>Presensi</span></a>
            <a href="/rekap" className="shortcut-link"><FiCalendar aria-hidden="true"/><span>Rekap</span></a>
            <a href="/profile" className="shortcut-link"><FiUser aria-hidden="true"/><span>Profil</span></a>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
