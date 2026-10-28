"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { FiCalendar } from "react-icons/fi";
import { AppLayout, Card, Chip, EmptyState, FieldSelect, PageHeading, Skeleton, StatusMessage } from "../components/ui";

type AttendanceRow = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in?: string | null;
  check_out?: string | null;
  note?: string | null;
};

const RekapPage: React.FC = () => {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState<number>(Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", month: "numeric" }).format(new Date())));
  const [year, setYear] = useState<number>(Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date())));

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { if (mounted) { setRows([]); setLoading(false); } return; }
      setLoading(true);
      setError(false);
      try {
        const fromDate = year + "-" + String(month).padStart(2, "0") + "-01";
        const lastDay = new Date(year, month, 0).getDate();
        const toDate = year + "-" + String(month).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0");
        const records = query(
          collection(db, "attendance"),
          where("user_id", "==", user.uid),
          where("date", ">=", fromDate),
          where("date", "<=", toDate),
          orderBy("date", "asc")
        );
        const snapshot = await getDocs(records);
        if (mounted) setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AttendanceRow)));
      } catch (error) {
        console.error("Gagal memuat rekap presensi:", error);
        if (mounted) { setRows([]); setError(true); }
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => { mounted = false; unsubscribe(); };
  }, [month, year]);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const formatTime = (t?: string | null) => {
    if (!t) return "";
    const [h = "00", m = "00", s = "00"] = t.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
  };

  return (
    <AppLayout active="recap">
      <div className="page-stack">
        <PageHeading title="Rekap Presensi" subtitle="Pilih bulan dan tahun." />
        <Card>
          <div className="filter-grid">
            <div className="form-field"><label htmlFor="month">Bulan</label><FieldSelect id="month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString("id-ID", { month: "long" })}</option>)}</FieldSelect></div>
            <div className="form-field"><label htmlFor="year">Tahun</label><FieldSelect id="year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{Array.from({ length: 7 }).map((_, i) => { const value = new Date().getFullYear() - 5 + i; return <option key={value} value={value}>{value}</option>; })}</FieldSelect></div>
          </div>
        </Card>
        {error && <StatusMessage variant="error">Gagal memuat daftar presensi. Periksa koneksi Anda lalu coba lagi. <button className="ui-button button-secondary button-sm" onClick={() => window.location.reload()}>Coba lagi</button></StatusMessage>}
        {loading ? <Skeleton rows={4} /> : error ? null : rows.length === 0 ? <Card><EmptyState icon={<FiCalendar />}>Belum ada data presensi untuk bulan ini.</EmptyState></Card> : (
          <div className="data-list">
            {rows.map((row) => {
              const date = new Date(`${row.date}T12:00:00`);
              const isToday = row.date === todayStr;
              const dateLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "short", day: "2-digit", month: "short" }).format(date);
              const complete = Boolean(row.check_out);
              return <Card key={row.id} className="data-card">
                <div className="list-card-head"><strong>{dateLabel}{isToday ? " · Hari ini" : ""}</strong><Chip variant={complete ? "success" : "neutral"}>{complete ? "Lengkap" : "Belum pulang"}</Chip></div>
                <div className="data-card-grid"><div className="attendance-cell"><span className="attendance-label">Masuk</span><strong>{formatTime(row.check_in).slice(0,5) || "—"}</strong></div><div className="attendance-cell"><span className="attendance-label">Pulang</span><strong>{formatTime(row.check_out).slice(0,5) || "—"}</strong></div></div>
              </Card>;
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RekapPage;
