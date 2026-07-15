"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface FilaLibro {
  fecha: string;
  referencia: string;
  descripcion_banco: string;
  ingreso: number;
  egreso: number;
  saldo: number | null;
  tasa_de_cambio: number | null;
  valor_usd: number | null;
  tipo_de_tx: string;
  partida: string;
  subpartida: string;
  codigo: string;
  descripcion: string;
  pago_movil: string | null;
}

const COLUMNAS: { key: keyof FilaLibro; label: string }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "referencia", label: "Referencia" },
  { key: "descripcion_banco", label: "Descripcion Banco" },
  { key: "ingreso", label: "Ingreso" },
  { key: "egreso", label: "Egreso" },
  { key: "saldo", label: "Saldo" },
  { key: "tasa_de_cambio", label: "Tasa de cambio" },
  { key: "valor_usd", label: "Valor USD" },
  { key: "tipo_de_tx", label: "Tipo de tx" },
  { key: "partida", label: "Partida" },
  { key: "subpartida", label: "Subpartida" },
  { key: "codigo", label: "Codigo" },
  { key: "descripcion", label: "Descripcion" },
  { key: "pago_movil", label: "Pago movil" },
];

export default function LibroPage() {
  const [fecha, setFecha] = useState(hoy());
  const [filas, setFilas] = useState<FilaLibro[]>([]);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setCopiado(false);
    const { data } = await supabase
      .from("libro_contable")
      .select("*")
      .eq("fecha", fecha);
    setFilas((data as FilaLibro[]) ?? []);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function celda(fila: FilaLibro, key: keyof FilaLibro): string {
    const v = fila[key];
    if (v == null) return "";
    if (typeof v === "number") {
      return v.toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(v);
  }

  function generarTSV(): string {
    return filas
      .map((f) => COLUMNAS.map((c) => celda(f, c.key)).join("\t"))
      .join("\n");
  }

  async function copiar() {
    const tsv = generarTSV();
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = tsv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }

  const totalUsd = filas.reduce((s, f) => s + (Number(f.valor_usd) || 0), 0);

  return (
    <div>
      <h1 className="font-display text-3xl">Libro contable</h1>
      <div className="mt-1 h-[3px] w-44 bg-tg-orange opacity-30" />
      <p className="mt-4 max-w-2xl text-sm text-neutral-600">
        Ingresos conciliados del dia, listos para pegar en la hoja de Google.
        Elige la fecha, revisa las filas y usa <b>Copiar</b>: se pegan en el
        mismo orden de columnas de tu hoja (el saldo lo calcula tu formula).
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="tg-label">Fecha</label>
          <input
            type="date"
            className="tg-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <button
          onClick={copiar}
          disabled={filas.length === 0}
          className="rounded-lg bg-tg-orange px-6 py-2.5 font-bold text-tg-black disabled:opacity-50"
        >
          {copiado
            ? "\u2713 Copiado"
            : `Copiar ${filas.length} fila${filas.length === 1 ? "" : "s"}`}
        </button>
        {filas.length > 0 && (
          <div className="text-sm text-neutral-500">
            Total del dia: <b className="text-ok">${fmt(totalUsd)}</b>
          </div>
        )}
      </div>

      {copiado && (
        <div className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          Filas copiadas. Ve a tu hoja de Google, selecciona la primera celda
          libre y pega (Ctrl+V).
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[1100px] text-xs">
          <thead className="bg-neutral-50">
            <tr>
              {COLUMNAS.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-3 py-2 text-left font-extrabold uppercase tracking-wide text-neutral-500"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-neutral-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && filas.length === 0 && (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-neutral-400">
                  No hay ingresos conciliados en esta fecha.
                </td>
              </tr>
            )}
            {filas.map((f, idx) => (
              <tr key={idx} className="border-t border-neutral-100">
                {COLUMNAS.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-3 py-2 text-neutral-700">
                    {celda(f, c.key) || <span className="text-neutral-300">-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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

function hoy() {
  return new Date().toISOString().slice(0, 10);
}
