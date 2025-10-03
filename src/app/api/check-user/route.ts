import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email)
      return NextResponse.json({ error: "missing email" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "server not configured" },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // check users table
    const { data: userRow, error: usersErr } = await admin
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (usersErr) console.error("[check-user] users table error:", usersErr);

    // check auth users via listUsers and find by email
    const { data: listData, error: listErr } =
      await admin.auth.admin.listUsers();
    if (listErr) console.error("[check-user] listUsers error:", listErr);

    type AuthUser = { id?: string; email?: string } & Record<string, unknown>;
    let foundAuth: AuthUser | null = null;
    if (listData) {
      // listData may be { users: AuthUser[] } or AuthUser[]
      const maybeObj = listData as unknown;
      let usersArr: AuthUser[] = [];
      if (
        typeof maybeObj === "object" &&
        maybeObj !== null &&
        "users" in (maybeObj as Record<string, unknown>)
      ) {
        const cast = (maybeObj as Record<string, unknown>)["users"];
        if (Array.isArray(cast)) usersArr = cast as AuthUser[];
      } else if (Array.isArray(maybeObj)) {
        usersArr = maybeObj as AuthUser[];
      }
      foundAuth =
        usersArr.find((u) => {
          if (typeof u.email === "string" && u.email === email) return true;
          if (u && typeof u === "object" && "user" in u) {
            const nested = (u as Record<string, unknown>)["user"] as
              | Record<string, unknown>
              | undefined;
            if (
              nested &&
              typeof nested === "object" &&
              "email" in nested &&
              typeof nested["email"] === "string"
            ) {
              return nested["email"] === email;
            }
          }
          return false;
        }) || null;
    }

    return NextResponse.json({ ok: true, email, foundAuth, userRow });
  } catch (err) {
    console.error("[check-user] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
