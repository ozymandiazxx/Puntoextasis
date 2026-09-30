"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Btn, ErrorMsg, Field, Modal, inputCls } from "@/components/ui";
import Icon from "@/components/Icon";

export type ClienteOpcion = { id: string; nombre: string; identificacion: string | null };

// Busca entre los clientes existentes o crea uno nuevo sin salir de la factura.
export default function ClienteSelect({ clientes, value, onChange, onCreado }: {
  clientes: ClienteOpcion[];
  value: string;                       // "" = consumidor final
  onChange: (id: string) => void;
  onCreado: () => Promise<void> | void; // recarga la lista después de crear
}) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState<{ nombre: string; identificacion: string; telefono: string; correo: string } | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const elegido = clientes.find((c) => c.id === value);
  const t = q.trim().toLowerCase();
  const coincidencias = clientes
    .filter((c) => !t || c.nombre.toLowerCase().includes(t) || c.identificacion?.toLowerCase().includes(t))
    .slice(0, 6);

  const elegir = (id: string) => { onChange(id); setQ(""); setAbierto(false); };

  const abrirNuevo = () => {
    // si lo escrito son solo dígitos, se toma como identificación; si no, como nombre
    const esNumero = /^\d{5,}$/.test(q.trim());
    setNuevo({ nombre: esNumero ? "" : q.trim(), identificacion: esNumero ? q.trim() : "", telefono: "", correo: "" });
    setError(""); setAbierto(false);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo) return;
    setGuardando(true); setError("");
    const id = nuevo.identificacion.trim();
    const { data, error } = await supabase.from("clientes").insert({
      nombre: nuevo.nombre.trim(),
      tipo_identificacion: id.length === 13 ? "ruc" : "cedula",
      identificacion: id || null,
      telefono: nuevo.telefono.trim() || null,
      correo: nuevo.correo.trim() || null,
    }).select("id").single();
    setGuardando(false);
    if (error) return setError(error.message);
    await onCreado();
    onChange(data.id);
    setNuevo(null); setQ("");
  };

  return (
    <div className="relative">
      {elegido ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-600 bg-brand-50 px-4 py-3">
          <div>
            <p className="font-semibold">{elegido.nombre}</p>
            {elegido.identificacion && <p className="text-xs text-slate-500">{elegido.identificacion}</p>}
          </div>
          <button type="button" aria-label="Quitar cliente" className="rounded-full p-1.5 text-slate-500 hover:bg-panel" onClick={() => onChange("")}>
            <Icon name="cerrar" />
          </button>
        </div>
      ) : (
        <input className={inputCls} placeholder="Consumidor final · buscar cliente" value={q}
          onFocus={() => setAbierto(true)} onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
          onBlur={() => setTimeout(() => setAbierto(false), 150)} />
      )}

      {abierto && !elegido && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-panel shadow-lg">
          {coincidencias.map((c) => (
            <button key={c.id} type="button" onMouseDown={() => elegir(c.id)}
              className="block w-full px-4 py-2.5 text-left hover:bg-slate-50">
              <span className="font-medium">{c.nombre}</span>
              {c.identificacion && <span className="ml-2 text-xs text-slate-400">{c.identificacion}</span>}
            </button>
          ))}
          {coincidencias.length === 0 && t && <p className="px-4 py-2.5 text-sm text-slate-400">Sin resultados</p>}
          <button type="button" onMouseDown={abrirNuevo}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left font-semibold text-brand-700 hover:bg-brand-50">
            <Icon name="plus" className="h-4 w-4" />Crear cliente nuevo{q.trim() ? `: ${q.trim()}` : ""}
          </button>
        </div>
      )}

      {nuevo && (
        <Modal title="Nuevo cliente" onClose={() => setNuevo(null)}>
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nombre o razón social *">
                <input className={inputCls} required autoFocus value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              </Field>
            </div>
            <Field label="Cédula / RUC"><input className={inputCls} value={nuevo.identificacion} onChange={(e) => setNuevo({ ...nuevo, identificacion: e.target.value })} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Correo (opcional)"><input className={inputCls} type="email" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} /></Field></div>
            <div className="space-y-3 sm:col-span-2">
              <ErrorMsg msg={error} />
              <Btn className="w-full" disabled={guardando}>{guardando ? "Guardando..." : "Guardar y usar en la factura"}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
