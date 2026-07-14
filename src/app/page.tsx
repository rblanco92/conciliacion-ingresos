import Link from "next/link";
import { getSesion } from "@/lib/auth-server";

export default async function Home() {
  const sesion = await getSesion();
  const esAdmin = sesion?.rol === "admin";

  return (
    <div>
      <h1 className="font-display text-4xl">Conciliación de Ingresos</h1>
      <div className="mt-1 h-[3px] w-full max-w-xs bg-tg-orange opacity-30" />
      <p className="mt-4 max-w-2xl text-neutral-600">
        {esAdmin
          ? "Los vendedores reportan cada pago con su referencia. Sube el estado de cuenta y el sistema cuadra los ingresos automáticamente: solo quedan las excepciones para revisar."
          : "Reporta cada pago recibido con su referencia y comprobante. El equipo de administración lo concilia con el banco."}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Card
          href="/nuevo"
          titulo="Reportar ingreso"
          desc="Captura el pago con su referencia y comprobante."
          cta="Abrir formulario"
        />
        {esAdmin && (
          <>
            <Card
              href="/conciliacion"
              titulo="Conciliación"
              desc="Sube el Excel del banco. El sistema cruza y muestra las excepciones."
              cta="Ir a conciliar"
            />
            <Card
              href="/tasas"
              titulo="Tasas BCV"
              desc="Carga la tasa oficial del día. Desbloquea los ingresos en bolívares."
              cta="Cargar tasa"
            />
          </>
        )}
      </div>

      {esAdmin && (
        <Link
          href="/usuarios"
          className="mt-5 inline-block text-sm font-bold text-tg-orange hover:underline"
        >
          Administrar usuarios →
        </Link>
      )}
    </div>
  );
}

function Card({
  href,
  titulo,
  desc,
  cta,
}: {
  href: string;
  titulo: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="tg-page group block rounded-xl border border-neutral-200 bg-white p-6 transition hover:shadow-lg"
    >
      <h2 className="font-display text-2xl">{titulo}</h2>
      <p className="mt-2 min-h-[64px] text-sm text-neutral-600">{desc}</p>
      <span className="mt-3 inline-block text-sm font-bold text-tg-orange group-hover:underline">
        {cta} →
      </span>
    </Link>
  );
}
