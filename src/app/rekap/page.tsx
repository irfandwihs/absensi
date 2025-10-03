// @ts-nocheck
/* eslint-disable */
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AttendanceRow = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in?: string | null; // HH:MM:SS
  check_out?: string | null;
  note?: string | null;
};

export default function RekapPage(): JSX.Element {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        setRows([]);
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
      if (mounted) setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [month, year]);

  const formatTime = (t?: string | null) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    if (!h) return t;
    return `${h.padStart(2, "0")}:${m?.padStart(2, "0") || "00"}`;
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const mapRows = rows.map((r) => {
    const isToday = r.date === todayStr;
    return (
      <tr
        key={r.id}
        className={`border-b last:border-b-0 ${isToday ? "bg-blue-50" : ""}`}
      >
        <td className="py-3 px-2 align-top">
          <div className="text-xs text-gray-600">{r.date}</div>
        </td>
        <td className="py-3 px-2 align-top">
          <div className="font-medium">{formatTime(r.check_in)}</div>
          <div className="text-xs text-gray-500">{r.note || ""}</div>
        </td>
        <td className="py-3 px-2 align-top">
          <div className="font-medium">{formatTime(r.check_out)}</div>
          <div className="text-xs text-gray-500">{r.note || ""}</div>
        </td>
      </tr>
    );
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-md p-4">
        <h1 className="text-2xl font-semibold mb-1">Rekap Presensi</h1>
        <p className="text-sm text-gray-600 mb-4">
          Presensi Harian anda, {year}
        </p>

        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm">Bulan</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
          <label className="text-sm">Tahun</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-2 w-1/3">Tanggal</th>
                <th className="py-2 px-2 w-1/3">Masuk</th>
                <th className="py-2 px-2 w-1/3">Pulang</th>
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
                mapRows
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
}
