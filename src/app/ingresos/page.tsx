"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ESTADO_LABEL, type Ingreso, type EstadoIngreso } from "@/lib/tipos";

const FILTROS: { value: EstadoIngreso | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
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
  const [filtro, setFiltro] = useState<EstadoIngreso | "todos">("todos");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    let q = supabase.from("ingresos").select("*").order("creado_en", {
      ascending: false,
    });
    if (filtro !== "todos") q = q.eq("estado", filtro);
    const { data } = await q;
    const lista = (data as Ingreso[]) ?? [];
    setIngresos(lista);

    // Resolver nombres de vendedores (el campo vendedor es un user id)
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

  const totalUsd = ingresos
    .filter((i) => i.estado === "conciliado")
    .reduce((s, i) => s + (Number(i.monto_usd) || 0), 0);

  return (
    <div>
      <h1 className="font-display text-3xl">Ingresos reportados</h1>
      <div className="mt-1 h-[3px] w-48 bg-tg-orange opacity-30" />
      <p className="mt-4 max-w-2xl text-sm text-neutral-600">
        Todos los ingresos que reportan los vendedores, con su estado. Filtra por
        estado para revisar lo que necesites.
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
            {filtro === "todos" ? "Ingresos" : ESTADO_LABEL[filtro]}
          </div>
        </div>
        <div className="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3">
          <div className="font-display text-2xl text-ok">${fmt(totalUsd)}</div>
          <div className="text-xs font-bold text-neutral-500">
            Confirmado (en vista)
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th>Referencia</Th>
              <Th>Cliente</Th>
              <Th>Cotización</Th>
              <Th>Monto</Th>
              <Th>Método</Th>
              <Th>Vendedor</Th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!cargando && ingresos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                  No hay ingresos en este filtro.
                </td>
              </tr>
            )}
            {ingresos.map((i) => (
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
                <td className="px-4 py-2.5 text-neutral-600">{i.fecha_pago}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{i.referencia}</td>
                <td className="px-4 py-2.5">{i.cliente_nombre}</td>
                <td className="px-4 py-2.5 text-neutral-600">{i.cotizacion}</td>
                <td className="px-4 py-2.5">
                  {i.moneda === "USD"
                    ? `$${fmt(i.monto_original)}`
                    : `Bs ${fmt(i.monto_original)}`}
                  {i.monto_usd != null && i.moneda === "VES" && (
                    <span className="text-neutral-400"> (${fmt(i.monto_usd)})</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {etiquetaBanco(i.banco)}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {i.vendedor ? nombres[i.vendedor] ?? "—" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
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

function etiquetaBanco(b: string) {
  const map: Record<string, string> = {
    efectivo_usd: "Efectivo ($)",
    efectivo_bs: "Efectivo (Bs)",
    binance: "Binance",
    zelle: "Zelle",
    stripe: "Stripe",
    paypal: "PayPal",
    bnc: "BNC",
  };
  return map[b] ?? b;
}
