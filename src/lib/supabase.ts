import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para el navegador (mantiene la sesión en cookies).
export function createBrowser() {
  return createBrowserClient(url, anonKey);
}

// Instancia lista para usar en componentes cliente.
export const supabase = createBrowser();

// Cliente admin (service role) para rutas API del servidor. Salta RLS.
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
