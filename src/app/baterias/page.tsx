"use client";

import { useMemo, useState } from "react";
import { BATERIAS, type AplicacionBateria } from "@/lib/baterias";
import { POSITIVE } from "@/lib/positive";
import { buscarInventario } from "@/lib/inventario";

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

// Quita el rango de años y paréntesis de un nombre de modelo Positive.
// Ej: "HILUX 4CIL 99-14" -> "HILUX 4CIL"; "AVEO (TODOS)" -> "AVEO"
function limpiarModeloPositive(s: string): string {
  return norm(s)
    .replace(/\d{2,4}\s*-\s*\d{2,4}/g, "") // rangos 99-14
    .replace(/\([^)]*\)/g, "") // (TODOS), (2 BATERIAS)
    .replace(/\b\d{2}\b(?!\w)/g, "") // años sueltos de 2 dígitos
    .replace(/\s+/g, " ")
    .trim();
}

// Compara un modelo Duncan (ya individual) contra un modelo Positive.
// Coincide si uno contiene al otro como PALABRA COMPLETA (no subcadena suelta),
// o si el nombre base coincide. Estricto para evitar falsos positivos.
function modeloCoincide(modeloDuncan: string, modelosPositive: string): boolean {
  const dN = norm(modeloDuncan)
    .replace(/\([^)]*\)/g, "")
    .replace(/\d{2,4}\s*-\s*\d{2,4}/g, "")
    .trim();
  if (!dN) return false;

  // Separar los modelos de Positive en items individuales (por coma)
  const items = modelosPositive.split(",").map((x) => limpiarModeloPositive(x));

  for (const item of items) {
    if (!item) continue;
    // Coincidencia exacta del nombre completo
    if (item === dN) return true;
    // El modelo Duncan aparece como secuencia de palabras completas dentro del item
    // Ej: Duncan "HILUX 4 CIL" vs Positive "HILUX 4CIL" -> normalizar sin espacios internos
    const dCompact = dN.replace(/\s+/g, "");
    const iCompact = item.replace(/\s+/g, "");
    if (dCompact === iCompact) return true;
    // El item Positive empieza con el modelo Duncan como palabra (ej "COROLLA" vs "COROLLA CROSS" NO debe casar)
    // Solo casar si son iguales tras compactar, o si uno es prefijo palabra-completa del otro
    const dWords = dN.split(" ");
    const iWords = item.split(" ");
    // Igualdad de la primera palabra Y misma longitud de palabras clave
    if (dWords[0] === iWords[0] && dWords.length === 1 && iWords.length === 1) {
      return true;
    }
  }
  return false;
}

