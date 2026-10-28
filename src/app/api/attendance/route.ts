import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../../lib/firebaseAdmin";

const HOME = { latitude: -7.765996, longitude: 110.5930427 };
const RADIUS_METERS = 20;

function jakartaDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

function distanceInMeters(latitude: number, longitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const lat1 = radians(HOME.latitude);
  const lat2 = radians(latitude);
  const deltaLat = radians(latitude - HOME.latitude);
  const deltaLon = radians(longitude - HOME.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Silakan login." }, { status: 401 });

    const adminAuth = getFirebaseAdminAuth();
    let user;
    try {
      user = await adminAuth.verifyIdToken(token);
    } catch {
      return Response.json({ error: "Sesi login tidak valid. Silakan login kembali." }, { status: 401 });
    }

    const body = await request.json() as {
      type?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };
    const { type, latitude, longitude, accuracy } = body;
    if (type !== "in" && type !== "out") {
      return Response.json({ error: "Jenis presensi tidak valid." }, { status: 400 });
    }
    if (![latitude, longitude, accuracy].every((value) => typeof value === "number" && Number.isFinite(value))) {
      return Response.json({ error: "Lokasi perangkat tidak valid. Aktifkan GPS lalu coba lagi." }, { status: 400 });
    }
    if (latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180 || accuracy! <= 0) {
      return Response.json({ error: "Data GPS tidak valid. Aktifkan lokasi perangkat lalu coba lagi." }, { status: 400 });
    }
    if (accuracy! > RADIUS_METERS) {
      return Response.json({ error: `Akurasi GPS masih ${Math.round(accuracy!)} m. Pindah ke area terbuka dan coba lagi.` }, { status: 422 });
    }

    const distance = distanceInMeters(latitude!, longitude!);
    if (distance + accuracy! > RADIUS_METERS) {
      return Response.json({ error: "Anda berada di luar radius presensi 20 meter dari titik rumah." }, { status: 403 });
    }

    const { date, time } = jakartaDateTime(new Date());
    const db = getFirebaseAdminDb();
    const ref = db.collection("attendance").doc(`${user.uid}_${date}`);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.data();
      if (type === "in" && current?.check_in) throw new Error("ALREADY_CHECKED_IN");
      if (type === "out" && !current?.check_in) throw new Error("CHECK_IN_REQUIRED");
      if (type === "out" && current?.check_out) throw new Error("ALREADY_CHECKED_OUT");
      transaction.set(ref, {
        user_id: user.uid,
        date,
        [type === "in" ? "check_in" : "check_out"]: time,
        [`location_${type}`]: {
          accuracy_m: accuracy,
          distance_from_home_m: Math.round(distance * 10) / 10,
        },
      }, { merge: true });
    });
    return Response.json({ ok: true, date, time, distance: Math.round(distance * 10) / 10 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ALREADY_CHECKED_IN") return Response.json({ error: "Presensi masuk hari ini sudah tercatat." }, { status: 409 });
    if (message === "ALREADY_CHECKED_OUT") return Response.json({ error: "Presensi pulang hari ini sudah tercatat." }, { status: 409 });
    if (message === "CHECK_IN_REQUIRED") return Response.json({ error: "Catat presensi masuk sebelum presensi pulang." }, { status: 409 });
    if (message.includes("Firebase Admin")) return Response.json({ error: "Firebase Admin belum dikonfigurasi di server." }, { status: 500 });
    console.error("[attendance]", error);
    const code = (error as { code?: string }).code;
    return Response.json({ error: "Gagal menyimpan presensi." }, { status: code?.startsWith("auth/") ? 401 : 500 });
  }
}
