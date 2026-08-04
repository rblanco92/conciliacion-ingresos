"use client";

import { useMemo, useState } from "react";
import { BATERIAS, type AplicacionBateria } from "@/lib/baterias";

const CATEGORIAS: { value: AplicacionBateria["categoria"]; label: string }[] = [
  { value: "auto", label: "Automóviles" },
  { value: "camion", label: "Camiones" },
  { value: "autobus", label: "Autobuses" },
];

export default function BateriasPage() {
  const [categoria, setCategoria] =
    useState<AplicacionBateria["categoria"]>("auto");
  const [marca, setMarca] = useState("");
  const [modeloIdx, setModeloIdx] = useState<number | null>(null);

  // Marcas disponibles en la categoría elegida
  const marcas = useMemo(() => {
    const set = new Set(
      BATERIAS.filter((b) => b.categoria === categoria).map((b) => b.marca)
    );
    return Array.from(set).sort();
  }, [categoria]);

  // Modelos de la marca elegida
  const modelos = useMemo(() => {
    if (!marca) return [];
    return BATERIAS.filter(
      (b) => b.categoria === categoria && b.marca === marca
    );
  }, [categoria, marca]);

  const seleccion = modeloIdx != null ? modelos[modeloIdx] : null;

  function cambiarCategoria(c: AplicacionBateria["categoria"]) {
    setCategoria(c);
    setMarca("");
    setModeloIdx(null);
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Consultor de baterías</h1>
      <div className="mt-1 h-[3px] w-52 bg-tg-orange opacity-30" />
      <p className="mt-4 max-w-2xl text-sm text-neutral-600">
        Elige el tipo de vehículo, la marca y el modelo para ver qué batería
        Duncan aplica.
      </p>

      {/* Categoría */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => cambiarCategoria(c.value)}
            className={
              "rounded-full border-[1.5px] px-4 py-1.5 text-sm font-bold transition " +
              (categoria === c.value
                ? "border-tg-black bg-tg-black text-white"
                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400")
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Selectores marca / modelo */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="tg-label">Marca</label>
          <select
            className="tg-input"
            value={marca}
            onChange={(e) => {
              setMarca(e.target.value);
              setModeloIdx(null);
            }}
          >
            <option value="">Selecciona la marca...</option>
            {marcas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="tg-label">Modelo</label>
          <select
            className="tg-input"
            value={modeloIdx ?? ""}
            onChange={(e) =>
              setModeloIdx(e.target.value === "" ? null : Number(e.target.value))
            }
            disabled={!marca}
          >
            <option value="">
              {marca ? "Selecciona el modelo..." : "Primero elige la marca"}
            </option>
            {modelos.map((m, i) => (
              <option key={i} value={i}>
                {m.modelo}
                {m.anio_desde
                  ? ` (${m.anio_desde}${m.anio_hasta ? "-" + m.anio_hasta : " en adelante"})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resultado */}
      {seleccion && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-tg-orange/30 bg-white shadow-sm">
          <div className="bg-tg-black px-5 py-3">
            <div className="font-display text-xl text-white">
              {seleccion.marca} · {seleccion.modelo}
            </div>
            <div className="text-xs text-neutral-400">
              {seleccion.anio_desde
                ? `Años ${seleccion.anio_desde}${
                    seleccion.anio_hasta ? " - " + seleccion.anio_hasta : " en adelante"
                  }`
                : "Todos los años"}
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
              Batería recomendada
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {seleccion.grupo.map((g, i) => (
                <span
                  key={i}
                  className="rounded-xl bg-tg-orange px-4 py-2 font-display text-lg text-tg-black"
                >
                  {g}
                </span>
              ))}
            </div>

            {seleccion.cp && (
              <div className="mt-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                  Opción CP
                </div>
                <span className="mt-2 inline-block rounded-xl border-[1.5px] border-tg-orange px-4 py-2 font-display text-lg text-tg-orange">
                  {seleccion.cp}
                </span>
              </div>
            )}

            {seleccion.grupo.length > 1 && (
              <p className="mt-4 text-xs text-neutral-500">
                Hay más de una opción compatible. Confirma con el tamaño físico y
                la posición de bornes del vehículo.
              </p>
            )}
          </div>
        </div>
      )}

      {marca && modelos.length === 0 && (
        <p className="mt-6 text-neutral-400">
          No hay modelos registrados para esta marca.
        </p>
      )}
    </div>
  );
}
