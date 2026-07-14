"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Ingreso, EstadoIngreso } from "@/lib/tipos";

// Traducción de estado interno -> estado de despacho para el vendedor.
function estadoDespacho(estado: EstadoIngreso): {
  texto: string;
  detalle: string;
  tono: "ok" | "espera" | "no";
} {
  switch (estado) {
    case "conciliado":
      return {
        texto: "Confirmado",
        detalle: "El pago cayó en el banco. Puedes despachar.",
        tono: "ok",
      };
    case "rechazado":
      return {
        texto: "Rechazado",
        detalle: "El pago no se pudo validar. No despachar.",
        tono: "no",
      };
    default:
      // pendiente, pendiente_tasa, excepcion
      return {
        texto: "En revisión",
        detalle: "Aún no se confirma el pago. Espera antes de despachar.",
        tono: "espera",
      };
  }
}

export default function MisIngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from("ingresos")
      .select("*")
      .eq("vendedor", userData.user.id)
      .order("creado_en", { ascending: false });
    setIngresos((data as Ingreso[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const confirmados = ingresos.filter((i) => i.estado === "conciliado").length;
  const enRevision = ingresos.filter(
    (i) => !["conciliado", "rechazado"].includes(i.estado)
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Mis ingresos</h1>
          <div className="mt-1 h-[3px] w-40 bg-tg-orange opacity-30" />
        </div>
        <Link
          href="/nuevo"
          className="rounded-lg bg-tg-orange px-5 py-2.5 text-sm font-bold text-tg-black"
        >
          + Reportar ingreso
        </Link>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-neutral-600">
        Aquí ves el estado de los pagos que reportaste. Solo puedes despachar
        cuando un ingreso está <b className="text-ok">Confirmado</b>.
      </p>

      {!cargando && ingresos.length > 0 && (
        <div className="mt-5 flex gap-3">
          <div className="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3">
            <div className="font-display text-2xl text-ok">{confirmados}</div>
            <div className="text-xs font-bold text-neutral-500">
              Confirmados · listos
            </div>
          </div>
          <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3">
            <div className="font-display text-2xl text-warn">{enRevision}</div>
            <div className="text-xs font-bold text-neutral-500">En revisión</div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {cargando && <p className="text-neutral-400">Cargando…</p>}

        {!cargando && ingresos.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-400">
            Todavía no has reportado ingresos.{" "}
            <Link href="/nuevo" className="font-bold text-tg-orange">
              Reporta el primero →
            </Link>
          </div>
        )}

        {ingresos.map((ing) => {
          const d = estadoDespacho(ing.estado);
          const color =
            d.tono === "ok"
              ? "border-ok/40 bg-ok/5"
              : d.tono === "no"
              ? "border-err/40 bg-err/5"
              : "border-warn/40 bg-warn/5";
          const badge =
            d.tono === "ok"
              ? "bg-ok text-white"
              : d.tono === "no"
              ? "bg-err text-white"
              : "bg-warn text-white";
          return (
            <div
              key={ing.id}
              className={"rounded-xl border p-4 " + color}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-bold " + badge
                      }
                    >
                      {d.texto}
                    </span>
                    <span className="text-sm font-bold">{ing.cotizacion}</span>
                  </div>
                  <div className="mt-1.5 text-sm">
                    <b>{ing.cliente_nombre}</b> ·{" "}
                    <span className="text-neutral-600">{ing.detalle}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-neutral-500">
                    {ing.moneda === "USD"
                      ? `$${fmt(ing.monto_original)}`
                      : `Bs ${fmt(ing.monto_original)}`}{" "}
                    · {etiquetaBanco(ing.banco)} · {ing.fecha_pago} · Ref:{" "}
                    {ing.referencia}
                  </div>
                </div>
              </div>
              <p className="mt-2 border-t border-black/5 pt-2 text-xs text-neutral-500">
                {d.detalle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
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
