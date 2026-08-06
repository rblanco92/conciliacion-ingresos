// ============================================================================
// Inventario de baterías (precios y stock) — cargado desde TuuLapp.
// NOTA: es una foto del inventario al momento de cargar el Excel. Los precios
// y cantidades NO se actualizan solos; hay que recargar el Excel cuando cambien.
// Por eso el vendedor SIEMPRE debe confirmar stock antes de prometer.
// ============================================================================

export interface ItemInventario {
  marca: "DUNCAN" | "POSITIVE";
  codigo: string;      // ej "22-850", "24MR-1100"
  sin_iva: number;
  con_iva: number;
  cantidad: number;
}

export const INVENTARIO: ItemInventario[] = [
  { marca: "DUNCAN", codigo: "22-850", sin_iva: 119.92, con_iva: 139.11, cantidad: 3 },
  { marca: "DUNCAN", codigo: "22R-850", sin_iva: 119.92, con_iva: 139.11, cantidad: 5 },
  { marca: "DUNCAN", codigo: "24-1150", sin_iva: 165.96, con_iva: 192.51, cantidad: 0 },
  { marca: "DUNCAN", codigo: "24-1200", sin_iva: 165.96, con_iva: 192.51, cantidad: 0 },
  { marca: "DUNCAN", codigo: "24-900", sin_iva: 133.37, con_iva: 154.71, cantidad: 1 },
  { marca: "DUNCAN", codigo: "24-950", sin_iva: 133.37, con_iva: 154.71, cantidad: 0 },
  { marca: "DUNCAN", codigo: "24-NAV 1150", sin_iva: 248.94, con_iva: 288.77, cantidad: 0 },
  { marca: "DUNCAN", codigo: "24Q-1150", sin_iva: 260.9, con_iva: 302.64, cantidad: 0 },
  { marca: "DUNCAN", codigo: "24R-1150", sin_iva: 165.96, con_iva: 192.51, cantidad: 1 },
  { marca: "DUNCAN", codigo: "24R-1200", sin_iva: 165.96, con_iva: 192.51, cantidad: 0 },
  { marca: "DUNCAN", codigo: "24R-900", sin_iva: 133.37, con_iva: 154.71, cantidad: 3 },
  { marca: "DUNCAN", codigo: "24R-950", sin_iva: 133.37, con_iva: 154.71, cantidad: 0 },
  { marca: "DUNCAN", codigo: "27-1100", sin_iva: 164.47, con_iva: 190.79, cantidad: 0 },
  { marca: "DUNCAN", codigo: "27-1150", sin_iva: 164.47, con_iva: 190.79, cantidad: 0 },
  { marca: "DUNCAN", codigo: "27Q-1200", sin_iva: 276.24, con_iva: 320.44, cantidad: 0 },
  { marca: "DUNCAN", codigo: "27R-1100", sin_iva: 164.47, con_iva: 190.79, cantidad: 0 },
  { marca: "DUNCAN", codigo: "27R-1150", sin_iva: 164.47, con_iva: 190.79, cantidad: 0 },
  { marca: "DUNCAN", codigo: "30H-1250", sin_iva: 207.44, con_iva: 240.63, cantidad: 1 },
  { marca: "DUNCAN", codigo: "31-1250", sin_iva: 212.08, con_iva: 246.01, cantidad: 0 },
  { marca: "DUNCAN", codigo: "34-1000", sin_iva: 139.7, con_iva: 162.05, cantidad: 3 },
  { marca: "DUNCAN", codigo: "34R-1000", sin_iva: 139.7, con_iva: 162.05, cantidad: 3 },
  { marca: "DUNCAN", codigo: "36R-750", sin_iva: 104.21, con_iva: 120.88, cantidad: -1 },
  { marca: "DUNCAN", codigo: "42-850", sin_iva: 122.77, con_iva: 142.41, cantidad: 0 },
  { marca: "DUNCAN", codigo: "42R-850", sin_iva: 122.77, con_iva: 142.41, cantidad: 0 },
  { marca: "DUNCAN", codigo: "43-800", sin_iva: 122.25, con_iva: 141.81, cantidad: 1 },
  { marca: "DUNCAN", codigo: "43-950", sin_iva: 139.7, con_iva: 162.05, cantidad: 2 },
  { marca: "DUNCAN", codigo: "43R-800", sin_iva: 122.25, con_iva: 141.81, cantidad: 0 },
  { marca: "DUNCAN", codigo: "43R-950", sin_iva: 139.7, con_iva: 162.05, cantidad: 1 },
  { marca: "DUNCAN", codigo: "45-750", sin_iva: 113.38, con_iva: 131.52, cantidad: 2 },
  { marca: "DUNCAN", codigo: "45-850", sin_iva: 0, con_iva: 0, cantidad: 0 },
  { marca: "DUNCAN", codigo: "45R-750", sin_iva: 113.38, con_iva: 131.52, cantidad: 2 },
  { marca: "DUNCAN", codigo: "45R-850", sin_iva: 118.18, con_iva: 137.09, cantidad: 0 },
  { marca: "DUNCAN", codigo: "48-1300", sin_iva: 0, con_iva: 0, cantidad: 0 },
  { marca: "DUNCAN", codigo: "48R-1200", sin_iva: 164.47, con_iva: 190.79, cantidad: 0 },
  { marca: "DUNCAN", codigo: "48R-1300", sin_iva: 0, con_iva: 0, cantidad: 0 },
  { marca: "DUNCAN", codigo: "49R-1300", sin_iva: 200.03, con_iva: 232.03, cantidad: 1 },
  { marca: "DUNCAN", codigo: "4D-1500", sin_iva: 293.97, con_iva: 341.01, cantidad: 0 },
  { marca: "DUNCAN", codigo: "4DLT-1450", sin_iva: 277.97, con_iva: 322.45, cantidad: 0 },
  { marca: "DUNCAN", codigo: "59-850", sin_iva: 147.0, con_iva: 170.52, cantidad: 1 },
  { marca: "DUNCAN", codigo: "65-1100", sin_iva: 180.47, con_iva: 209.35, cantidad: 4 },
  { marca: "DUNCAN", codigo: "78-850", sin_iva: 149.67, con_iva: 173.62, cantidad: 1 },
  { marca: "DUNCAN", codigo: "8D-1700", sin_iva: 375.47, con_iva: 435.55, cantidad: 0 },
  { marca: "DUNCAN", codigo: "N40R-700", sin_iva: 114.97, con_iva: 133.37, cantidad: 2 },
  { marca: "DUNCAN", codigo: "NS40R-670", sin_iva: 114.97, con_iva: 133.37, cantidad: 2 },
  { marca: "POSITIVE", codigo: "22M-800", sin_iva: 116.0, con_iva: 134.56, cantidad: 2 },
  { marca: "POSITIVE", codigo: "22MR-800", sin_iva: 116.0, con_iva: 134.56, cantidad: 2 },
  { marca: "POSITIVE", codigo: "24MR-1100", sin_iva: 157.0, con_iva: 182.12, cantidad: 2 },
  { marca: "POSITIVE", codigo: "27M-1100", sin_iva: 155.0, con_iva: 179.8, cantidad: 0 },
  { marca: "POSITIVE", codigo: "27MR-1100", sin_iva: 155.0, con_iva: 179.8, cantidad: 0 },
  { marca: "POSITIVE", codigo: "30M-1250", sin_iva: 191.0, con_iva: 221.56, cantidad: 0 },
  { marca: "POSITIVE", codigo: "36MR-700", sin_iva: 96.0, con_iva: 111.36, cantidad: -1 },
  { marca: "POSITIVE", codigo: "43M-1000", sin_iva: 135.0, con_iva: 156.6, cantidad: 0 },
  { marca: "POSITIVE", codigo: "43MR-1000", sin_iva: 135.0, con_iva: 156.6, cantidad: 1 },
  { marca: "POSITIVE", codigo: "45MR-700", sin_iva: 113.0, con_iva: 131.08, cantidad: 1 },
  { marca: "POSITIVE", codigo: "49M-1100", sin_iva: 185.0, con_iva: 214.6, cantidad: 0 },
  { marca: "POSITIVE", codigo: "4D-1350", sin_iva: 262.0, con_iva: 303.92, cantidad: 0 },
  { marca: "POSITIVE", codigo: "65M-1100", sin_iva: 168.0, con_iva: 194.88, cantidad: 1 },
]

// Normaliza un código de batería para comparar entre catálogo e inventario:
// quita guiones, espacios y mayúsculas. "22M-800" -> "22M800"; "22-850" -> "22850"
export function normCodigo(c: string): string {
  return c.toUpperCase().replace(/[\s-]/g, "").trim();
}

// Busca en el inventario por marca y código (tolerante a guiones/espacios).
export function buscarInventario(
  marca: "DUNCAN" | "POSITIVE",
  codigo: string
): ItemInventario | null {
  const objetivo = normCodigo(codigo);
  const item = INVENTARIO.find(
    (i) => i.marca === marca && normCodigo(i.codigo) === objetivo
  );
  return item ?? null;
}
