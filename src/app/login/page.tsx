"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [modoReset, setModoReset] = useState(false);
  const [msgReset, setMsgReset] = useState("");

  async function entrar() {
    setError("");
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    });
    setCargando(false);
    if (error) {
      setError("Correo o clave incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function resetClave() {
    setMsgReset("");
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setMsgReset("Te enviamos un correo para restablecer tu clave. Revisa tu bandeja.");
  }

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Conciliación de Ingresos · TuGruero
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="tg-label">Correo</label>
            <input
              className="tg-input"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!modoReset && (
            <div>
              <label className="tg-label">Clave</label>
              <input
                className="tg-input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && entrar()}
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-err/30 bg-err/10 px-3 py-2 text-sm text-err">
              {error}
            </div>
          )}
          {msgReset && (
            <div className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
              {msgReset}
            </div>
          )}

          {!modoReset ? (
            <>
              <button
                onClick={entrar}
                disabled={cargando}
                className="w-full rounded-xl bg-tg-orange py-3 font-bold text-tg-black transition hover:brightness-95 disabled:opacity-60"
              >
                {cargando ? "Entrando…" : "Entrar"}
              </button>
              <button
                onClick={() => {
                  setModoReset(true);
                  setError("");
                }}
                className="w-full text-center text-sm text-neutral-500 hover:text-tg-orange"
              >
                Olvidé mi clave
              </button>
            </>
          ) : (
            <>
              <button
                onClick={resetClave}
                className="w-full rounded-xl bg-tg-orange py-3 font-bold text-tg-black"
              >
                Enviar enlace de recuperación
              </button>
              <button
                onClick={() => {
                  setModoReset(false);
                  setError("");
                  setMsgReset("");
                }}
                className="w-full text-center text-sm text-neutral-500 hover:text-tg-orange"
              >
                ← Volver
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
