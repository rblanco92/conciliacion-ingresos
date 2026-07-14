"use client";

import { useEffect, useState, useCallback } from "react";

interface Usuario {
  id: string;
  nombre: string | null;
  rol: string;
  creado_en: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [rol, setRol] = useState("vendedor");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/usuarios");
    if (res.ok) {
      const data = await res.json();
      setUsuarios(data.usuarios);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear() {
    setError("");
    setMsg("");
    if (!email || !clave) {
      setError("Correo y clave son obligatorios.");
      return;
    }
    if (clave.length < 6) {
      setError("La clave debe tener al menos 6 caracteres.");
      return;
    }
    setCreando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, clave, nombre, rol }),
    });
    setCreando(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear el usuario.");
      return;
    }
    setMsg(`Usuario ${email} creado como ${rol}.`);
    setEmail("");
    setNombre("");
    setClave("");
    setRol("vendedor");
    cargar();
  }

  async function cambiarRol(id: string, nuevoRol: string) {
    await fetch("/api/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rol: nuevoRol }),
    });
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Usuarios</h1>
      <div className="mt-1 h-[3px] w-40 bg-tg-orange opacity-30" />
      <p className="mt-4 text-sm text-neutral-600">
        Da de alta a los vendedores y al equipo de administración. Un vendedor solo
        ve el formulario de ingresos; un admin ve todo.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-display text-xl">Crear usuario</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="tg-label">Correo</label>
            <input
              className="tg-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="tg-label">Nombre</label>
            <input
              className="tg-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div>
            <label className="tg-label">Clave temporal</label>
            <input
              className="tg-input"
              type="text"
              placeholder="mínimo 6 caracteres"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          <div>
            <label className="tg-label">Rol</label>
            <div className="flex gap-2">
              {["vendedor", "admin"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRol(r)}
                  className={
                    "flex-1 rounded-lg border-[1.5px] px-3 py-2.5 text-sm font-bold capitalize transition " +
                    (rol === r
                      ? "border-tg-black bg-tg-black text-white"
                      : "border-neutral-300 bg-neutral-50 text-neutral-600")
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-err/30 bg-err/10 px-3 py-2 text-sm text-err">
            {error}
          </div>
        )}
        {msg && (
          <div className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
            {msg}
          </div>
        )}

        <button
          onClick={crear}
          disabled={creando}
          className="mt-4 rounded-lg bg-tg-orange px-6 py-2.5 font-bold text-tg-black disabled:opacity-60"
        >
          {creando ? "Creando…" : "Crear usuario"}
        </button>
      </div>

      <h2 className="mt-8 font-display text-xl">Usuarios registrados</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Rol</Th>
              <Th>Acción</Th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-400">
                  Aún no hay usuarios.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100">
                <td className="px-4 py-2.5">{u.nombre ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs font-bold " +
                      (u.rol === "admin"
                        ? "bg-tg-orange/15 text-tg-orange"
                        : "bg-neutral-200 text-neutral-600")
                    }
                  >
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() =>
                      cambiarRol(u.id, u.rol === "admin" ? "vendedor" : "admin")
                    }
                    className="text-sm font-bold text-tg-orange hover:underline"
                  >
                    {u.rol === "admin" ? "Hacer vendedor" : "Hacer admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
      {children}
    </th>
  );
}
