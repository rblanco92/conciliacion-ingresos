import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { getSesion } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "TuGruero · Conciliación de Ingresos",
  description: "Sistema de captura y conciliación de ingresos del taller",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesion();

  return (
    <html lang="es">
      <body>
        <NavBar rol={sesion?.rol ?? null} nombre={sesion?.nombre ?? null} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
