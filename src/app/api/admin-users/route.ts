import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// GET: daftar user
export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, full_name, email, jabatan, unit_kerja, role");
    if (error) throw error;
    return NextResponse.json({ users: data || [] });
  } catch (err: any) {
    console.error("[admin-users][GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: tambah user baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, full_name, jabatan, unit_kerja, role, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Buat akun auth di supabase
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (authError) throw authError;

    // Simpan data tambahan ke tabel users
    const { error } = await admin.from("users").insert({
      id: authUser.user?.id,
      email,
      full_name,
      jabatan,
      unit_kerja,
      role,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin-users][POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT: update user
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, email, full_name, jabatan, unit_kerja, role } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = getAdminClient();
    const { error } = await admin
      .from("users")
      .update({ email, full_name, jabatan, unit_kerja, role })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin-users][PUT]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE: hapus user
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = getAdminClient();
    // hapus dari tabel users
    const { error } = await admin.from("users").delete().eq("id", id);
    if (error) throw error;

    // hapus dari auth
    await admin.auth.admin.deleteUser(id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin-users][DELETE]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
