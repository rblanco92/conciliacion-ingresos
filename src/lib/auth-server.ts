import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente de servidor que lee la sesión desde las cookies de la petición.
export function createServer() {
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // En Server Components puros el set puede fallar; el middleware lo cubre.
        }
      },
    },
  });
}

// Devuelve el usuario actual y su rol, o null si no hay sesión.
export async function getSesion() {
  const supabase = createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Leer el perfil con el cliente admin (service role) para que RLS no pueda
  // bloquear la lectura del rol. Es seguro: ya verificamos la identidad arriba.
  const admin = createClient(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: perfil } = await admin
    .from("perfiles")
    .select("rol, nombre")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: perfil?.nombre ?? user.email ?? "",
    rol: (perfil?.rol ?? "vendedor") as "vendedor" | "admin",
  };
}
