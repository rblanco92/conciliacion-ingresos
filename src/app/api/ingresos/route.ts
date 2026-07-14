import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSesion } from "@/lib/auth-server";

// Resuelve una excepción: liga un ingreso a un movimiento, lo aprueba sin
// movimiento, o lo rechaza.
export async function POST(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const { accion, ingreso_id, movimiento_id, usuario } = await req.json();
    const db = supabaseAdmin();

    if (accion === "rechazar") {
      const { error } = await db
        .from("ingresos")
        .update({ estado: "rechazado" })
        .eq("id", ingreso_id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, estado: "rechazado" });
    }

    // conciliar (con o sin movimiento)
    const { error } = await db.rpc("conciliar_manual", {
      p_ingreso_id: ingreso_id,
      p_movimiento_id: movimiento_id ?? null,
      p_usuario: usuario ?? "admin",
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, estado: "conciliado" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
