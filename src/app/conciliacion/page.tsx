"use client";

import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { normalizarBanco } from "@/lib/normalizar";
import { ESTADO_LABEL, type Ingreso, type MovimientoBanco } from "@/lib/tipos";

interface Resultado {
  insertados: number;
  conciliados: number;
  excepciones: number;
}

export default function ConciliacionPage() {
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");

  const [excepciones, setExcepciones] = useState<Ingreso[]>([]);
  const [movLibres, setMovLibres] = useState<MovimientoBanco[]>([]);
  const [stats, setStats] = useState({ total: 0, conciliados: 0, excepciones: 0, usd: 0 });

  const refrescar = useCallback(async () => {
    const { data: exc } = await supabase
      .from("ingresos")
      .select("*")
      .eq("estado", "excepcion")
      .order("fecha_pago", { ascending: false });
    setExcepciones((exc as Ingreso[]) ?? []);

    const { data: mov } = await supabase
      .from("movimientos_banco")
      .select("*")
      .eq("conciliado", false)
      .gt("ingreso", 0)
      .order("fecha", { ascending: false });
    setMovLibres((mov as MovimientoBanco[]) ?? []);

    // Stats del conjunto
    const { data: todos } = await supabase.from("ingresos").select("estado, monto_usd");
    if (todos) {
      const conc = todos.filter((i) => i.estado === "conciliado");
      setStats({
        total: todos.length,
        conciliados: conc.length,
        excepciones: todos.filter((i) => i.estado === "excepcion").length,
        usd: conc.reduce((s, i) => s + (Number(i.monto_usd) || 0), 0),
      });
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResultado(null);
    setSubiendo(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Leer como filas crudas (header:1) para poder detectar el formato del
      // banco por posición de columna (el BNC trae cabeceras y una fila de
      // totales que hay que saltar).
      const filasCrudas = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: "",
      });
      const movimientos = normalizarBanco(filasCrudas);

      if (movimientos.length === 0) {
        throw new Error(
          "No se encontraron movimientos en el archivo. Revisa que sea el export del banco con columnas de Fecha, Referencia y montos."
        );
      }

      const res = await fetch("/api/conciliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movimientos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al conciliar.");

      setResultado(data);
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el archivo.");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  async function resolver(
    accion: "conciliar" | "rechazar",
    ingreso_id: string,
    movimiento_id?: string
  ) {
    const res = await fetch("/api/ingresos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, ingreso_id, movimiento_id }),
    });
    if (res.ok) refrescar();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Conciliación</h1>
          <div className="mt-1 h-[3px] w-56 bg-tg-orange opacity-30" />
        </div>
        <label className="cursor-pointer rounded-lg bg-tg-black px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-125">
          <span className="text-tg-orange">⬆</span>{" "}
          {subiendo ? "Procesando…" : "Subir estado de cuenta (.xlsx)"}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onArchivo}
            disabled={subiendo}
          />
        </label>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-neutral-600">
        Sube el Excel del banco. El sistema cruza cada movimiento contra los
        ingresos reportados por referencia (y por monto+fecha si la referencia no
        casa). Solo revisas lo que no cuadró.
      </p>

      {resultado && (
        <div className="mt-4 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm">
          Se procesaron <b>{resultado.insertados}</b> movimientos:{" "}
          <b className="text-ok">{resultado.conciliados} conciliados</b> automáticamente
          y <b className="text-warn">{resultado.excepciones} en excepción</b> para revisar.
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-err/30 bg-err/10 px-4 py-3 text-sm text-err">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ingresos" val={stats.total} />
        <Stat label="Conciliados" val={stats.conciliados} tone="ok" />
        <Stat label="Excepciones" val={stats.excepciones} tone="warn" />
        <Stat label="Total confirmado" val={`$${fmt(stats.usd)}`} />
      </div>

      {/* Cola de excepciones */}
      <h2 className="mt-8 font-display text-2xl">
        Excepciones{" "}
        <span className="text-base font-body font-normal text-neutral-500">
          — {excepciones.length} por revisar
        </span>
      </h2>

      {excepciones.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-400">
          No hay excepciones pendientes. Todo lo reportado quedó conciliado.
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {excepciones.map((ing) => (
            <FilaExcepcion
              key={ing.id}
              ingreso={ing}
              movimientos={movLibres}
              onResolver={resolver}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaExcepcion({
  ingreso,
  movimientos,
  onResolver,
}: {
  ingreso: Ingreso;
  movimientos: MovimientoBanco[];
  onResolver: (a: "conciliar" | "rechazar", id: string, movId?: string) => void;
}) {
  const [movSel, setMovSel] = useState("");

  // Sugerir movimientos del mismo monto o fecha
  const sugeridos = movimientos.filter(
    (m) => m.ingreso === ingreso.monto_original || m.fecha === ingreso.fecha_pago
  );
  const lista = sugeridos.length > 0 ? sugeridos : movimientos.slice(0, 20);

  return (
    <div className="rounded-xl border border-warn/40 bg-[#fffaf0] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-warn/20 px-2 py-0.5 text-xs font-bold text-[#b9852b]">
              {ESTADO_LABEL[ingreso.estado]}
            </span>
            <span className="font-mono text-sm font-bold tracking-wide">
              Ref: {ingreso.referencia}
            </span>
          </div>
          <div className="mt-1.5 text-sm">
            <b>{ingreso.cliente_nombre}</b> · {ingreso.cotizacion} ·{" "}
            <span className="text-neutral-600">{ingreso.detalle}</span>
          </div>
          <div className="mt-1 text-sm text-neutral-600">
            {ingreso.moneda === "USD"
              ? `$${fmt(ingreso.monto_original)}`
              : `Bs ${fmt(ingreso.monto_original)}${
                  ingreso.monto_usd ? ` ($${fmt(ingreso.monto_usd)})` : ""
                }`}{" "}
            · {ingreso.banco} · {ingreso.fecha_pago}
          </div>
          {ingreso.motivo_excepcion && (
            <div className="mt-2 rounded-md bg-warn/15 px-2.5 py-1.5 text-xs font-bold text-[#8a6420]">
              ⚠ {ingreso.motivo_excepcion}
            </div>
          )}
        </div>
        {ingreso.comprobante_url && (
          <a
            href={ingreso.comprobante_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-tg-orange hover:underline"
          >
            Ver comprobante ↗
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-warn/20 pt-3">
        <select
          className="rounded-lg border-[1.5px] border-neutral-300 bg-white px-3 py-2 text-sm"
          value={movSel}
          onChange={(e) => setMovSel(e.target.value)}
        >
          <option value="">Ligar a un movimiento del banco…</option>
          {lista.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fecha} · {m.referencia ?? "s/ref"} · {fmt(m.ingreso)} · {m.banco}
            </option>
          ))}
        </select>
        <button
          onClick={() => onResolver("conciliar", ingreso.id, movSel || undefined)}
          className="rounded-lg bg-ok px-4 py-2 text-sm font-bold text-white"
        >
          {movSel ? "Conciliar con este" : "Aprobar sin movimiento"}
        </button>
        <button
          onClick={() => onResolver("rechazar", ingreso.id)}
          className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-bold text-neutral-700"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  val,
  tone,
}: {
  label: string;
  val: string | number;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-tg-black";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className={`mt-0.5 font-display text-3xl ${color}`}>{val}</div>
    </div>
  );
}

function fmt(n: number) {
  return Number(n).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
