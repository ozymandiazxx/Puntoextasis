"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { subirImagen } from "@/lib/subirImagen";
import { money } from "@/lib/format";
import { CATEGORIAS, MOMENTOS } from "@/lib/sitio";
import { Btn, Card, Empty, ErrorMsg, PageHeader, Stat, inputCls } from "@/components/ui";

type Fila = {
  id: string; nombre: string; marca: string | null; presentacion: string | null;
  precio_venta: number; publicado: boolean; imagen_url: string | null; stock: number; es_servicio: boolean;
};

const ESPACIOS = [
  { clave: "hero", nombre: "Portada (foto grande)", lado: 2000 },
  ...CATEGORIAS.map((c) => ({ clave: c.foto, nombre: `Categoría ${c.nombre}`, lado: 1400 })),
  ...MOMENTOS.map((m) => ({ clave: m.foto, nombre: `Momento: ${m.titulo}`, lado: 1400 })),
];

export default function SitioWeb() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "publicados" | "ocultos">("todos");
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from("productos").select("id,nombre,marca,presentacion,precio_venta,publicado,imagen_url,stock,es_servicio").eq("activo", true).order("nombre"),
      supabase.from("sitio_fotos").select("clave,url"),
    ]);
    setFilas(a.data ?? []);
    setFotos(Object.fromEntries((b.data ?? []).map((f) => [f.clave, f.url])));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((f) =>
      (filtro === "todos" || (filtro === "publicados") === f.publicado) &&
      (!t || f.nombre.toLowerCase().includes(t) || f.marca?.toLowerCase().includes(t)));
  }, [filas, q, filtro]);

  const ejecutar = async (clave: string, tarea: () => Promise<void>, ok: string) => {
    setOcupado(clave); setError(""); setAviso("");
    try { await tarea(); await cargar(); setAviso(ok); }
    catch (e) { setError((e as Error).message); }
    setOcupado(null);
  };

  const publicar = (f: Fila) => ejecutar(f.id, async () => {
    const { error } = await supabase.from("productos").update({ publicado: !f.publicado }).eq("id", f.id);
    if (error) throw new Error(error.message);
  }, f.publicado ? `«${f.nombre}» ya no se muestra en la web.` : `«${f.nombre}» ahora se muestra en la web.`);

  const guardarPrecio = (f: Fila) => {
    const texto = precios[f.id];
    if (texto === undefined) return;
    const valor = Number(texto);
    setPrecios((p) => { const n = { ...p }; delete n[f.id]; return n; });
    if (!(valor >= 0) || texto === "" || valor === f.precio_venta) return;
    void ejecutar(f.id, async () => {
      const { error } = await supabase.from("productos").update({ precio_venta: valor }).eq("id", f.id);
      if (error) throw new Error(error.message);
    }, `Precio de «${f.nombre}» actualizado a ${money(valor)}.`);
  };

  const fotoProducto = (f: Fila, archivo: File) => ejecutar(f.id, async () => {
    const url = await subirImagen(archivo, "productos", 1000);
    const { error } = await supabase.from("productos").update({ imagen_url: url }).eq("id", f.id);
    if (error) throw new Error(error.message);
  }, `Foto de «${f.nombre}» actualizada.`);

  const fotoSitio = (clave: string, nombre: string, lado: number, archivo: File) => ejecutar(clave, async () => {
    const url = await subirImagen(archivo, "sitio", lado);
    const { error } = await supabase.from("sitio_fotos").upsert({ clave, url }, { onConflict: "negocio_id,clave" });
    if (error) throw new Error(error.message);
  }, `Foto «${nombre}» actualizada.`);

  const quitarFotoSitio = (clave: string) => ejecutar(clave, async () => {
    const { error } = await supabase.from("sitio_fotos").delete().eq("clave", clave);
    if (error) throw new Error(error.message);
  }, "Foto quitada.");

  const publicados = filas.filter((f) => f.publicado).length;
  const chip = (activo: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold ${activo ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-panel text-slate-600"}`;

  return (
    <>
      <PageHeader title="Sitio web">
        <Link href="/#catalogo" target="_blank" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-ink hover:border-brand-600">
          Ver el sitio
        </Link>
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="En la tienda" value={String(publicados)} />
        <Stat label="Ocultos" value={String(filas.length - publicados)} />
        <Stat label="Fotos cargadas" value={`${Object.keys(fotos).length} de ${ESPACIOS.length}`} />
      </div>

      {aviso && <p className="mb-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{aviso}</p>}
      <div className="mb-3"><ErrorMsg msg={error} /></div>

      <h2 className="mb-3 mt-6 font-[family-name:var(--font-serif)] text-2xl font-semibold">Productos en la tienda</h2>
      <p className="mb-3 text-sm text-slate-500">
        Publica u oculta productos, cambia su precio y su foto. El precio es el mismo que usas al facturar, con IVA incluido.
      </p>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className={inputCls} placeholder="Buscar producto o marca" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-2">
            {(["todos", "publicados", "ocultos"] as const).map((v) => (
              <button key={v} type="button" className={chip(filtro === v)} onClick={() => setFiltro(v)}>
                {v === "todos" ? "Todos" : v === "publicados" ? "En la web" : "Ocultos"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {visibles.length === 0 ? <Card><Empty text={filas.length === 0 ? "Aún no tienes productos. Créalos en Productos o con el Asistente IA." : "Sin resultados"} /></Card> : (
        <div className="grid gap-3">
          {visibles.map((f) => (
            <Card key={f.id} className={`!p-4 ${ocupado === f.id ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="cursor-pointer" title="Cambiar foto">
                  {f.imagen_url
                    ? <img src={f.imagen_url} alt={f.nombre} className="h-24 w-20 rounded-lg border border-slate-200 bg-slate-50 object-contain" />
                    : <span className="flex h-24 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 px-1 text-center text-xs text-slate-500">Subir foto</span>}
                  <input type="file" accept="image/*" className="hidden" disabled={!!ocupado}
                    onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; if (a) void fotoProducto(f, a); }} />
                </label>

                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold">{f.nombre}</p>
                  <p className="text-sm text-slate-500">{[f.marca, f.presentacion].filter(Boolean).join(" · ") || "—"}</p>
                  <p className={`text-xs ${!f.es_servicio && f.stock <= 0 ? "text-red-600" : "text-slate-400"}`}>
                    {f.es_servicio ? "Servicio" : f.stock <= 0 ? "Agotado (se muestra como agotado)" : `Stock: ${f.stock}`}
                    {f.publicado && !f.imagen_url ? " · publicado sin foto" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Precio</label>
                    <input className={inputCls + " !w-28 !py-2"} type="number" min="0" step="0.01" disabled={!!ocupado}
                      value={precios[f.id] ?? String(f.precio_venta)}
                      onChange={(e) => setPrecios({ ...precios, [f.id]: e.target.value })}
                      onBlur={() => guardarPrecio(f)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                  </div>
                  <button type="button" role="switch" aria-checked={f.publicado} disabled={!!ocupado} onClick={() => publicar(f)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${f.publicado ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-500"}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${f.publicado ? "bg-green-700" : "bg-slate-400"}`} />
                    {f.publicado ? "En la web" : "Oculto"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-12 font-[family-name:var(--font-serif)] text-2xl font-semibold">Fotos del sitio</h2>
      <p className="mb-3 text-sm text-slate-500">
        Portada, categorías y momentos. Usa fotos horizontales y de buena calidad. Si no subes una, se muestra un marco con el logo.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ESPACIOS.map((e) => (
          <Card key={e.clave} className={`!p-3 ${ocupado === e.clave ? "opacity-60" : ""}`}>
            {fotos[e.clave]
              ? <img src={fotos[e.clave]} alt={e.nombre} className="aspect-[4/3] w-full rounded-lg object-cover" />
              : <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">Sin foto</div>}
            <p className="mt-2 text-sm font-medium">{e.nombre}</p>
            <div className="mt-2 flex gap-2">
              <label className="flex-1 cursor-pointer rounded-lg bg-slate-100 py-1.5 text-center text-sm font-semibold hover:bg-slate-200">
                {fotos[e.clave] ? "Cambiar" : "Subir"}
                <input type="file" accept="image/*" className="hidden" disabled={!!ocupado}
                  onChange={(ev) => { const a = ev.target.files?.[0]; ev.target.value = ""; if (a) void fotoSitio(e.clave, e.nombre, e.lado, a); }} />
              </label>
              {fotos[e.clave] && <Btn variant="danger" className="!px-3 !py-1.5 text-sm" disabled={!!ocupado} onClick={() => quitarFotoSitio(e.clave)}>Quitar</Btn>}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
