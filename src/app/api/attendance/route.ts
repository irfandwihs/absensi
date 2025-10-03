import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[api/attendance] body:", body);
    const { user_id, type, time, date } = body as {
      user_id?: string;
      type?: "in" | "out";
      time?: string;
      date?: string;
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[api/attendance] SUPABASE config missing");
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (!user_id || !type || !time || !date) {
      return NextResponse.json(
        { error: "missing parameters" },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // check if today's row exists
    const { data: existing, error: selErr } = await admin
      .from("attendance")
      .select("*")
      .eq("user_id", user_id)
      .eq("date", date)
      .limit(1)
      .maybeSingle();
    if (selErr) {
      console.error("[api/attendance] select error:", selErr);
      return NextResponse.json(
        { error: selErr.message || String(selErr) },
        { status: 500 }
      );
    }

    if (!existing) {
      // insert new row
      const payload: Record<string, unknown> = { user_id, date };
      if (type === "in") payload.check_in = time;
      if (type === "out") payload.check_out = time;
      const { error: insErr } = await admin
        .from("attendance")
        .insert([payload]);
      if (insErr) {
        console.error("[api/attendance] insert error:", insErr);
        return NextResponse.json(
          { error: insErr.message || String(insErr) },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // update existing row
    const upd: Record<string, unknown> = {};
    if (type === "in") upd.check_in = time;
    if (type === "out") upd.check_out = time;
    const { error: updErr } = await admin
      .from("attendance")
      .update(upd)
      .eq("user_id", user_id)
      .eq("date", date);
    if (updErr) {
      console.error("[api/attendance] update error:", updErr);
      return NextResponse.json(
        { error: updErr.message || String(updErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/attendance] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
