import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../../lib/firebaseAdmin";

function jakartaDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}:${value.second}` };
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
    const { type } = await request.json() as { type?: string };
    if (type !== "in" && type !== "out") return Response.json({ error: "Jenis presensi tidak valid." }, { status: 400 });

    const { date, time } = jakartaDateTime(new Date());
    const ref = getFirebaseAdminDb().collection("attendance").doc(`${user.uid}_${date}`);
    await getFirebaseAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.data();
      if (type === "in" && current?.check_in) throw new Error("ALREADY_CHECKED_IN");
      if (type === "out" && current?.check_out) throw new Error("ALREADY_CHECKED_OUT");
      transaction.set(ref, {
        user_id: user.uid,
        date,
        [type === "in" ? "check_in" : "check_out"]: time,
      }, { merge: true });
    });
    return Response.json({ ok: true, date, time });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ALREADY_CHECKED_IN") return Response.json({ error: "Presensi masuk hari ini sudah tercatat." }, { status: 409 });
    if (message === "ALREADY_CHECKED_OUT") return Response.json({ error: "Presensi pulang hari ini sudah tercatat." }, { status: 409 });
    if (message.includes("Firebase Admin")) return Response.json({ error: "Firebase Admin belum dikonfigurasi di server." }, { status: 500 });
    console.error("[attendance]", error);
    return Response.json({ error: "Gagal menyimpan presensi." }, { status: message.includes("auth/") ? 401 : 500 });
  }
}
