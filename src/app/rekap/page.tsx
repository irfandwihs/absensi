"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // pastikan path ini benar di projectmu

type AttendanceRow = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in?: string | null;
  check_out?: string | null;
  note?: string | null;
};

const RekapPage: React.FC = () => {
  const router = useRouter();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!user) {
          if (mounted) setRows([]);
          setLoading(false);
          return;
        }

        const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const toDate = new Date(year, month, 0);
        const toDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
          toDate.getDate()
        ).padStart(2, "0")}`;

        const { data: fetched, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", fromDate)
          .lte("date", toDateStr)
          .order("date", { ascending: true });

        if (error) {
          console.error("fetch attendance error", error);
          if (mounted) setRows([]);
        } else if (mounted) {
          setRows((fetched as AttendanceRow[]) || []);
        }
      } catch (err) {
        console.error("load error", err);
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [month, year]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const formatTime = (t?: string | null) => {
    if (!t) return "";
    const [h = "00", m = "00", s = "00"] = t.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-sky-400 flex flex-col items-center p-4">
      {/* Header */}
      <header className="w-full flex justify-center">
        <div className="w-full max-w-md flex items-center px-4 py-3 text-white">
          <button
            onClick={() => router.back()}
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
          </button>
          <h2 className="ml-3 text-base font-semibold">Rekap Presensi</h2>
        </div>
      </header>

      {/* Content card */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4 mt-8">
        <h1 className="text-lg font-semibold text-sky-700 mb-1">
          Rekap Presensi
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Presensi Harian Anda, {year}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-600">Bulan</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("id-ID", { month: "long" })}
              </option>
            ))}
          </select>

          <label className="text-sm text-gray-600">Tahun</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border rounded text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="py-2 px-3 text-left">Tanggal</th>
                <th className="py-2 px-3 text-left">Masuk</th>
                <th className="py-2 px-3 text-left">Pulang</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    Memuat...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    Tidak ada data untuk bulan ini.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isToday = r.date === todayStr;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b last:border-b-0 ${
                        isToday ? "bg-blue-50 font-semibold" : ""
                      }`}
                    >
                      <td className="py-2 px-3">{r.date}</td>
                      <td className="py-2 px-3">{formatTime(r.check_in)}</td>
                      <td className="py-2 px-3">{formatTime(r.check_out)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Note: Terkadang dibutuhkan waktu dalam proses penyajian data mengingat
          kondisi jaringan dan server
        </p>
      </div>
    </div>
  );
};

export default RekapPage;
