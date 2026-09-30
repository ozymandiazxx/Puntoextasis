"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Btn, Card, Empty, ErrorMsg, Field, Modal, PageHeader, inputCls } from "@/components/ui";
import type { Proveedor } from "@/lib/types";

const vacio = { nombre: "", empresa: "", ruc: "", telefono: "", correo: "", direccion: "" };

export default function Proveedores() {
  const [lista, setLista] = useState<Proveedor[]>([]);
  const [prods, setProds] = useState<Record<string, string[]>>({});
  const [edit, setEdit] = useState<(typeof vacio & { id?: string }) | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [{ data: ps }, { data: pr }] = await Promise.all([
      supabase.from("proveedores").select("id,nombre,empresa,ruc,telefono,correo,direccion").order("nombre"),
      supabase.from("productos").select("nombre,proveedor_id").not("proveedor_id", "is", null),
    ]);
    setLista(ps ?? []);
    const m: Record<string, string[]> = {};
    (pr ?? []).forEach((p) => (m[p.proveedor_id!] ??= []).push(p.nombre));
    setProds(m);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const { id, ...campos } = edit;
    const payload = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.trim() || null]));
    const { error } = id
      ? await supabase.from("proveedores").update(payload).eq("id", id)
      : await supabase.from("proveedores").insert(payload);
    if (error) return setError(error.message);
    setEdit(null); setError(""); cargar();
  };

  const eliminar = async (p: Proveedor) => {
    if (!confirm(`¿Eliminar a ${p.nombre}?`)) return;
    await supabase.from("proveedores").delete().eq("id", p.id);
    cargar();
  };

  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEdit({ ...edit!, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Proveedores">
        <Btn onClick={() => { setEdit(vacio); setError(""); }}>+ Nuevo proveedor</Btn>
      </PageHeader>

      {lista.length === 0 ? <Card><Empty text="Aún no tienes proveedores" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{p.nombre}</p>
                  <p className="text-slate-500">{p.empresa}</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="ghost" className="!px-3 !py-2" onClick={() => { setEdit({ ...vacio, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])) } as never); setError(""); }}>Editar</Btn>
                  <Btn variant="danger" className="!px-3 !py-2" onClick={() => eliminar(p)}>✕</Btn>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                {p.ruc && <div>RUC/Cédula: {p.ruc}</div>}
                {p.telefono && <div>{p.telefono}</div>}
                {p.correo && <div>{p.correo}</div>}
                {p.direccion && <div>{p.direccion}</div>}
                <div>{prods[p.id]?.length ? prods[p.id].join(", ") : "Sin productos asociados"}</div>
              </dl>
              <Link href={`/compras?proveedor=${p.id}`} className="mt-4 inline-block font-semibold text-brand-700">
                Crear orden de compra →
              </Link>
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? "Editar proveedor" : "Nuevo proveedor"} onClose={() => setEdit(null)}>
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre *"><input className={inputCls} required value={edit.nombre} onChange={set("nombre")} /></Field>
            <Field label="Empresa"><input className={inputCls} value={edit.empresa} onChange={set("empresa")} /></Field>
            <Field label="Cédula / RUC"><input className={inputCls} value={edit.ruc} onChange={set("ruc")} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={edit.telefono} onChange={set("telefono")} /></Field>
            <Field label="Correo"><input className={inputCls} type="email" value={edit.correo} onChange={set("correo")} /></Field>
            <Field label="Dirección"><input className={inputCls} value={edit.direccion} onChange={set("direccion")} /></Field>
            <div className="space-y-3 sm:col-span-2"><ErrorMsg msg={error} /><Btn className="w-full">Guardar</Btn></div>
          </form>
        </Modal>
      )}
    </>
  );
}
