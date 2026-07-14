import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSesion } from "@/lib/auth-server";
import { randomUUID } from "crypto";

// Recibe las filas ya parseadas del Excel (desde el cliente con SheetJS),
// las inserta como movimientos_banco de un lote, y corre el motor de conciliación.
export async function POST(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const { movimientos, banco } = await req.json();

    if (!Array.isArray(movimientos) || movimientos.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron movimientos." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const lote = randomUUID();

    const filas = movimientos.map((m: Record<string, unknown>) => ({
      banco: (m.banco as string) || banco || "desconocido",
      fecha: m.fecha as string,
      referencia: m.referencia ? String(m.referencia).trim() : null,
      descripcion: (m.descripcion as string) ?? null,
      ingreso: Number(m.ingreso) || 0,
      egreso: Number(m.egreso) || 0,
      saldo: m.saldo != null ? Number(m.saldo) : null,
      tipo_tx: Number(m.ingreso) > 0 ? "INGRESO" : "EGRESO",
      lote_carga: lote,
    }));

    const { error: insErr } = await db.from("movimientos_banco").insert(filas);
    if (insErr) throw new Error(insErr.message);

    // Correr el motor de conciliación sobre este lote
    const { data, error: rpcErr } = await db.rpc("conciliar_lote", {
      p_lote: lote,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    const res = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      lote,
      insertados: filas.length,
      conciliados: res?.conciliados ?? 0,
      excepciones: res?.excepciones ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
