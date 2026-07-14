"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Tasa {
  fecha: string;
  tasa_bcv: number;
  creado_por: string | null;
}

export default function TasasPage() {
  const [fecha, setFecha] = useState(hoy());
  const [tasa, setTasa] = useState("");
  const [historial, setHistorial] = useState<Tasa[]>([]);
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [pendientes, setPendientes] = useState<number>(0);

  async function cargar() {
    const { data } = await supabase
      .from("tasas_cambio")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(30);
    setHistorial(data ?? []);

    const { count } = await supabase
      .from("ingresos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente_tasa");
    setPendientes(count ?? 0);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar() {
    setMsg("");
    if (!tasa || Number(tasa) <= 0) {
      setMsg("Ingresa una tasa válida.");
      return;
    }
    setGuardando(true);
    const { error } = await supabase
      .from("tasas_cambio")
      .upsert({ fecha, tasa_bcv: Number(tasa), creado_por: "admin" });
    setGuardando(false);
    if (error) {
      setMsg("Error: " + error.message);
      return;
    }
    setMsg(
      `Tasa de ${fecha} guardada. Los ingresos en bolívares de ese día se convirtieron a $.`
    );
    setTasa("");
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Tasas BCV</h1>
      <div className="mt-1 h-[3px] w-full max-w-xs bg-tg-orange opacity-30" />
      <p className="mt-4 text-sm text-neutral-600">
        La tasa oficial del día convierte los ingresos en bolívares a dólares. Se
        aplica según la fecha del pago, no la de hoy.
      </p>

      {pendientes > 0 && (
        <div className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          <b>{pendientes}</b> ingreso{pendientes === 1 ? "" : "s"} en bolívares
          {pendientes === 1 ? " está" : " están"} esperando la tasa de su día para
          poder convertirse.
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-neutral-200 bg-white p-5">
        <div>
          <label className="tg-label">Fecha</label>
          <input
            type="date"
            className="tg-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <div>
          <label className="tg-label">Tasa BCV (Bs por 1 $)</label>
          <input
            type="number"
            inputMode="decimal"
            className="tg-input"
            placeholder="554,43"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
          />
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-tg-orange px-6 py-2.5 font-bold text-tg-black disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar tasa"}
        </button>
      </div>

      {msg && (
        <div className="mt-3 rounded-lg bg-ok/10 px-4 py-3 text-sm text-ok">{msg}</div>
      )}

      <h2 className="mt-8 font-display text-xl">Tasas cargadas</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <Th>Fecha</Th>
              <Th>Tasa BCV</Th>
              <Th>Cargada por</Th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-400">
                  Aún no hay tasas cargadas.
                </td>
              </tr>
            )}
            {historial.map((t) => (
              <tr key={t.fecha} className="border-t border-neutral-100">
                <td className="px-4 py-2.5">{t.fecha}</td>
                <td className="px-4 py-2.5 font-bold">{fmt(t.tasa_bcv)}</td>
                <td className="px-4 py-2.5 text-neutral-500">{t.creado_por ?? "—"}</td>
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
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2 });
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}
