"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  BANCOS,
  CANALES,
  BANCOS_USD,
  CLASIFICACION_POR_CANAL,
  type Moneda,
} from "@/lib/tipos";

type Estado = "idle" | "enviando" | "ok" | "error";

export default function NuevoIngreso() {
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [cotizacion, setCotizacion] = useState("");
  const [cliente, setCliente] = useState("");
  const [cedula, setCedula] = useState("");
  const [detalle, setDetalle] = useState("");
  const [banco, setBanco] = useState("efectivo_usd");
  const [canal, setCanal] = useState("tienda");
  const [fechaPago, setFechaPago] = useState(hoy());
  const [archivo, setArchivo] = useState<File | null>(null);

  // Usuario logueado (para trazabilidad automática)
  const [userId, setUserId] = useState<string | null>(null);
  const [userNombre, setUserNombre] = useState<string>("");

  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre")
          .eq("id", data.user.id)
          .single();
        setUserNombre(perfil?.nombre ?? data.user.email ?? "");
      }
    });
  }, []);

  // La moneda se deriva del método: Zelle/Binance/Stripe/PayPal/Efectivo$ = USD.
  const moneda: Moneda = BANCOS_USD.includes(banco) ? "USD" : "VES";

  async function enviar() {
    setError("");
    if (!monto || !referencia || !cotizacion || !cliente || !cedula || !detalle) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    if (Number(monto) <= 0) {
      setError("El monto debe ser mayor a cero.");
      return;
    }

    setEstado("enviando");
    try {
      let comprobanteUrl: string | null = null;

      // Subir comprobante a Storage (bucket 'comprobantes')
      if (archivo) {
        const ext = archivo.name.split(".").pop();
        const nombre = `${referencia}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("comprobantes")
          .upload(nombre, archivo);
        if (upErr) throw new Error("No se pudo subir el comprobante: " + upErr.message);
        const { data } = supabase.storage.from("comprobantes").getPublicUrl(nombre);
        comprobanteUrl = data.publicUrl;
      }

      const clasif = CLASIFICACION_POR_CANAL[canal];

      const { error: insErr } = await supabase.from("ingresos").insert({
        fecha_pago: fechaPago,
        referencia: referencia.trim(),
        monto_original: Number(monto),
        moneda,
        detalle: detalle.trim(),
        cliente_nombre: cliente.trim(),
        cliente_cedula: cedula.trim(),
        cotizacion: cotizacion.trim(),
        canal,
        banco,
        comprobante_url: comprobanteUrl,
        vendedor: userId,
        partida: clasif?.partida ?? null,
        subpartida: clasif?.subpartida ?? null,
        codigo_contable: clasif?.codigo ?? null,
      });
      if (insErr) throw new Error(insErr.message);

      setEstado("ok");
      limpiar();
    } catch (e) {
      setEstado("error");
      setError(e instanceof Error ? e.message : "Error desconocido.");
    }
  }

  function limpiar() {
    setMonto("");
    setReferencia("");
    setCotizacion("");
    setCliente("");
    setCedula("");
    setDetalle("");
    setArchivo(null);
  }

  if (estado === "ok") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-ok/30 bg-ok/10 p-8 text-center">
        <div className="text-4xl">✓</div>
        <h2 className="mt-2 font-display text-2xl text-ok">Ingreso enviado</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Quedó registrado y a la espera de conciliación con el banco.
          {moneda === "VES" && " Si aún no hay tasa BCV del día, se convertirá al cargarla."}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => setEstado("idle")}
            className="rounded-lg bg-tg-orange px-5 py-2.5 font-bold text-tg-black"
          >
            Reportar otro ingreso
          </button>
          <a
            href="/mis-ingresos"
            className="rounded-lg border-[1.5px] border-neutral-300 px-5 py-2.5 font-bold text-neutral-700"
          >
            Ver mis ingresos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl">Reportar un ingreso</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Completa los datos del pago recibido. Todos los campos con
        <span className="tg-req"> *</span> son obligatorios.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Monto" req>
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-500">
              {moneda === "USD" ? "$" : "Bs"}
            </span>
            <input
              className="tg-input"
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          {moneda === "VES" && (
            <p className="mt-1 text-xs text-neutral-500">
              En bolívares. Se convierte a $ con la tasa BCV del día del pago.
            </p>
          )}
        </Field>

        <Field label="N° Cotización" req>
          <input
            className="tg-input"
            placeholder="COT-0000"
            value={cotizacion}
            onChange={(e) => setCotizacion(e.target.value)}
          />
        </Field>

        {/* Referencia: el campo clave del cruce */}
        <div className="sm:col-span-2">
          <label className="tg-label">
            Referencia de la operación <span className="tg-req">*</span>
          </label>
          <input
            className="w-full rounded-lg border-[1.5px] border-tg-orange bg-[#fff8f3] px-3 py-2.5 text-[15px] font-bold tracking-wide outline-none"
            placeholder="Número de referencia del pago"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
          <p className="mt-1 text-xs font-bold text-tg-orange">
            ↳ Este número es el que el sistema cruza contra el banco. Cópialo tal cual.
          </p>
        </div>

        <Field label="Nombre del cliente" req>
          <input
            className="tg-input"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </Field>

        <Field label="Cédula / RIF" req>
          <input
            className="tg-input"
            placeholder="V-00.000.000"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Detalle de la compra" req>
            <input
              className="tg-input"
              placeholder="Qué compró el cliente"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Fecha del pago" req>
          <input
            className="tg-input"
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
          />
        </Field>

        <Field label="Vendedor">
          <div className="tg-input flex items-center bg-neutral-50 text-neutral-600">
            {userNombre || "—"}
          </div>
        </Field>

        {/* Banco */}
        <div className="sm:col-span-2">
          <label className="tg-label">
            Método de pago <span className="tg-req">*</span>
            <span
              className={
                "ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold " +
                (moneda === "USD"
                  ? "bg-ok/15 text-ok"
                  : "bg-tg-orange/15 text-tg-orange")
              }
            >
              {moneda === "USD" ? "Se registra en $" : "Se registra en Bs"}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {BANCOS.map((b) => (
              <Chip
                key={b.value}
                on={banco === b.value}
                onClick={() => setBanco(b.value)}
              >
                {b.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Canal */}
        <div className="sm:col-span-2">
          <label className="tg-label">
            Canal de compra <span className="tg-req">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CANALES.map((c) => (
              <Chip
                key={c.value}
                on={canal === c.value}
                onClick={() => setCanal(c.value)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Comprobante */}
        <div className="sm:col-span-2">
          <label className="tg-label">Comprobante (respaldo visual)</label>
          <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-tg-orange bg-[#fff8f3] p-4">
            <div className="text-2xl">📎</div>
            <div className="text-sm">
              {archivo ? (
                <span className="font-bold">{archivo.name}</span>
              ) : (
                <>
                  <b className="block">Adjuntar foto del comprobante</b>
                  <span className="text-neutral-500">JPG o PNG</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-err/30 bg-err/10 px-4 py-3 text-sm text-err">
          {error}
        </div>
      )}

      <button
        onClick={enviar}
        disabled={estado === "enviando"}
        className="mt-6 w-full rounded-xl bg-tg-orange py-3.5 text-[15px] font-bold text-tg-black transition hover:brightness-95 disabled:opacity-60"
      >
        {estado === "enviando" ? "Enviando…" : "Enviar ingreso →"}
      </button>
    </div>
  );
}

function Field({
  label,
  req,
  children,
}: {
  label: string;
  req?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="tg-label">
        {label} {req && <span className="tg-req">*</span>}
      </label>
      {children}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-bold transition " +
        (on
          ? "border-tg-black bg-tg-black text-white"
          : "border-neutral-300 bg-neutral-50 text-neutral-600 hover:border-neutral-400")
      }
    >
      {children}
    </button>
  );
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}
