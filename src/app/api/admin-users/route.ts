import { authErrorResponse, getFirebaseAdminAuth, getFirebaseAdminDb, requireAdmin } from "../../lib/firebaseAdmin";

function statusFor(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await getFirebaseAdminDb().collection("users").get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return Response.json({ users });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { email, password, full_name, jabatan, unit_kerja, role } = body;
    if (!email || !password || !full_name) return Response.json({ error: "Nama, email, dan kata sandi wajib diisi." }, { status: 400 });
    if (role && !["user", "admin"].includes(role)) return Response.json({ error: "Role tidak valid." }, { status: 400 });

    const auth = getFirebaseAdminAuth();
    const user = await auth.createUser({ email, password, displayName: full_name });
    try {
      await getFirebaseAdminDb().collection("users").doc(user.uid).set({
        email, full_name, jabatan: jabatan || "", unit_kerja: unit_kerja || "", role: role || "user",
      });
    } catch (error) {
      await auth.deleteUser(user.uid);
      throw error;
    }
    return Response.json({ ok: true, id: user.uid });
  } catch (error) {
    const status = statusFor(error);
    if (status !== 401 && status !== 403) console.error("[admin-users][POST]", error);
    return Response.json({ error: status === 401 ? "Silakan login." : status === 403 ? "Akses admin diperlukan." : error instanceof Error ? error.message : "Gagal menambahkan pengguna." }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const { id, email, full_name, jabatan, unit_kerja, role } = body;
    if (!id) return Response.json({ error: "ID pengguna wajib diisi." }, { status: 400 });
    if (role && !["user", "admin"].includes(role)) return Response.json({ error: "Role tidak valid." }, { status: 400 });
    if (id === admin.uid && role !== "admin") return Response.json({ error: "Role admin sendiri tidak dapat dihapus." }, { status: 400 });

    const auth = getFirebaseAdminAuth();
    const update: { email?: string; displayName?: string } = {};
    if (email) update.email = email;
    if (full_name) update.displayName = full_name;
    if (Object.keys(update).length) await auth.updateUser(id, update);
    await getFirebaseAdminDb().collection("users").doc(id).set({ email, full_name, jabatan, unit_kerja, role }, { merge: true });
    return Response.json({ ok: true });
  } catch (error) {
    const status = statusFor(error);
    if (status !== 401 && status !== 403) console.error("[admin-users][PUT]", error);
    return Response.json({ error: status === 401 ? "Silakan login." : status === 403 ? "Akses admin diperlukan." : error instanceof Error ? error.message : "Gagal menyimpan pengguna." }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await request.json();
    if (!id) return Response.json({ error: "ID pengguna wajib diisi." }, { status: 400 });
    if (id === admin.uid) return Response.json({ error: "Akun admin yang sedang digunakan tidak dapat dihapus." }, { status: 400 });
    const auth = getFirebaseAdminAuth();
    const db = getFirebaseAdminDb();
    await auth.deleteUser(id);
    await db.collection("users").doc(id).delete();
    const attendance = await db.collection("attendance").where("user_id", "==", id).get();
    for (let offset = 0; offset < attendance.docs.length; offset += 400) {
      const batch = db.batch();
      attendance.docs.slice(offset, offset + 400).forEach((record) => batch.delete(record.ref));
      await batch.commit();
    }
    return Response.json({ ok: true });
  } catch (error) {
    const status = statusFor(error);
    if (status !== 401 && status !== 403) console.error("[admin-users][DELETE]", error);
    return Response.json({ error: status === 401 ? "Silakan login." : status === 403 ? "Akses admin diperlukan." : error instanceof Error ? error.message : "Gagal menghapus pengguna." }, { status });
  }
}
