// ============================================================================
// Tipos y constantes del sistema de conciliación
// ============================================================================

export type Moneda = "USD" | "VES";

export type EstadoIngreso =
  | "pendiente_tasa"
  | "pendiente"
  | "conciliado"
  | "excepcion"
  | "rechazado";

export type ReglaMatch = "referencia_exacta" | "monto_fecha" | "manual";

export interface Ingreso {
  id: string;
  fecha_pago: string;
  referencia: string;
  monto_original: number;
  moneda: Moneda;
  detalle: string;
  cliente_nombre: string;
  cliente_cedula: string;
  cotizacion: string;
  canal: string;
  banco: string;
  comprobante_url: string | null;
  vendedor: string | null;
  tasa_aplicada: number | null;
  monto_usd: number | null;
  estado: EstadoIngreso;
  facturado: boolean;
  partida: string | null;
  subpartida: string | null;
  codigo_contable: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface MovimientoBanco {
  id: string;
  banco: string;
  fecha: string;
  referencia: string | null;
  descripcion: string | null;
  ingreso: number;
  egreso: number;
  saldo: number | null;
  tipo_tx: "INGRESO" | "EGRESO" | null;
  conciliado: boolean;
  lote_carga: string | null;
  creado_en: string;
}

// Opciones fijas del formulario (ajustables sin tocar el esquema)
export const BANCOS = [
  // Métodos en dólares ($) — no usan tasa
  { value: "efectivo_usd", label: "Efectivo ($)" },
  { value: "binance", label: "Binance" },
  { value: "zelle", label: "Zelle" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  // Métodos en bolívares (Bs) — usan tasa BCV del día
  { value: "efectivo_bs", label: "Efectivo (Bs)" },
  { value: "bnc", label: "BNC" },
] as const;

export const CANALES = [
  { value: "tienda", label: "Tienda" },
  { value: "masivos", label: "Masivos" },
  { value: "mercadolibre", label: "MercadoLibre" },
  { value: "instagram", label: "Instagram" },
  { value: "taller", label: "Taller" },
] as const;

// Pre-clasificación contable por canal (para el libro contable).
// Evita que la admin vuelva a teclear partida/subpartida/código.
export const CLASIFICACION_POR_CANAL: Record<
  string,
  { partida: string; subpartida: string; codigo: string }
> = {
  tienda: { partida: "TALLER", subpartida: "INGRESO REPUESTOS", codigo: "10.1.3" },
  masivos: { partida: "TALLER", subpartida: "INGRESO REPUESTOS", codigo: "10.1.3" },
  mercadolibre: { partida: "TALLER", subpartida: "INGRESO REPUESTOS", codigo: "10.1.3" },
  instagram: { partida: "TALLER", subpartida: "INGRESO REPUESTOS", codigo: "10.1.3" },
  taller: { partida: "TALLER", subpartida: "INGRESO SERVICIOS", codigo: "10.1.4" },
};

export const ESTADO_LABEL: Record<EstadoIngreso, string> = {
  pendiente_tasa: "Pendiente de tasa",
  pendiente: "Pendiente",
  conciliado: "Conciliado",
  excepcion: "Excepción",
  rechazado: "Rechazado",
};

// Métodos cuya moneda de operación es USD (no requieren tasa BCV)
export const BANCOS_USD = ["efectivo_usd", "binance", "zelle", "stripe", "paypal"];

// Etiqueta legible del canal de venta (para tablas y reportes)
export function etiquetaCanal(valor: string): string {
  const c = CANALES.find((x) => x.value === valor);
  return c?.label ?? valor;
}

// Etiqueta legible del método de pago
export function etiquetaBanco(valor: string): string {
  const b = BANCOS.find((x) => x.value === valor);
  return b?.label ?? valor;
}
