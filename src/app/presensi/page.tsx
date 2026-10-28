"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FiCheckCircle, FiClock, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { AppLayout, Button, Card, Chip, PageHeading, StatusMessage } from "../components/ui";
import AttendanceMap from "../components/AttendanceMap";

type Attendance = {
  user_id: string;
  date?: string;
  check_in?: string;
  check_out?: string;
};
type AttendanceType = "in" | "out";

const MAP_URL = "https://www.google.com/maps?q=-7.765996,110.5930427";

export default function PresensiPage() {
  const [user, setUser] = useState<typeof auth.currentUser>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [busyType, setBusyType] = useState<AttendanceType | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const getToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.replace("/login"); return; }
      setUser(currentUser);
      try {
        const snapshot = await getDoc(doc(db, "attendance", currentUser.uid + "_" + getToday()));
        setAttendance(snapshot.exists() ? snapshot.data() as Attendance : null);
      } catch {
        setMessage("Firestore menolak akses. Terapkan firestore.rules di Firebase Console sebelum membaca rekap presensi.");
      }
    });
    return unsubscribe;
  }, [router]);

  const recordAttendance = async (type: AttendanceType) => {
    if (!user || busyType) return;
    if (!navigator.geolocation) {
      setMessage("Browser ini tidak mendukung GPS. Buka aplikasi melalui HTTPS atau localhost di perangkat yang memiliki lokasi.");
      return;
    }

    setBusyType(type);
    setMessage("Memeriksa lokasi perangkat...");
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
      });
      const token = await user.getIdToken();
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Presensi gagal disimpan.");
        return;
      }

      const label = type === "in" ? "Masuk" : "Pulang";
      setAttendance((previous) => ({
        ...(previous || {}),
        user_id: user.uid,
        date: result.date,
        [type === "in" ? "check_in" : "check_out"]: result.time,
      }));
      setMessage(`Presensi ${label.toLowerCase()} berhasil pada ${result.time}. Jarak dari titik rumah ${result.distance} m.`);
      try {
        localStorage.setItem("absen-toast", `${label}: ${result.time}`);
        localStorage.removeItem("absen-fallback");
      } catch {}
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (typeof geoError.code === "number") {
        setMessage(geoError.code === geoError.PERMISSION_DENIED
          ? "Izin lokasi ditolak. Izinkan akses lokasi untuk situs ini, lalu coba lagi."
          : geoError.code === geoError.TIMEOUT
            ? "GPS belum merespons. Pastikan lokasi aktif dan coba lagi di area terbuka."
            : "Lokasi tidak dapat dibaca. Aktifkan GPS lalu coba lagi.");
      } else {
        setMessage(error instanceof Error ? error.message : "Presensi gagal disimpan.");
      }
    } finally {
      setBusyType(null);
    }
  };

  const isSuccess = message.includes("berhasil");
  const isOutsideArea = message.toLowerCase().includes("luar radius");
  const isPermissionError = message.toLowerCase().includes("izin lokasi");
  const isGpsError = isPermissionError || message.toLowerCase().includes("gps") || message.toLowerCase().includes("akurasi");
  const status = attendance?.check_out ? "Sudah pulang" : attendance?.check_in ? "Sudah masuk" : "Belum presensi";

  return (
    <AppLayout active="attendance">
      <div className="page-stack">
        <PageHeading title="Presensi" subtitle={new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
        <Card>
          <p className="eyebrow">Status hari ini</p>
          <div className="status-row"><strong>{status}</strong><Chip variant={attendance?.check_out || attendance?.check_in ? "success" : "neutral"}>{status}</Chip></div>
          {attendance?.check_in && <div className="profile-row"><span>Masuk</span><strong>{attendance.check_in}</strong></div>}
          {attendance?.check_out && <div className="profile-row"><span>Pulang</span><strong>{attendance.check_out}</strong></div>}
          {message && <StatusMessage variant={isSuccess ? "success" : isPermissionError || isOutsideArea ? "error" : isGpsError ? "warning" : "info"}>{isSuccess ? <><FiCheckCircle aria-hidden="true" /> {message}</> : message}</StatusMessage>}
          {isGpsError && !isSuccess && <Button size="sm" variant="secondary" style={{ marginTop: 12 }} onClick={() => void recordAttendance(attendance?.check_in ? "out" : "in")}><FiRefreshCw aria-hidden="true" /> Coba lagi</Button>}
          {isSuccess && <Link className="ui-button button-secondary full-width" style={{ marginTop: 12 }} href="/">Kembali ke Beranda</Link>}
        </Card>
        <Card>
          <h2 className="card-title">Area presensi</h2>
          <p className="body-secondary">Presensi hanya bisa dilakukan dalam radius 20 meter dari titik rumah Gatak Krun, Dusun I, Pasung, Kecamatan Wedi, Klaten.</p>
          <AttendanceMap />
          <a className="location-link" href={MAP_URL} target="_blank" rel="noopener">Lihat titik di peta</a>
        </Card>
        {message.toLowerCase().includes("memeriksa lokasi") && <StatusMessage variant="info"><FiClock aria-hidden="true" /> Memeriksa lokasi Anda…</StatusMessage>}
          {isOutsideArea && <><StatusMessage variant="error">Anda berada di luar radius 20 meter dari titik presensi. Presensi tidak dapat dilakukan. <a className="location-link" href={MAP_URL} target="_blank" rel="noopener">Lihat titik di peta</a></StatusMessage><Button size="sm" variant="secondary" onClick={() => void recordAttendance(attendance?.check_in ? "out" : "in")}><FiRefreshCw aria-hidden="true" /> Coba lagi</Button></>}
        <div className="attendance-actions">
          <Button size="xl" onClick={() => void recordAttendance("in")} disabled={!user || busyType !== null || Boolean(attendance?.check_in) || isOutsideArea}>
            {busyType === "in" ? <><FiClock aria-hidden="true" /> Memeriksa lokasi Anda…</> : <><FiMapPin aria-hidden="true" /> Masuk</>}
          </Button>
          <Button size="xl" variant="secondary" onClick={() => void recordAttendance("out")} disabled={!user || busyType !== null || !attendance?.check_in || Boolean(attendance?.check_out) || isOutsideArea}>
            {busyType === "out" ? <><FiClock aria-hidden="true" /> Memeriksa lokasi Anda…</> : <><FiMapPin aria-hidden="true" /> Pulang</>}
          </Button>
        </div>
        <p className="body-secondary">Tombol Pulang aktif setelah presensi Masuk tercatat.</p>
      </div>
    </AppLayout>
  );
}
