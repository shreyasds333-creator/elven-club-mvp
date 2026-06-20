import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://eaexrykltegvxnvxrmok.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZXhyeWtsdGVndnhudnhybW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjk0NjYsImV4cCI6MjA5NDg0NTQ2Nn0.6mb9jGBan3v8tm-GEoNn9YWK1HoY97My_TsAeMp1gc0";

console.log('SUPABASE URL:', supabaseUrl);
console.log('SUPABASE KEY first 20 chars:', supabaseKey?.slice(0, 20));

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
});
