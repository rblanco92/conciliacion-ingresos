"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Ingreso, MovimientoBanco } from "@/lib/tipos";

export default function PosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [movSel, setMovSel] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    // Ingresos POS aun sin conciliar
    const { data: ing } = await supabase
      .from("ingresos")
      .select("*")
      .eq("banco", "pos")
      .in("estado", ["pendiente", "excepcion"])
      .order("fecha_pago", { ascending: false });
    setIngresos((ing as Ingreso[]) ?? []);

    // Movimientos del banco libres (posibles lotes)
    const { data: mov } = await supabase
      .from("movimientos_banco")
      .select("*")
      .eq("conciliado", false)
      .gt("ingreso", 0)
      .order("fecha", { ascending: false });
    setMovimientos((mov as MovimientoBanco[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function toggle(id: string) {
    setOk("");
    setError("");
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  const suma = ingresos
    .filter((i) => seleccion.has(i.id))
    .reduce((s, i) => s + Number(i.monto_original), 0);

  const mov = movimientos.find((m) => m.id === movSel);
  const montoLote = mov ? Number(mov.ingreso) : 0;
  const diferencia = montoLote - suma;
  const cuadra = mov != null && Math.abs(diferencia) < 0.005 && seleccion.size > 0;

  async function conciliar() {
    setError("");
    setOk("");
    setGuardando(true);
    const res = await fetch("/api/conciliar-pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingreso_ids: Array.from(seleccion),
        movimiento_id: movSel,
      }),
    });
    setGuardando(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo conciliar.");
      return;
    }
    setOk(`Lote conciliado: ${seleccion.size} ingresos por Bs ${fmt(suma)}.`);
    setSeleccion(new Set());
    setMovSel("");
    cargar();
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Lotes de punto de venta</h1>
      <div className="mt-1 h-[3px] w-56 bg-tg-orange opacity-30" />
      <p className="mt-4 max-w-3xl text-sm text-neutral-600">
        El banco no muestra las transacciones POS una por una: deposita el{" "}
        <b>lote consolidado</b>, y suele caer días después. Selecciona los
        ingresos que componen el lote, elige el movimiento del banco, y concilia.
        La suma debe cuadrar exacto.
      </p>

      {/* Panel de conciliación */}
      <div className="sticky top-2 z-10 mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[280px] flex-1">
            <label className="tg-label">Movimiento del banco (lote)</label>
            <select
              className="tg-input"
              value={movSel}
              onChange={(e) => {
                setMovSel(e.target.value);
                setOk("");
                setError("");
              }}
            >
              <option value="">Selecciona el lote del banco...</option>
              {movimientos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fecha} · Ref {m.referencia ?? "s/ref"} · Bs{" "}
                  {fmt(Number(m.ingreso))}
                  {m.descripcion ? ` · ${m.descripcion.slice(0, 40)}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2">
            <div className="text-xs font-bold text-neutral-500">
              Seleccionado ({seleccion.size})
            </div>
            <div className="font-display text-xl">Bs {fmt(suma)}</div>
          </div>

          {mov && (
            <div
              className={
                "rounded-lg border px-4 py-2 " +
                (cuadra
                  ? "border-ok/40 bg-ok/10"
                  : "border-warn/40 bg-warn/10")
              }
            >
              <div className="text-xs font-bold text-neutral-500">
                {cuadra ? "Cuadra ✓" : "Diferencia"}
              </div>
              <div
                className={
                  "font-display text-xl " + (cuadra ? "text-ok" : "text-warn")
                }
              >
                {cuadra ? `Bs ${fmt(montoLote)}` : `Bs ${fmt(diferencia)}`}
              </div>
            </div>
          )}

          <button
            onClick={conciliar}
            disabled={!cuadra || guardando}
            className="rounded-lg bg-tg-orange px-6 py-2.5 font-bold text-tg-black disabled:opacity-40"
          >
            {guardando ? "Conciliando..." : "Conciliar lote"}
          </button>
        </div>

        {mov && !cuadra && seleccion.size > 0 && (
          <p className="mt-2 text-xs font-bold text-warn">
            {diferencia > 0
              ? `Faltan Bs ${fmt(diferencia)} por seleccionar para completar el lote.`
              : `Te pasaste por Bs ${fmt(Math.abs(diferencia))}. Quita algún ingreso.`}
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-err/30 bg-err/10 px-3 py-2 text-sm text-err">
            {error}
          </div>
        )}
        {ok && (
          <div className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
            {ok}
          </div>
        )}
      </div>

      {/* Lista de ingresos POS */}
      <h2 className="mt-8 font-display text-2xl">
        Ingresos POS sin conciliar{" "}
        <span className="font-body text-base font-normal text-neutral-500">
          — {ingresos.length}
        </span>
      </h2>

      {cargando && <p className="mt-3 text-neutral-400">Cargando...</p>}

      {!cargando && ingresos.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-400">
          No hay ingresos de punto de venta pendientes.
        </div>
      )}

      <div className="mt-3 space-y-2">
        {ingresos.map((i) => {
          const sel = seleccion.has(i.id);
          return (
            <label
              key={i.id}
              className={
                "flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition " +
                (sel
                  ? "border-tg-orange bg-tg-orange/5"
                  : "border-neutral-200 bg-white hover:border-neutral-300")
              }
            >
              <input
                type="checkbox"
                checked={sel}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 accent-[#F27730]"
              />
              <div className="flex-1">
                <div className="text-sm">
                  <b>{i.cliente_nombre}</b> · {i.cotizacion} ·{" "}
                  <span className="text-neutral-600">{i.detalle}</span>
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  Lote: <b className="font-mono">{i.referencia}</b> ·{" "}
                  {i.fecha_pago}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">Bs {fmt(Number(i.monto_original))}</div>
                {i.monto_usd != null && (
                  <div className="text-xs text-neutral-400">
                    ${fmt(Number(i.monto_usd))}
                  </div>
                )}
              </div>
            </label>
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
