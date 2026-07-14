// ============================================================================
// Normalizador de exports bancarios.
// Convierte el archivo que descarga la admin a la estructura comun que el
// motor de conciliacion entiende.
//
// Soporta:
//  * BNC (formato real: encabezados en fila ~15, columnas por posicion,
//    Debe/Haber, fila de Totales al final, referencia con .0).
//  * Generico: archivos con encabezados por nombre (Fecha, Referencia,
//    Ingreso/Haber, Egreso/Debe, Saldo).
//
// La deteccion es automatica: si encuentra la firma del BNC, usa ese parser;
// si no, cae al generico.
// ============================================================================

export interface MovimientoNormalizado {
  fecha: string; // YYYY-MM-DD
  referencia: string | null;
  descripcion: string | null;
  ingreso: number;
  egreso: number;
  saldo: number | null;
}

type Fila = unknown[];

// --------------------------------------------------------------------------
// Utilidades de formato
// --------------------------------------------------------------------------

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function numDirecto(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fechaISO(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? "20" + y : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function limpiarRef(v: unknown): string | null {
  if (v == null || v === "") return null;
  let s = String(v).trim();
  s = s.replace(/\.0+$/, "");
  if (!s || s === "0") return null;
  return s;
}

function norm(s: string): string {
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --------------------------------------------------------------------------
// Parser BNC (detección dinámica de columnas por encabezado)
// --------------------------------------------------------------------------
// El BNC exporta distintos reportes (estado de cuenta mensual, últimas 25,
// etc.) y las columnas caen en POSICIONES DISTINTAS según el reporte. Por eso
// NO fijamos posiciones: buscamos la fila de encabezados (la que tiene Fecha,
// Referencia y Haber) y de ahí leemos el índice real de cada columna.
// Estructura común: Fecha, Descripción, Referencia, Debe (egreso),
// Haber (ingreso), Saldo. La última fila suele ser "Totales" y se descarta.

interface MapaBNC {
  fila: number;
  fecha: number;
  desc: number;
  ref: number;
  debe: number;
  haber: number;
  saldo: number;
}

function detectarBNC(rows: Fila[]): MapaBNC | null {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const r = rows[i] || [];
    const idx: Record<string, number> = {};
    r.forEach((c, ci) => {
      const n = norm(String(c ?? ""));
      if (n && idx[n] === undefined) idx[n] = ci;
    });
    // Firma del BNC: tiene Fecha, Referencia y Haber en la misma fila
    if (idx["fecha"] != null && idx["referencia"] != null && idx["haber"] != null) {
      return {
        fila: i,
        fecha: idx["fecha"],
        desc: idx["descripcion"] ?? -1,
        ref: idx["referencia"],
        debe: idx["debe"] ?? -1,
        haber: idx["haber"],
        saldo: idx["saldo"] ?? -1,
      };
    }
  }
  return null;
}

function cel(r: Fila, i: number): unknown {
  return i >= 0 ? r[i] : undefined;
}

function parseBNC(rows: Fila[], m: MapaBNC): MovimientoNormalizado[] {
  const out: MovimientoNormalizado[] = [];
  for (let i = m.fila + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const celdaFecha = String(cel(r, m.fecha) ?? "").trim();
    if (norm(celdaFecha) === "totales") break;
    if (!celdaFecha) continue;
    const fecha = fechaISO(cel(r, m.fecha));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    out.push({
      fecha,
      referencia: limpiarRef(cel(r, m.ref)),
      descripcion: String(cel(r, m.desc) ?? "").trim() || null,
      ingreso: numDirecto(cel(r, m.haber)),
      egreso: numDirecto(cel(r, m.debe)),
      saldo: cel(r, m.saldo) != null ? numDirecto(cel(r, m.saldo)) : null,
    });
  }
  return out;
}

// --------------------------------------------------------------------------
// Parser generico (por nombre de columna)
// --------------------------------------------------------------------------

function col(fila: Record<string, unknown>, nombres: string[]): unknown {
  const keys = Object.keys(fila);
  for (const n of nombres) {
    const key = keys.find((k) => norm(k) === norm(n) || norm(k).includes(norm(n)));
    if (key) return fila[key];
  }
  return undefined;
}

function parseGenerico(filas: Record<string, unknown>[]): MovimientoNormalizado[] {
  const out: MovimientoNormalizado[] = [];
  for (const fila of filas) {
    const f = fechaISO(col(fila, ["fecha"]));
    if (!f) continue;
    const ref = limpiarRef(col(fila, ["referencia", "ref"]));
    const desc = col(fila, ["descripcion", "concepto", "detalle"]);
    const ing = num(col(fila, ["ingreso", "haber", "credito", "abono"]));
    const egr = num(col(fila, ["egreso", "debe", "debito", "cargo"]));
    const sal = col(fila, ["saldo"]);
    if (ref === null && ing === 0 && egr === 0) continue;
    out.push({
      fecha: f,
      referencia: ref,
      descripcion: desc != null ? String(desc).trim() : null,
      ingreso: ing,
      egreso: egr,
      saldo: sal != null ? num(sal) : null,
    });
  }
  return out;
}

// --------------------------------------------------------------------------
// Punto de entrada
// --------------------------------------------------------------------------

export function normalizarBanco(rowsCrudas: Fila[]): MovimientoNormalizado[] {
  // 1) Intentar BNC (detección dinámica de columnas por encabezado)
  const mapa = detectarBNC(rowsCrudas);
  if (mapa) {
    return parseBNC(rowsCrudas, mapa);
  }
  // 2) Genérico: reconstruir objetos usando la primera fila no vacía como header
  let headerIdx = rowsCrudas.findIndex(
    (r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim())
  );
  if (headerIdx < 0) headerIdx = 0;
  const headers = (rowsCrudas[headerIdx] || []).map((h) => String(h ?? "").trim());
  const objetos: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < rowsCrudas.length; i++) {
    const r = rowsCrudas[i] || [];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = r[idx];
    });
    objetos.push(obj);
  }
  return parseGenerico(objetos);
}

// Compatibilidad con el import anterior.
export function normalizarFilas(
  filas: Record<string, unknown>[]
): MovimientoNormalizado[] {
  return parseGenerico(filas);
}
