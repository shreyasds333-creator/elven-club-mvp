import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? "https://eaexrykltegvxnvxrmok.supabase.co";

export async function POST(req: NextRequest) {
  if (!svcKey) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 503 });
  }

  const adminSupabase = createClient(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    let userId: string | undefined = body.userId;

    // If only email provided, look up the user ID
    if (!userId && body.email) {
      const { data, error } = await adminSupabase.auth.admin.listUsers();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const match = data.users.find(u => u.email === body.email);
      if (!match) return NextResponse.json({ error: "User not found" }, { status: 404 });
      userId = match.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
