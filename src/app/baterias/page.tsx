"use client";

import { useMemo, useState } from "react";
import { BATERIAS, type AplicacionBateria } from "@/lib/baterias";
import { POSITIVE } from "@/lib/positive";

const CATEGORIAS: { value: AplicacionBateria["categoria"]; label: string }[] = [
  { value: "auto", label: "Automóviles" },
  { value: "camion", label: "Camiones" },
  { value: "autobus", label: "Autobuses" },
];

// Normaliza texto para comparar (sin acentos, mayúsculas, espacios)
function norm(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extrae "palabras clave" de un nombre de modelo Duncan para buscar en Positive.
// Ej: "206 / 207 / 306 / 307 / 407" -> ["206","207","306","307","407"]
//     "ALTIMA / MÁXIMA / MURANO" -> ["ALTIMA","MAXIMA","MURANO"]
function tokensModelo(modelo: string): string[] {
  return norm(modelo)
    .split(/[/,]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

// Busca en el catálogo Positive las baterías que aplican a una marca+modelo.
function positiveParaVehiculo(marca: string, modelo: string) {
  const marcaN = norm(marca);
  const tokens = tokensModelo(modelo);
  // Además de los tokens completos, extraer la "palabra base" de cada token
  // (la primera palabra significativa), para tolerar variaciones como
  // "HILUX 4 CIL" (Duncan) vs "HILUX 4CIL" (Positive).
  const palabrasBase = tokens
    .map((t) => t.split(" ")[0])
    .filter((w) => w.length >= 3);

  const resultado: {
    codigo: string;
    caja: string;
    capacidad: string;
    borne: string;
    modelosTexto: string;
  }[] = [];
  const yaAgregado = new Set<string>();

  for (const bat of POSITIVE) {
    for (const app of bat.aplicaciones) {
      if (norm(app.marca) !== marcaN) continue;
      const modelosN = norm(app.modelos);
      // Coincide si algún token completo aparece, o si alguna palabra base
      // (nombre del modelo, ej "HILUX") aparece en la lista de Positive.
      const coincide =
        tokens.some((tok) => modelosN.includes(tok)) ||
        palabrasBase.some((w) => {
          // Buscar la palabra como término delimitado (evita falsos positivos)
          const re = new RegExp(`(^|[^A-Z0-9])${escapeReg(w)}([^A-Z0-9]|$)`);
          return re.test(modelosN);
        });
      if (coincide && !yaAgregado.has(bat.codigo)) {
        resultado.push({
          codigo: bat.codigo,
          caja: bat.caja,
          capacidad: bat.capacidad,
          borne: bat.borne,
          modelosTexto: app.modelos,
        });
        yaAgregado.add(bat.codigo);
      }
    }
  }
  return resultado;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function BateriasPage() {
  const [categoria, setCategoria] =
    useState<AplicacionBateria["categoria"]>("auto");
  const [marca, setMarca] = useState("");
  const [modeloIdx, setModeloIdx] = useState<number | null>(null);

  const marcas = useMemo(() => {
    const set = new Set(
      BATERIAS.filter((b) => b.categoria === categoria).map((b) => b.marca)
    );
    return Array.from(set).sort();
  }, [categoria]);

  const modelos = useMemo(() => {
    if (!marca) return [];
    return BATERIAS.filter(
      (b) => b.categoria === categoria && b.marca === marca
    );
  }, [categoria, marca]);

  const seleccion = modeloIdx != null ? modelos[modeloIdx] : null;

  const positive = useMemo(() => {
    if (!seleccion) return [];
    return positiveParaVehiculo(seleccion.marca, seleccion.modelo);
  }, [seleccion]);

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
        Elige el tipo de vehículo, la marca y el modelo para ver qué baterías
        aplican, tanto <b>Duncan</b> como <b>Positive</b>.
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

      {/* Selectores */}
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
        <div className="mt-6 space-y-4">
          <div className="rounded-t-2xl bg-tg-black px-5 py-3">
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

          <div className="grid gap-4 md:grid-cols-2">
            {/* DUNCAN */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-tg-orange px-2 py-0.5 text-xs font-extrabold text-tg-black">
                  DUNCAN
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
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
                <div className="mt-3">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                    Opción CP:{" "}
                  </span>
                  <span className="font-display text-base text-tg-orange">
                    {seleccion.cp}
                  </span>
                </div>
              )}
            </div>

            {/* POSITIVE */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#e11d1d] px-2 py-0.5 text-xs font-extrabold text-white">
                  POSITIVE
                </span>
              </div>
              {positive.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {positive.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[#e11d1d]/25 bg-[#e11d1d]/5 p-3"
                    >
                      <div className="font-display text-lg text-[#c81717]">
                        {p.codigo}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                        <span>
                          <b>Caja:</b> {p.caja}
                        </span>
                        <span>
                          <b>Capacidad:</b> {p.capacidad}
                        </span>
                        <span>
                          <b>Borne:</b> {p.borne}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-400">
                  No hay equivalente Positive registrado para este modelo.
                  Verifica en el catálogo Positive por si el modelo aparece con
                  otro nombre.
                </p>
              )}
            </div>
          </div>

          {seleccion.grupo.length > 1 && (
            <p className="text-xs text-neutral-500">
              Hay más de una opción compatible. Confirma con el tamaño físico y
              la posición de bornes del vehículo.
            </p>
          )}
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
