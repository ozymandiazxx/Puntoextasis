"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { Btn, Card, Empty, ErrorMsg, Field, Modal, PageHeader, Stat, inputCls } from "@/components/ui";

type Cliente = {
  id: string; nombre: string; tipo_identificacion: string; identificacion: string | null;
  telefono: string | null; correo: string | null; direccion: string | null;
};
type Form = Omit<{ [K in keyof Cliente]: string }, "id"> & { id?: string };
const vacio: Form = { nombre: "", tipo_identificacion: "cedula", identificacion: "", telefono: "", correo: "", direccion: "" };
const COLS = "id,nombre,tipo_identificacion,identificacion,telefono,correo,direccion";

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [deuda, setDeuda] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Form | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from("clientes").select(COLS).order("nombre"),
      supabase.from("ventas").select("cliente_id,total,monto_pagado").eq("estado_pago", "pendiente").not("cliente_id", "is", null),
    ]);
    setLista(a.data ?? []);
    const d: Record<string, number> = {};
    (b.data ?? []).forEach((v) => (d[v.cliente_id!] = (d[v.cliente_id!] ?? 0) + v.total - v.monto_pagado));
    setDeuda(d);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const { id, ...campos } = edit;
    const payload = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.trim() || null]));
    payload.tipo_identificacion = edit.tipo_identificacion;
    const { error } = id
      ? await supabase.from("clientes").update(payload).eq("id", id)
      : await supabase.from("clientes").insert(payload);
    if (error) return setError(error.message);
    setEdit(null); setError(""); cargar();
  };

  const eliminar = async (c: Cliente) => {
    if (!confirm(`¿Eliminar a ${c.nombre}? Sus facturas se conservan como "Consumidor final".`)) return;
    await supabase.from("clientes").delete().eq("id", c.id);
    cargar();
  };

  const t = q.trim().toLowerCase();
  const visibles = lista.filter((c) => !t || [c.nombre, c.identificacion, c.telefono].some((x) => x?.toLowerCase().includes(t)));
  const porCobrar = Object.values(deuda).reduce((a, n) => a + n, 0);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEdit({ ...edit!, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Clientes"><Btn onClick={() => { setEdit(vacio); setError(""); }}>+ Nuevo cliente</Btn></PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-4">
        <Stat label="Clientes" value={String(lista.length)} />
        <Stat label="Por cobrar" value={money(porCobrar)} tone={porCobrar > 0 ? "text-red-600" : ""} />
      </div>
      <input className={inputCls + " mb-4"} placeholder="Buscar por nombre, cédula/RUC o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />

      {visibles.length === 0 ? <Card><Empty text="Sin clientes" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{c.nombre}</p>
                  <p className="text-sm text-slate-500">{c.identificacion ? `${c.tipo_identificacion.toUpperCase()}: ${c.identificacion}` : "Sin identificación"}</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="ghost" className="!px-3 !py-2" onClick={() => {
                    setEdit({ ...vacio, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ""])) } as Form); setError("");
                  }}>Editar</Btn>
                  <Btn variant="danger" className="!px-3 !py-2" onClick={() => eliminar(c)}>✕</Btn>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                {c.telefono && <div>{c.telefono}</div>}
                {c.correo && <div>{c.correo}</div>}
                {c.direccion && <div>{c.direccion}</div>}
                {deuda[c.id] > 0 && <div className="font-semibold text-red-600">Debe: {money(deuda[c.id])}</div>}
              </dl>
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? "Editar cliente" : "Nuevo cliente"} onClose={() => setEdit(null)}>
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nombre o razón social *"><input className={inputCls} required value={edit.nombre} onChange={set("nombre")} /></Field></div>
            <Field label="Tipo de identificación">
              <select className={inputCls} value={edit.tipo_identificacion} onChange={set("tipo_identificacion")}>
                <option value="cedula">Cédula</option><option value="ruc">RUC</option><option value="pasaporte">Pasaporte</option>
              </select>
            </Field>
            <Field label="Número"><input className={inputCls} value={edit.identificacion} onChange={set("identificacion")} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={edit.telefono} onChange={set("telefono")} /></Field>
            <Field label="Correo"><input className={inputCls} type="email" value={edit.correo} onChange={set("correo")} /></Field>
            <div className="sm:col-span-2"><Field label="Dirección"><input className={inputCls} value={edit.direccion} onChange={set("direccion")} /></Field></div>
            <div className="space-y-3 sm:col-span-2"><ErrorMsg msg={error} /><Btn className="w-full">Guardar cliente</Btn></div>
          </form>
        </Modal>
      )}
    </>
  );
}
