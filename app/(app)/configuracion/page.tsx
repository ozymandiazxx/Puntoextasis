"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Btn, Card, ErrorMsg, Field, PageHeader, inputCls } from "@/components/ui";

const CAMPOS = ["nombre", "razon_social", "ruc", "direccion", "telefono", "establecimiento", "punto_emision"] as const;
type F = Record<(typeof CAMPOS)[number], string>;

export default function Configuracion() {
  const [f, setF] = useState<F | null>(null);
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [clave, setClave] = useState({ nueva: "", repetir: "" });
  const [claveMsg, setClaveMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    supabase.from("negocios").select("id," + CAMPOS.join(",")).single().then(({ data }) => {
      if (!data) return;
      const d = data as unknown as Record<string, string | null>;
      setId(d.id as string);
      setF(Object.fromEntries(CAMPOS.map((k) => [k, d[k] ?? ""])) as F);
    });
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f) return;
    setError(""); setOk("");
    const payload = Object.fromEntries(CAMPOS.map((k) => [k, f[k].trim() || null]));
    payload.establecimiento = f.establecimiento.trim() || "001";
    payload.punto_emision = f.punto_emision.trim() || "001";
    payload.nombre = f.nombre.trim() || "Mi licorería";
    const { error } = await supabase.from("negocios").update(payload).eq("id", id);
    if (error) return setError(error.message);
    setOk("Datos guardados");
  };

  const cambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaveMsg(null);
    if (clave.nueva.length < 8) return setClaveMsg({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
    if (clave.nueva !== clave.repetir) return setClaveMsg({ tipo: "error", texto: "Las contraseñas no coinciden." });
    setCambiando(true);
    const { error } = await supabase.auth.updateUser({ password: clave.nueva });
    setCambiando(false);
    if (error) return setClaveMsg({ tipo: "error", texto: error.message });
    setClave({ nueva: "", repetir: "" });
    setClaveMsg({ tipo: "ok", texto: "Contraseña actualizada." });
  };

  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f!, [k]: e.target.value });

  if (!f) return null;
  return (
    <>
      <PageHeader title="Datos del negocio" />
      <Card>
        <p className="mb-4 text-slate-600">Estos datos aparecen en tus facturas y se usarán para la facturación electrónica del SRI.</p>
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre comercial"><input className={inputCls} required value={f.nombre} onChange={set("nombre")} /></Field>
          <Field label="Razón social"><input className={inputCls} value={f.razon_social} onChange={set("razon_social")} /></Field>
          <Field label="RUC"><input className={inputCls} value={f.ruc} onChange={set("ruc")} /></Field>
          <Field label="Teléfono"><input className={inputCls} value={f.telefono} onChange={set("telefono")} /></Field>
          <div className="sm:col-span-2"><Field label="Dirección"><input className={inputCls} value={f.direccion} onChange={set("direccion")} /></Field></div>
          <Field label="Establecimiento (3 dígitos)"><input className={inputCls} maxLength={3} value={f.establecimiento} onChange={set("establecimiento")} /></Field>
          <Field label="Punto de emisión (3 dígitos)"><input className={inputCls} maxLength={3} value={f.punto_emision} onChange={set("punto_emision")} /></Field>
          <div className="space-y-3 sm:col-span-2">
            <ErrorMsg msg={error} />
            {ok && <p className="rounded-xl bg-green-50 px-4 py-3 text-green-700">{ok}</p>}
            <Btn className="w-full">Guardar</Btn>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 mt-10 font-[family-name:var(--font-serif)] text-2xl font-semibold">Cambiar mi contraseña</h2>
      <Card>
        <form onSubmit={cambiarClave} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nueva contraseña (mín. 8 caracteres)">
            <input className={inputCls} type="password" autoComplete="new-password" value={clave.nueva} onChange={(e) => setClave({ ...clave, nueva: e.target.value })} />
          </Field>
          <Field label="Repetir contraseña">
            <input className={inputCls} type="password" autoComplete="new-password" value={clave.repetir} onChange={(e) => setClave({ ...clave, repetir: e.target.value })} />
          </Field>
          <div className="space-y-3 sm:col-span-2">
            {claveMsg?.tipo === "error" && <ErrorMsg msg={claveMsg.texto} />}
            {claveMsg?.tipo === "ok" && <p className="rounded-xl bg-green-50 px-4 py-3 text-green-700">{claveMsg.texto}</p>}
            <Btn className="w-full" disabled={cambiando || !clave.nueva}>{cambiando ? "Guardando..." : "Cambiar contraseña"}</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
