"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Props {
  rol: "vendedor" | "admin" | null;
  nombre: string | null;
}

export default function NavBar({ rol, nombre }: Props) {
  const router = useRouter();

  async function salir() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-tg-black px-6 py-3.5">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-wide text-white">
          TU<span className="text-tg-orange">/</span>GRUERO
          <span className="ml-2 font-body text-sm font-normal text-neutral-400">
            Conciliación
          </span>
        </Link>

        {rol && (
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/nuevo">Reportar ingreso</NavLink>
            <NavLink href="/mis-ingresos">Mis ingresos</NavLink>
            <NavLink href="/baterias">Baterías</NavLink>
            {rol === "admin" && (
              <>
                <NavLink href="/ingresos">Ingresos</NavLink>
                <NavLink href="/conciliacion">Conciliación</NavLink>
                <NavLink href="/pos">Lotes POS</NavLink>
                <NavLink href="/libro">Libro contable</NavLink>
                <NavLink href="/tasas">Tasas BCV</NavLink>
                <NavLink href="/usuarios">Usuarios</NavLink>
              </>
            )}
            <span className="ml-2 hidden text-neutral-400 sm:inline">
              {nombre}
            </span>
            <button
              onClick={salir}
              className="ml-2 rounded-lg border border-white/20 px-3 py-1.5 font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
            >
              Salir
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
