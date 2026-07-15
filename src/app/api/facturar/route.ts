import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSesion } from "@/lib/auth-server";

// Marca / desmarca un ingreso como facturado en TuuLapp.
// Regla: solo se puede facturar un ingreso CONCILIADO (validado tambien en la
// base de datos por el trigger validar_facturado).
export async function POST(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { ingreso_id, facturado } = await req.json();
    if (!ingreso_id) {
      return NextResponse.json({ error: "Falta el ingreso." }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Verificar que este conciliado antes de marcar
    if (facturado === true) {
      const { data: ing } = await db
        .from("ingresos")
        .select("estado")
        .eq("id", ingreso_id)
        .single();
      if (!ing || ing.estado !== "conciliado") {
        return NextResponse.json(
          { error: "Solo se puede facturar un ingreso conciliado." },
          { status: 400 }
        );
      }
    }

    const { error } = await db
      .from("ingresos")
      .update({ facturado: !!facturado })
      .eq("id", ingreso_id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, facturado: !!facturado });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
