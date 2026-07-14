// ============================================================================
// Normalizador de exports bancarios.
// Cada banco exporta con columnas distintas. Aquí se mapea cada formato a la
// estructura común { fecha, referencia, descripcion, ingreso, egreso, saldo }.
// Para agregar un banco nuevo, se añade una entrada a MAPEOS.
// ============================================================================

export interface MovimientoNormalizado {
  fecha: string; // YYYY-MM-DD
  referencia: string | null;
  descripcion: string | null;
  ingreso: number;
  egreso: number;
  saldo: number | null;
}

type Fila = Record<string, unknown>;

// Busca una columna por posibles nombres (case-insensitive, sin acentos)
function col(fila: Fila, nombres: string[]): unknown {
  const keys = Object.keys(fila);
  for (const n of nombres) {
    const key = keys.find(
      (k) => norm(k) === norm(n) || norm(k).includes(norm(n))
    );
    if (key) return fila[key];
  }
  return undefined;
}

function norm(s: string): string {
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  // Formato venezolano: 9.425,24 -> 9425.24
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function fecha(v: unknown): string {
  if (v == null) return "";
  // Fecha serial de Excel
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // dd/mm/yyyy o d/m/yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? "20" + y : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd ya normalizado
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

// Mapeo genérico: sirve para la estructura del libro de la imagen (BNC Taller)
// y para exports estándar. Usa nombres de columna flexibles.
export function normalizarFilas(filas: Fila[]): MovimientoNormalizado[] {
  const out: MovimientoNormalizado[] = [];

  for (const fila of filas) {
    const f = fecha(col(fila, ["fecha"]));
    const ref = col(fila, ["referencia", "ref"]);
    const desc = col(fila, ["descripcion banco", "descripcion. banco", "descripcion", "concepto"]);
    const ing = num(col(fila, ["ingreso", "credito", "abono"]));
    const egr = num(col(fila, ["egreso", "debito", "cargo"]));
    const sal = col(fila, ["saldo"]);

    // Saltar filas sin fecha o de saldos iniciales
    if (!f) continue;
    const refStr = ref != null ? String(ref).trim() : null;
    if (refStr === "0" && ing === 0 && egr === 0) continue;

    out.push({
      fecha: f,
      referencia: refStr && refStr !== "0" ? refStr : null,
      descripcion: desc != null ? String(desc).trim() : null,
      ingreso: ing,
      egreso: egr,
      saldo: sal != null ? num(sal) : null,
    });
  }

  return out;
}
