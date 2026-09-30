"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hoyISO, money } from "@/lib/format";
import { Btn, Card, Empty, ErrorMsg, Field, Modal, PageHeader, Stat, inputCls } from "@/components/ui";

const CATS = ["Compra de mercadería", "Servicios", "Transporte", "Arriendo", "Otros"];
type Gasto = { id: string; nombre: string; categoria: string; valor: number; fecha: string;
  descripcion: string | null; comprobante_url: string | null; proveedores: { nombre: string } | null };
const nuevo = () => ({ nombre: "", categoria: "Otros", proveedor_id: "", valor: "", fecha: hoyISO(), descripcion: "" });

export default function Gastos() {
  const [lista, setLista] = useState<Gasto[]>([]);
  const [filtro, setFiltro] = useState("");
  const [provs, setProvs] = useState<{ id: string; nombre: string }[]>([]);
  const [f, setF] = useState<ReturnType<typeof nuevo> | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from("gastos").select("id,nombre,categoria,valor,fecha,descripcion,comprobante_url,proveedores(nombre)")
        .order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(200),
      supabase.from("proveedores").select("id,nombre").order("nombre"),
    ]);
    setLista((a.data ?? []) as unknown as Gasto[]); setProvs(b.data ?? []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const hoy = hoyISO();
  const hoyTotal = lista.filter((g) => g.fecha === hoy).reduce((a, g) => a + g.valor, 0);
  const mesTotal = lista.filter((g) => g.fecha.slice(0, 7) === hoy.slice(0, 7)).reduce((a, g) => a + g.valor, 0);
  const total = lista.reduce((a, g) => a + g.valor, 0);
  const visibles = filtro ? lista.filter((g) => g.categoria === filtro) : lista;
  const totalFiltro = visibles.reduce((a, g) => a + g.valor, 0);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f) return;
    setGuardando(true); setError("");
    let comprobante_url: string | null = null;
    if (archivo) {
      const { data: neg } = await supabase.from("negocios").select("id").single();
      const ruta = `${neg?.id}/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("comprobantes").upload(ruta, archivo);
      if (upErr) { setGuardando(false); return setError("No se pudo subir el comprobante: " + upErr.message); }
      comprobante_url = ruta;
    }
    const { error } = await supabase.from("gastos").insert({
      nombre: f.nombre.trim(), categoria: f.categoria, proveedor_id: f.proveedor_id || null,
      valor: Number(f.valor), fecha: f.fecha, descripcion: f.descripcion.trim() || null, comprobante_url,
    });
    setGuardando(false);
    if (error) return setError(error.message);
    setF(null); setArchivo(null); cargar();
  };

  const eliminar = async (g: Gasto) => {
    if (!confirm(`¿Eliminar "${g.nombre}"?`)) return;
    await supabase.from("gastos").delete().eq("id", g.id);
    cargar();
  };

  const verComprobante = async (ruta: string) => {
    const { data } = await supabase.storage.from("comprobantes").createSignedUrl(ruta, 60);
    if (data) window.open(data.signedUrl, "_blank");
  };

  const set = (k: keyof ReturnType<typeof nuevo>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f!, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Gastos"><Btn onClick={() => { setF(nuevo()); setError(""); }}>+ Nuevo gasto</Btn></PageHeader>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Gastado hoy" value={money(hoyTotal)} />
        <Stat label="Gastado este mes" value={money(mesTotal)} />
        <Stat label="Total (últimos 200)" value={money(total)} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["", ...CATS].map((c) => (
          <button key={c} type="button" onClick={() => setFiltro(c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${filtro === c ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-panel text-slate-600"}`}>
            {c || "Todos"}
          </button>
        ))}
        {filtro && <span className="ml-auto font-bold">{filtro}: {money(totalFiltro)}</span>}
      </div>
      <Card>
        {visibles.length === 0 ? <Empty text="Sin gastos registrados" /> : (
          <ul className="divide-y">
            {visibles.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold">{g.nombre}</p>
                  <p className="text-sm text-slate-400">{g.fecha} · {g.categoria}{g.proveedores ? ` · ${g.proveedores.nombre}` : ""}</p>
                  {g.descripcion && <p className="text-sm text-slate-500">{g.descripcion}</p>}
                  {g.comprobante_url && (
                    <button className="text-sm font-semibold text-brand-700" onClick={() => verComprobante(g.comprobante_url!)}>Ver comprobante</button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{money(g.valor)}</span>
                  <Btn variant="danger" className="!px-3 !py-2" onClick={() => eliminar(g)}>✕</Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {f && (
        <Modal title="Nuevo gasto" onClose={() => setF(null)}>
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nombre del gasto *"><input className={inputCls} required value={f.nombre} onChange={set("nombre")} /></Field></div>
            <Field label="Categoría">
              <select className={inputCls} value={f.categoria} onChange={set("categoria")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Proveedor relacionado">
              <select className={inputCls} value={f.proveedor_id} onChange={set("proveedor_id")}>
                <option value="">Ninguno</option>{provs.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
            <Field label="Valor *"><input className={inputCls} type="number" min="0" step="0.01" required value={f.valor} onChange={set("valor")} /></Field>
            <Field label="Fecha"><input className={inputCls} type="date" required value={f.fecha} onChange={set("fecha")} /></Field>
            <div className="sm:col-span-2"><Field label="Descripción"><textarea className={inputCls} rows={2} value={f.descripcion} onChange={set("descripcion")} /></Field></div>
            <div className="sm:col-span-2"><Field label="Comprobante (opcional)">
              <input className={inputCls} type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            </Field></div>
            <div className="space-y-3 sm:col-span-2"><ErrorMsg msg={error} /><Btn className="w-full" disabled={guardando}>{guardando ? "Guardando..." : "Guardar gasto"}</Btn></div>
          </form>
        </Modal>
      )}
    </>
  );
}
