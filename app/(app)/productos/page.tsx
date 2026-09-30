"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { money, IVA_OPCIONES } from "@/lib/format";
import { subirImagen } from "@/lib/subirImagen";
import { Btn, Card, Empty, ErrorMsg, Field, Modal, PageHeader, inputCls } from "@/components/ui";
import type { Categoria, Producto, Proveedor } from "@/lib/types";

type Form = {
  id?: string; nombre: string; categoria_id: string; marca: string; presentacion: string;
  codigo_interno: string; codigo_barras: string; proveedor_id: string; stock: string;
  stock_minimo: string; costo: string; precio_venta: string; iva: string; servicio: boolean; publicado: boolean; imagen_url: string;
};
const vacio: Form = {
  nombre: "", categoria_id: "", marca: "", presentacion: "", codigo_interno: "", codigo_barras: "",
  proveedor_id: "", stock: "0", stock_minimo: "0", costo: "", precio_venta: "", iva: "15", servicio: false, publicado: false, imagen_url: "",
};
const COLS = "id,nombre,categoria_id,marca,presentacion,codigo_interno,codigo_barras,proveedor_id,stock,stock_minimo,costo,precio_venta,ganancia_unidad,ganancia_pct,iva_porcentaje,es_servicio,publicado,imagen_url";