// Busca en el catálogo Positive las baterías que aplican a un modelo Duncan individual.
function positiveParaVehiculo(marca: string, modelo: string) {
  const marcaN = norm(marca);
  const resultado: {
    codigo: string;
    caja: string;
    capacidad: string;
    borne: string;
  }[] = [];
  const yaAgregado = new Set<string>();

  for (const bat of POSITIVE) {
    for (const app of bat.aplicaciones) {
      if (norm(app.marca) !== marcaN) continue;
      if (modeloCoincide(modelo, app.modelos) && !yaAgregado.has(bat.codigo)) {
        resultado.push({
          codigo: bat.codigo,
          caja: bat.caja,
          capacidad: bat.capacidad,
          borne: bat.borne,
        });
        yaAgregado.add(bat.codigo);
      }
    }
  }
  return resultado;
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

  const [copiado, setCopiado] = useState(false);

  // Arma las líneas de una marca (Positive o Duncan) para el mensaje al cliente.
  // Trae precio sin IVA desde el inventario. NO muestra disponibilidad: eso lo
  // ve solo el vendedor en la herramienta, no el cliente.
  function lineasMarca(
    marcaInv: "DUNCAN" | "POSITIVE",
    codigos: string[]
  ): string[] {
    const lineas: string[] = [];
    const vistos = new Set<string>();
    for (const cod of codigos) {
      const inv = buscarInventario(marcaInv, cod);
      const clave = cod;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      if (inv && inv.sin_iva > 0) {
        lineas.push(`• ${cod} — $${inv.sin_iva.toFixed(2)}`);
      } else {
        lineas.push(`• ${cod} — consultar precio`);
      }
    }
    return lineas;
  }

  function armarMensaje(): string {
    if (!seleccion) return "";
    const veh = `${seleccion.marca} ${seleccion.modelo}`.trim();

    // Positive primero
    const codsPositive = positive.map((p) => p.codigo);
    const lineasPos = lineasMarca("POSITIVE", codsPositive);

    // Duncan después
    const codsDuncan = seleccion.grupo.concat(seleccion.cp ? [seleccion.cp] : []);
    const lineasDun = lineasMarca("DUNCAN", codsDuncan);

    let msg = `🔋 *Baterías disponibles para ${veh}*\n\n`;

    if (lineasPos.length) {
      msg += `*POSITIVE*\n${lineasPos.join("\n")}\n\n`;
    }
    if (lineasDun.length) {
      msg += `*DUNCAN*\n${lineasDun.join("\n")}\n\n`;
    }
    msg += `_Precios en USD y no incluyen IVA (16%)._\n`;
    msg += `_Todos nuestros precios son a tasa BCV._\n`;
    msg += `_Escríbenos para confirmar. TuGruero_`;
    return msg;
  }

  async function copiarMensaje() {
    const msg = armarMensaje();
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = msg;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

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
              <div className="mt-3 space-y-2">
                {seleccion.grupo.map((g, i) => {
                  const inv = buscarInventario("DUNCAN", g);
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-tg-orange/25 bg-tg-orange/5 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg text-tg-black">
                          {g}
                        </span>
                        {inv && inv.sin_iva > 0 && (
                          <span className="font-display text-lg text-tg-black">
                            ${inv.sin_iva.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <PrecioStock inv={inv} />
                    </div>
                  );
                })}
                {seleccion.cp && (
                  <div className="rounded-xl border border-tg-orange/25 bg-tg-orange/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-base text-tg-black">
                        {seleccion.cp}{" "}
                        <span className="text-xs font-normal text-neutral-500">
                          (opción CP)
                        </span>
                      </span>
                      {(() => {
                        const inv = buscarInventario("DUNCAN", seleccion.cp!);
                        return inv && inv.sin_iva > 0 ? (
                          <span className="font-display text-base text-tg-black">
                            ${inv.sin_iva.toFixed(2)}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <PrecioStock inv={buscarInventario("DUNCAN", seleccion.cp)} />
                  </div>
                )}
              </div>
            </div>

            {/* POSITIVE */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#e11d1d] px-2 py-0.5 text-xs font-extrabold text-white">
                  POSITIVE
                </span>
              </div>
              {positive.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {positive.map((p, i) => {
                    const inv = buscarInventario("POSITIVE", p.codigo);
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-[#e11d1d]/25 bg-[#e11d1d]/5 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg text-[#c81717]">
                            {p.codigo}
                          </span>
                          {inv && inv.sin_iva > 0 && (
                            <span className="font-display text-lg text-[#c81717]">
                              ${inv.sin_iva.toFixed(2)}
                            </span>
                          )}
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
                        <PrecioStock inv={inv} />
                      </div>
                    );
                  })}
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

          {/* Botón copiar mensaje */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copiarMensaje}
              className="rounded-lg bg-tg-orange px-6 py-2.5 font-bold text-tg-black"
            >
              {copiado ? "✓ Mensaje copiado" : "Copiar mensaje para el cliente"}
            </button>
            <span className="text-xs text-neutral-500">
              Positive primero, luego Duncan. Precios sin IVA.
            </span>
          </div>

          {/* Aviso de stock */}
          <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-xs font-bold text-[#8a6420]">
            ⚠ Confirma el stock real antes de prometer al cliente. Las
            cantidades mostradas son del último inventario cargado y pueden haber
            cambiado.
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

// Muestra stock y precio con IVA (pequeño) debajo del código de batería.
function PrecioStock({
  inv,
}: {
  inv: { sin_iva: number; con_iva: number; cantidad: number } | null;
}) {
  if (!inv || inv.sin_iva <= 0) {
    return (
      <div className="mt-1 text-xs text-neutral-400">
        Sin precio en el inventario — consultar.
      </div>
    );
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
      <span>Con IVA: ${inv.con_iva.toFixed(2)}</span>
      <span
        className={
          inv.cantidad > 0 ? "font-bold text-ok" : "font-bold text-neutral-400"
        }
      >
        {inv.cantidad > 0 ? `Disp: ${inv.cantidad}` : "Sin stock — consultar"}
      </span>
    </div>
  );
}
