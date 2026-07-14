import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que solo puede ver un admin
const RUTAS_ADMIN = ["/conciliacion", "/tasas", "/usuarios"];
// Rutas públicas (no requieren sesión)
const RUTAS_PUBLICAS = ["/login", "/registro"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Dejar pasar assets y API (la API valida su propia sesión)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esPublica = RUTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  // Sin sesión y ruta protegida -> al login
  if (!user && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión, en ruta admin -> verificar rol
  if (user && RUTAS_ADMIN.some((r) => pathname.startsWith(r))) {
    // Usar el cliente admin (service role) para leer el rol sin que RLS bloquee.
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: perfil } = await adminClient
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfil?.rol !== "admin") {
      // Vendedor intentando entrar a admin -> lo mandamos a su formulario
      const url = req.nextUrl.clone();
      url.pathname = "/nuevo";
      return NextResponse.redirect(url);
    }
  }

  // Con sesión y en login -> al home
  if (user && esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
