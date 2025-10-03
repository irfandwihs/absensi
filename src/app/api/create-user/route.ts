import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[create-user] request body:", JSON.stringify(body));
    const { email, password, full_name, role, jabatan, unit_kerja } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[create-user] SUPABASE config missing", {
        supabaseUrl,
        serviceRoleKey: !!serviceRoleKey,
      });
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Try to create the auth user. If the user already exists in Auth,
    // attempt to locate that existing auth user and reuse its id.
    let userId: string | undefined;

    const { data: createdUser, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      } as unknown as Record<string, unknown>);

    if (createErr) {
      console.warn(
        "[create-user] create user error (will try to locate existing auth user):",
        createErr?.message || createErr
      );

      // Attempt to locate an existing auth user with this email
      try {
        const { data: listData, error: listErr } =
          await admin.auth.admin.listUsers();
        if (listErr) {
          console.error("[create-user] listUsers error:", listErr);
          return NextResponse.json(
            { error: createErr.message || createErr },
            { status: 500 }
          );
        }

        // listData shape may be { users: [...] } depending on supabase-js version
        type AuthUser = {
          id?: string;
          email?: string;
          user?: { id?: string; email?: string };
        };
        let usersArray: AuthUser[] = [];
        if (listData && typeof listData === "object") {
          // try common shapes
          const maybe = listData as { users?: unknown };
          if (Array.isArray(maybe.users)) {
            usersArray = maybe.users as AuthUser[];
          } else if (
            listData &&
            typeof (listData as unknown as { length?: number }).length ===
              "number"
          ) {
            usersArray = listData as unknown as AuthUser[];
          }
        }
        const found = usersArray.find(
          (u: AuthUser) => (u.email || u.user?.email) === email
        );
        if (found) {
          userId = found.id || found.user?.id;
          console.log("[create-user] found existing auth user, id=", userId);
        } else {
          // Couldn't find an existing auth user; return original create error
          console.error(
            "[create-user] create failed and no existing auth user found:",
            createErr
          );
          return NextResponse.json(
            { error: createErr.message || createErr },
            { status: 500 }
          );
        }
      } catch (listEx) {
        console.error(
          "[create-user] unexpected error while locating existing auth user:",
          listEx
        );
        return NextResponse.json(
          { error: createErr.message || String(listEx) },
          { status: 500 }
        );
      }
    } else {
      userId = createdUser?.user?.id;
    }

    // Insert or update record into users table (handle existing user rows)
    const upsertPayload: Record<string, unknown> = {
      id: userId,
      email,
      full_name,
      role: role || "user",
    };
    if (jabatan) upsertPayload.jabatan = jabatan;
    if (unit_kerja) upsertPayload.unit_kerja = unit_kerja;
    const { error: upsertErr } = await admin
      .from("users")
      .upsert([upsertPayload], { onConflict: "email" });

    if (upsertErr) {
      console.error("[create-user] upsert error:", upsertErr);
      return NextResponse.json(
        { error: upsertErr.message || upsertErr },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[create-user] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
