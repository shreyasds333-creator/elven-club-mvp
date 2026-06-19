import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const url     = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://eaexrykltegvxnvxrmok.supabase.co";

export async function POST(req: NextRequest) {
  if (!svcKey) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 503 });
  }

  const adminSupabase = createClient(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { userId, coins, label } = await req.json();
    if (!userId || !coins) {
      return NextResponse.json({ error: "userId and coins required" }, { status: 400 });
    }

    // Read current coins
    const { data: state, error: readErr } = await adminSupabase
      .from("user_app_state")
      .select("coins")
      .eq("user_id", userId)
      .single();

    if (readErr || !state) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newCoins = (state.coins ?? 0) + coins;

    // Credit coins
    const { error: updateErr } = await adminSupabase
      .from("user_app_state")
      .update({ coins: newCoins, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Record transaction
    await adminSupabase.from("transactions").insert({
      user_id: userId,
      label:   label ?? `Bought ${coins} coins via UPI`,
      coins,
      is_debit: false,
      emoji:    "💰",
      category: "Bonus",
    });

    return NextResponse.json({ ok: true, newCoins });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
