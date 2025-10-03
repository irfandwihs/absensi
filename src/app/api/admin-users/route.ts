import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin
      .from("users")
      .select("id, full_name, email, jabatan, unit_kerja, role");
    if (error) {
      console.error("[admin-users] error:", error);
      return NextResponse.json(
        { error: error.message || error },
        { status: 500 }
      );
    }
    return NextResponse.json({ users: data || [] });
  } catch (err) {
    console.error("[admin-users] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }
    const body = await req.json();
    const { id, email, full_name, jabatan, unit_kerja, role } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin
      .from("users")
      .update({ email, full_name, jabatan, unit_kerja, role })
      .eq("id", id);
    if (error) {
      console.error("[admin-users][PUT] error:", error);
      return NextResponse.json(
        { error: error.message || error },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin-users][PUT] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }
    const body = await req.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin.from("users").delete().eq("id", id);
    if (error) {
      console.error("[admin-users][DELETE] error:", error);
      return NextResponse.json(
        { error: error.message || error },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin-users][DELETE] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
