import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSesion } from "@/lib/auth-server";

// Verifica si una referencia YA fue reportada (por cualquier vendedor).
// Privacidad: si el ingreso es de OTRO vendedor, NO se devuelven sus datos
// (cliente, monto, etc.), solo el aviso de que ya existe.
export async function GET(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const ref = req.nextUrl.searchParams.get("ref");
  if (!ref || ref.trim().length < 4) {
    return NextResponse.json({ existe: false });
  }

  // Normalizar igual que la base: sin espacios ni ceros a la izquierda
  const norm = ref.trim().replace(/\s/g, "").replace(/^0+/, "");
  if (!norm) return NextResponse.json({ existe: false });

  const db = supabaseAdmin();

  // Traer no rechazados y comparar normalizado
  const { data } = await db
    .from("ingresos")
    .select("id, referencia, vendedor, estado, cotizacion, cliente_nombre")
    .neq("estado", "rechazado");

  const encontrado = (data ?? []).find((i) => {
    const r = String(i.referencia ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(/^0+/, "");
    return r === norm;
  });

  if (!encontrado) {
    return NextResponse.json({ existe: false });
  }

  const esMio = encontrado.vendedor === sesion.id;

  return NextResponse.json({
    existe: true,
    es_mio: esMio,
    // Solo se revelan detalles si el ingreso es del propio vendedor o si es admin
    detalle:
      esMio || sesion.rol === "admin"
        ? {
            cotizacion: encontrado.cotizacion,
            cliente: encontrado.cliente_nombre,
            estado: encontrado.estado,
          }
        : null,
  });
}
