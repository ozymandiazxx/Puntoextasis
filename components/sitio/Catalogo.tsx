"use client";
import { useMemo, useState } from "react";
import { claveCategoria, dinero, type ProductoWeb } from "@/lib/sitio";
import { useCarrito } from "@/components/sitio/Carrito";
import Foto from "@/components/sitio/Foto";

export default function Catalogo({ productos, categoriaInicial = "" }: { productos: ProductoWeb[]; categoriaInicial?: string }) {
  const { agregar } = useCarrito();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(categoriaInicial ? claveCategoria(categoriaInicial) : "");

  const categorias = useMemo(() => {
    const m = new Map<string, string>();
    productos.forEach((p) => p.categoria && m.set(claveCategoria(p.categoria), p.categoria));
    return [...m];
  }, [productos]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return productos.filter((p) =>
      (!cat || (p.categoria && claveCategoria(p.categoria) === cat)) &&
      (!t || [p.nombre, p.marca, p.categoria].some((x) => x?.toLowerCase().includes(t))));
  }, [productos, q, cat]);

  if (productos.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 px-6 py-14 text-center text-[#a8a29a]">
        Estamos actualizando nuestro catálogo en línea. Mientras tanto, consulta los catálogos en PDF o escríbenos por WhatsApp.
      </p>
    );
  }

  const chip = (activo: boolean) =>
    `rounded-full border px-4 py-2 text-sm transition ${activo ? "border-[#c6a15b] bg-[#c6a15b]/10 text-[#c6a15b]" : "border-white/15 text-[#a8a29a] hover:border-white/40 hover:text-white"}`;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button className={chip(cat === "")} onClick={() => setCat("")}>Todo</button>
          {categorias.map(([clave, nombre]) => (
            <button key={clave} className={chip(cat === clave)} onClick={() => setCat(clave)}>{nombre}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o marca"
          className="w-full rounded-full border border-white/15 bg-transparent px-5 py-2.5 text-sm text-[#f3ede3] outline-none placeholder:text-[#7d776e] focus:border-[#c6a15b] md:w-72" />
      </div>

      {visibles.length === 0 ? (
        <p className="py-14 text-center text-[#a8a29a]">No encontramos productos con ese filtro.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {visibles.map((p) => (
            <article key={p.id} className="group flex flex-col">
              <div className="overflow-hidden rounded-lg bg-[#141414]">
                <Foto src={p.imagen_url} alt={p.nombre} contener className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.03]" />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#c6a15b]">{p.marca || p.categoria || " "}</p>
              <h3 className="mt-1 font-[family-name:var(--font-serif)] text-lg font-semibold sm:text-xl leading-snug text-[#f3ede3]">{p.nombre}</h3>
              {p.presentacion && <p className="text-sm text-[#a8a29a]">{p.presentacion}</p>}
              <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
                <span className="text-lg font-medium text-[#f3ede3]">{dinero(p.precio)}</span>
                {p.disponible ? (
                  <button onClick={() => agregar(p)}
                    className="w-full rounded-full border border-[#994bbb] px-5 py-2.5 text-sm font-semibold sm:w-auto sm:py-2 text-[#f3ede3] transition hover:bg-[#994bbb]">
                    Comprar
                  </button>
                ) : (
                  <span className="text-sm text-[#7d776e]">Agotado</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
