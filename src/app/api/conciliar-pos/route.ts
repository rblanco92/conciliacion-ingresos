import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSesion } from "@/lib/auth-server";

// Asocia varios ingresos POS a UN movimiento de lote del banco.
// La suma de los ingresos debe cuadrar EXACTO con el monto del movimiento
// (lo valida la funcion conciliar_lote_pos en la base de datos).
export async function POST(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { ingreso_ids, movimiento_id } = await req.json();

    if (!Array.isArray(ingreso_ids) || ingreso_ids.length === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos un ingreso." },
        { status: 400 }
      );
    }
    if (!movimiento_id) {
      return NextResponse.json(
        { error: "Selecciona el movimiento del banco (lote)." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const { data, error } = await db.rpc("conciliar_lote_pos", {
      p_ingreso_ids: ingreso_ids,
      p_movimiento_id: movimiento_id,
      p_usuario: sesion.nombre || "admin",
    });

    if (error) throw new Error(error.message);

    const res = Array.isArray(data) ? data[0] : data;
    if (!res?.ok) {
      return NextResponse.json(
        { error: res?.mensaje ?? "No se pudo conciliar el lote." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: res.mensaje,
      suma: res.suma,
      monto_mov: res.monto_mov,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
