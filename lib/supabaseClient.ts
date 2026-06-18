import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: false,
  },
  // Disable realtime WebSocket — we only use REST + auth.
  // Without this, the client opens a wss:// connection on import
  // and logs "socket connection was closed unexpectedly" whenever
  // the project is paused or the network drops.
  realtime: {
    params: { eventsPerSecond: 0 },
  },
  global: {
    fetch: (url, options = {}) =>
      fetch(url, { ...options, signal: AbortSignal.timeout(10_000) }),
  },
});