export default function Productos() {
  const [prods, setProds] = useState<Producto[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [provs, setProvs] = useState<Proveedor[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [soloBajo, setSoloBajo] = useState(false);
  const [edit, setEdit] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("productos").select(COLS).eq("activo", true).order("nombre"),
      supabase.from("categorias").select("id,nombre").order("nombre"),
      supabase.from("proveedores").select("id,nombre,empresa,ruc,telefono,correo,direccion").order("nombre"),
    ]);
    setProds(a.data ?? []); setCats(b.data ?? []); setProvs(c.data ?? []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return prods.filter((p) =>
      (!t || [p.nombre, p.marca, p.codigo_interno, p.codigo_barras].some((x) => x?.toLowerCase().includes(t))) &&
      (!cat || p.categoria_id === cat) &&
      (!soloBajo || (!p.es_servicio && p.stock <= p.stock_minimo)));
  }, [prods, q, cat, soloBajo]);

  const catNombre = (id: string | null) => cats.find((c) => c.id === id)?.nombre ?? "—";

  const abrirEditar = (p: Producto) => {
    setError("");
    setEdit({
      id: p.id, nombre: p.nombre, categoria_id: p.categoria_id ?? "", marca: p.marca ?? "",
      presentacion: p.presentacion ?? "", codigo_interno: p.codigo_interno ?? "",
      codigo_barras: p.codigo_barras ?? "", proveedor_id: p.proveedor_id ?? "",
      stock: String(p.stock), stock_minimo: String(p.stock_minimo), costo: String(p.costo),
      precio_venta: String(p.precio_venta), iva: p.iva_porcentaje === null ? "" : String(p.iva_porcentaje), servicio: p.es_servicio, publicado: p.publicado, imagen_url: p.imagen_url ?? "",
    });
  };

  const subirFoto = (archivo: File) => subirImagen(archivo, "productos", 1000);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setGuardando(true); setError("");
    let imagen_url: string | null = edit.imagen_url || null;
    if (foto) {
      try {
        imagen_url = await subirFoto(foto);
      } catch (err) {
        setGuardando(false);
        return setError("No se pudo subir la foto: " + (err as Error).message);
      }
    }
    const payload = {
      publicado: edit.publicado,
      imagen_url,
      nombre: edit.nombre.trim(),
      categoria_id: edit.categoria_id || null,
      marca: edit.marca.trim() || null,
      presentacion: edit.presentacion.trim() || null,
      codigo_interno: edit.codigo_interno.trim() || null,
      codigo_barras: edit.codigo_barras.trim() || null,
      proveedor_id: edit.proveedor_id || null,
      es_servicio: edit.servicio,
      stock: edit.servicio ? 0 : Number(edit.stock || 0),
      stock_minimo: edit.servicio ? 0 : Number(edit.stock_minimo || 0),
      costo: Number(edit.costo || 0),
      precio_venta: Number(edit.precio_venta || 0),
      iva_porcentaje: edit.iva === "" ? null : Number(edit.iva),
    };
    const { error } = edit.id
      ? await supabase.from("productos").update(payload).eq("id", edit.id)
      : await supabase.from("productos").insert(payload);
    setGuardando(false);
    if (error) return setError(error.message);
    setEdit(null); setFoto(null); cargar();
  };

  const eliminar = async (p: Producto) => {
    if (!confirm(`¿Eliminar "${p.nombre}"? El historial de ventas se conserva.`)) return;
    // borrado lógico: conserva el historial de ventas/compras
    await supabase.from("productos").update({ activo: false }).eq("id", p.id);
    cargar();
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEdit({ ...edit!, [k]: e.target.value });

  const gananciaForm = edit ? Number(edit.precio_venta || 0) - Number(edit.costo || 0) : 0;
  const pctForm = edit && Number(edit.costo) > 0 ? (gananciaForm / Number(edit.costo)) * 100 : 0;

  return (
    <>
      <PageHeader title="Productos">
        <div className="flex flex-wrap gap-2">
          <Link href="/asistente" className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-200">Cargar con IA</Link>
          <Link href="/compras" className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-200">Ingresar stock</Link>
          <Btn onClick={() => { setEdit(vacio); setError(""); setFoto(null); }}>+ Nuevo producto</Btn>
        </div>
      </PageHeader>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <input className={inputCls} placeholder="Buscar por nombre, marca o código" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 px-2">
            <input type="checkbox" className="h-5 w-5" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} />
            Stock bajo
          </label>
        </div>
      </Card>

      <Card className="overflow-x-auto !p-0">
        {visibles.length === 0 ? <Empty text="No hay productos" /> : (
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="p-3">Producto</th><th className="p-3">Categoría</th>
                <th className="p-3 text-right">Stock</th><th className="p-3 text-right">Costo</th>
                <th className="p-3 text-right">Precio</th><th className="p-3 text-right">Ganancia</th><th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td className="p-3"><p className="font-semibold">{p.nombre}{p.publicado && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">En la web</span>}</p>
                    <p className="text-sm text-slate-400">{[p.marca, p.presentacion].filter(Boolean).join(" · ")}</p></td>
                  <td className="p-3">{catNombre(p.categoria_id)}</td>
                  <td className={`p-3 text-right font-semibold ${!p.es_servicio && p.stock <= p.stock_minimo ? "text-red-600" : ""}`}>{p.es_servicio ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Servicio</span> : p.stock}</td>
                  <td className="p-3 text-right">{money(p.costo)}</td>
                  <td className="p-3 text-right">{money(p.precio_venta)}</td>
                  <td className="p-3 text-right text-green-700">{money(p.ganancia_unidad)} <span className="text-xs">({p.ganancia_pct}%)</span></td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <Btn variant="ghost" className="!px-3 !py-2" onClick={() => abrirEditar(p)}>Editar</Btn>{" "}
                    <Btn variant="danger" className="!px-3 !py-2" onClick={() => eliminar(p)}>✕</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {edit && (
        <Modal title={edit.id ? "Editar producto" : "Nuevo producto"} onClose={() => setEdit(null)}>
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nombre *"><input className={inputCls} required value={edit.nombre} onChange={set("nombre")} /></Field></div>
            <Field label="Categoría">
              <select className={inputCls} value={edit.categoria_id} onChange={set("categoria_id")}>
                <option value="">Sin categoría</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Marca"><input className={inputCls} value={edit.marca} onChange={set("marca")} /></Field>
            <Field label="Presentación (750ml, litro, pack...)"><input className={inputCls} value={edit.presentacion} onChange={set("presentacion")} /></Field>
            <Field label="Proveedor principal">
              <select className={inputCls} value={edit.proveedor_id} onChange={set("proveedor_id")}>
                <option value="">Ninguno</option>
                {provs.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
            <Field label="Código interno"><input className={inputCls} value={edit.codigo_interno} onChange={set("codigo_interno")} /></Field>
            <Field label="Código de barras"><input className={inputCls} value={edit.codigo_barras} onChange={set("codigo_barras")} /></Field>
            <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
              <p className="mb-2 font-semibold">Página web</p>
              <label className="mb-3 flex items-center gap-3">
                <input type="checkbox" className="h-5 w-5" checked={edit.publicado} onChange={(e) => setEdit({ ...edit, publicado: e.target.checked })} />
                <span>Mostrar este producto en la tienda de la página web</span>
              </label>
              <div className="flex items-center gap-4">
                {(foto || edit.imagen_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto ? URL.createObjectURL(foto) : edit.imagen_url} alt="Foto del producto" className="h-20 w-16 rounded-lg border border-slate-200 bg-slate-50 object-contain" />
                )}
                <div className="flex-1">
                  <input className={inputCls} type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
                  <p className="mt-1 text-xs text-slate-500">Foto de la botella (mejor con fondo liso). Se ajusta sola.</p>
                </div>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:col-span-2">
              <input type="checkbox" className="h-5 w-5" checked={edit.servicio} onChange={(e) => setEdit({ ...edit, servicio: e.target.checked })} />
              <span><b>Es un servicio</b> <span className="text-sm text-slate-500">(ej. domicilio, servicio de mesa): se factura sin controlar inventario</span></span>
            </label>
            {!edit.servicio && <>
            <Field label="Cantidad disponible"><input className={inputCls} type="number" min="0" step="any" value={edit.stock} onChange={set("stock")} /></Field>
            <Field label="Stock mínimo"><input className={inputCls} type="number" min="0" step="any" value={edit.stock_minimo} onChange={set("stock_minimo")} /></Field>
            </>}
            <Field label="Costo de compra"><input className={inputCls} type="number" min="0" step="0.01" required value={edit.costo} onChange={set("costo")} /></Field>
            <Field label="Precio de venta (final)"><input className={inputCls} type="number" min="0" step="0.01" required value={edit.precio_venta} onChange={set("precio_venta")} /></Field>
            <Field label="IVA">
              <select className={inputCls} value={edit.iva} onChange={set("iva")}>
                {IVA_OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <div className="flex items-center rounded-xl bg-green-50 px-4 py-3 text-green-800">
              Ganancia: <b className="ml-1">{money(gananciaForm)}</b>&nbsp;({pctForm.toFixed(1)}%)
            </div>
            <div className="space-y-3 sm:col-span-2"><ErrorMsg msg={error} /><Btn className="w-full" disabled={guardando}>{guardando ? "Guardando..." : "Guardar producto"}</Btn></div>
          </form>
        </Modal>
      )}
    </>
  );
}
