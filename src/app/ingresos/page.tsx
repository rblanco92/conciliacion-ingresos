"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ESTADO_LABEL,
  etiquetaCanal,
  etiquetaBanco,
  type Ingreso,
  type EstadoIngreso,
} from "@/lib/tipos";

// "por_facturar" no es un estado real: es conciliados con facturado=false
type Filtro = EstadoIngreso | "todos" | "por_facturar";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "por_facturar", label: "Por facturar" },
  { value: "conciliado", label: "Conciliados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "pendiente_tasa", label: "Sin tasa" },
  { value: "excepcion", label: "Excepciones" },
  { value: "rechazado", label: "Rechazados" },
];

const COLOR_ESTADO: Record<EstadoIngreso, string> = {
  conciliado: "bg-ok/15 text-ok",
  pendiente: "bg-neutral-200 text-neutral-600",
  pendiente_tasa: "bg-warn/15 text-[#b9852b]",
  excepcion: "bg-warn/15 text-[#b9852b]",
  rechazado: "bg-err/15 text-err",
};

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    let q = supabase.from("ingresos").select("*").order("creado_en", {
      ascending: false,
    });

    if (filtro === "por_facturar") {
      // Conciliados que aun no se han facturado en TuuLapp
      q = q.eq("estado", "conciliado").eq("facturado", false);
    } else if (filtro !== "todos") {
      q = q.eq("estado", filtro);
    }

    const { data } = await q;
    const lista = (data as Ingreso[]) ?? [];
    setIngresos(lista);

    const ids = [...new Set(lista.map((i) => i.vendedor).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre")
        .in("id", ids);
      const map: Record<string, string> = {};
      (perfiles ?? []).forEach((p) => (map[p.id] = p.nombre ?? ""));
      setNombres(map);
    }
    setCargando(false);
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function marcarFacturado(ing: Ingreso, valor: boolean) {
    setError("");
    setGuardando(ing.id);
    // Actualizacion optimista
    setIngresos((prev) =>
      prev.map((x) => (x.id === ing.id ? { ...x, facturado: valor } : x))
    );
    const res = await fetch("/api/facturar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingreso_id: ing.id, facturado: valor }),
    });
    setGuardando(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "No se pudo actualizar.");
      cargar(); // revertir
      return;
    }
    // Si estamos en "por facturar", al marcar debe salir de la lista
    if (filtro === "por_facturar" && valor) {
      setIngresos((prev) => prev.filter((x) => x.id !== ing.id));
    }
  }

  const totalUsd = ingresos
    .filter((i) => i.estado === "conciliado")
    .reduce((s, i) => s + (Number(i.monto_usd) || 0), 0);

  const porFacturar = ingresos.filter(
    (i) => i.estado === "conciliado" && !i.facturado
  ).length;

  return (
    <div>
      <h1 className="font-display text-3xl">Ingresos reportados</h1>
      <div className="mt-1 h-[3px] w-48 bg-tg-orange opacity-30" />
      <p className="mt-4 max-w-2xl text-sm text-neutral-600">
        Todos los ingresos que reportan los vendedores, con su estado. Marca{" "}
        <b>Facturado</b> cuando ya emitiste la factura en TuuLapp (solo se puede
        en los conciliados).
      </p>

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={
              "rounded-full border-[1.5px] px-4 py-1.5 text-sm font-bold transition " +
              (filtro === f.value
                ? "border-tg-black bg-tg-black text-white"
                : f.value === "por_facturar"
                ? "border-tg-orange bg-tg-orange/10 text-tg-orange hover:bg-tg-orange/20"
                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="mt-5 flex flex-wrap gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <div className="font-display text-2xl">{ingresos.length}</div>
          <div className="text-xs font-bold text-neutral-500">
            {filtro === "todos"
              ? "Ingresos"
              : filtro === "por_facturar"
              ? "Por facturar"
              : ESTADO_LABEL[filtro as EstadoIngreso]}
          </div>
        </div>
        <div className="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3">
          <div className="font-display text-2xl text-ok">${fmt(totalUsd)}</div>
          <div className="text-xs font-bold text-neutral-500">
            Confirmado (en vista)
          </div>
        </div>
        {filtro === "todos" && porFacturar > 0 && (
          <div className="rounded-xl border border-tg-orange/30 bg-tg-orange/5 px-4 py-3">
            <div className="font-display text-2xl text-tg-orange">{porFacturar}</div>
            <div className="text-xs font-bold text-neutral-500">
              Falta facturar
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-err/30 bg-err/10 px-4 py-3 text-sm text-err">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <Th>Estado</Th>
              <Th>Facturado</Th>
              <Th>Fecha</Th>
              <Th>Referencia</Th>
              <Th>Cliente</Th>
              <Th>Cotización</Th>
              <Th>Monto</Th>
              <Th>Canal</Th>
              <Th>Método</Th>
              <Th>Vendedor</Th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-neutral-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && ingresos.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-neutral-400">
                  {filtro === "por_facturar"
                    ? "No hay ingresos pendientes por facturar."
                    : "No hay ingresos en este filtro."}
                </td>
              </tr>
            )}
            {ingresos.map((i) => {
              const puedeFacturar = i.estado === "conciliado";
              return (
                <tr key={i.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-bold " +
                        COLOR_ESTADO[i.estado]
                      }
                    >
                      {ESTADO_LABEL[i.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {puedeFacturar ? (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={i.facturado}
                          disabled={guardando === i.id}
                          onChange={(e) => marcarFacturado(i, e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-[#F27730]"
                        />
                        <span
                          className={
                            "text-xs font-bold " +
                            (i.facturado ? "text-ok" : "text-neutral-400")
                          }
                        >
                          {i.facturado ? "Sí" : "No"}
                        </span>
                      </label>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-600">
                    {i.fecha_pago}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{i.referencia}</td>
                  <td className="px-4 py-2.5">{i.cliente_nombre}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{i.cotizacion}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {i.moneda === "USD"
                      ? `$${fmt(i.monto_original)}`
                      : `Bs ${fmt(i.monto_original)}`}
                    {i.monto_usd != null && i.moneda === "VES" && (
                      <span className="text-neutral-400"> (${fmt(i.monto_usd)})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-600">
                      {etiquetaCanal(i.canal)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {etiquetaBanco(i.banco)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {i.vendedor ? nombres[i.vendedor] ?? "—" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
      {children}
    </th>
  );
}

function fmt(n: number) {
  return Number(n).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
