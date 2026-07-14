import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSesion } from "@/lib/auth-server";

// Crear un usuario nuevo (solo admin). Asigna correo, clave y rol.
export async function POST(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { email, clave, nombre, rol } = await req.json();
    if (!email || !clave || !rol) {
      return NextResponse.json(
        { error: "Faltan datos (correo, clave, rol)." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    // Crear usuario ya confirmado (sin verificación de correo para el piloto)
    const { data, error } = await db.auth.admin.createUser({
      email: email.trim(),
      password: clave,
      email_confirm: true,
      user_metadata: { nombre: nombre?.trim() || email, rol },
    });
    if (error) throw new Error(error.message);

    // Asegurar el perfil con el rol correcto (el trigger crea vendedor por defecto)
    if (data.user) {
      await db
        .from("perfiles")
        .upsert({ id: data.user.id, nombre: nombre?.trim() || email, rol });
    }

    return NextResponse.json({ ok: true, id: data.user?.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// Listar usuarios (solo admin)
export async function GET() {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from("perfiles")
    .select("id, nombre, rol, creado_en")
    .order("creado_en", { ascending: false });
  return NextResponse.json({ usuarios: data ?? [] });
}

// Cambiar el rol de un usuario (solo admin)
export async function PATCH(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id, rol } = await req.json();
  const db = supabaseAdmin();
  const { error } = await db.from("perfiles").update({ rol }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
