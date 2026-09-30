"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { fechaCorta, money } from "@/lib/format";
import { Btn, Card, Empty, ErrorMsg, Field, PageHeader, inputCls } from "@/components/ui";

type Prod = { id: string; nombre: string; costo: number; proveedor_id: string | null };
type Linea = { producto_id: string; cantidad: string; costo: string };
type Compra = { id: string; numero: number; fecha: string; total: number; proveedores: { nombre: string } | null };

function ComprasInner() {
  const params = useSearchParams();
  const [provs, setProvs] = useState<{ id: string; nombre: string }[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [historial, setHistorial] = useState<Compra[]>([]);
  const [proveedor, setProveedor] = useState(params.get("proveedor") ?? "");
  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: "", cantidad: "1", costo: "" }]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("proveedores").select("id,nombre").order("nombre"),
      supabase.from("productos").select("id,nombre,costo,proveedor_id").eq("activo", true).eq("es_servicio", false).order("nombre"),
      supabase.from("compras").select("id,numero,fecha,total,proveedores(nombre)").order("fecha", { ascending: false }).limit(15),
    ]);
    setProvs(a.data ?? []); setProds(b.data ?? []);
    setHistorial((c.data ?? []) as unknown as Compra[]);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const setLinea = (i: number, cambios: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambios } : l)));

  const elegirProducto = (i: number, id: string) =>
    setLinea(i, { producto_id: id, costo: String(prods.find((p) => p.id === id)?.costo ?? "") });

  const total = lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.costo || 0), 0);
  const validas = lineas.filter((l) => l.producto_id && Number(l.cantidad) > 0);

  const confirmar = async () => {
    setEnviando(true); setError(""); setOk("");
    const { error } = await supabase.rpc("registrar_compra", {
      p_proveedor_id: proveedor || null,
      p_items: validas.map((l) => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad), costo: Number(l.costo || 0) })),
    });
    setEnviando(false);
    if (error) return setError(error.message);
    setOk(`Compra registrada. Inventario actualizado (${money(total)})`);
    setLineas([{ producto_id: "", cantidad: "1", costo: "" }]);
    cargar();
  };

  // si hay proveedor elegido, sus productos primero
  const opciones = [...prods].sort((a, b) => Number(b.proveedor_id === proveedor) - Number(a.proveedor_id === proveedor));

  return (
    <>
      <PageHeader title="Ingresar inventario (compras)" />
      <Card className="mb-6">
        <Field label="Proveedor">
          <select className={inputCls} value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
            <option value="">Sin proveedor</option>
            {provs.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>

        <div className="mt-4 space-y-3">
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_110px_auto] items-end gap-2">
              <Field label={i === 0 ? "Producto" : ""}>
                <select className={inputCls} value={l.producto_id} onChange={(e) => elegirProducto(i, e.target.value)}>
                  <option value="">Elegir...</option>
                  {opciones.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
              <Field label={i === 0 ? "Cantidad" : ""}>
                <input className={inputCls} type="number" min="1" step="any" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })} />
              </Field>
              <Field label={i === 0 ? "Costo c/u" : ""}>
                <input className={inputCls} type="number" min="0" step="0.01" value={l.costo} onChange={(e) => setLinea(i, { costo: e.target.value })} />
              </Field>
              <Btn variant="danger" className="!px-3" disabled={lineas.length === 1} onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}>✕</Btn>
            </div>
          ))}
        </div>
        <Btn variant="ghost" className="mt-3" onClick={() => setLineas([...lineas, { producto_id: "", cantidad: "1", costo: "" }])}>+ Agregar producto</Btn>

        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <span className="text-xl font-bold">Total: {money(total)}</span>
          <Btn disabled={validas.length === 0 || enviando} onClick={confirmar}>{enviando ? "Guardando..." : "Confirmar compra"}</Btn>
        </div>
        <div className="mt-3 space-y-2">
          <ErrorMsg msg={error} />
          {ok && <p className="rounded-xl bg-green-50 px-4 py-3 text-green-700">{ok}</p>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Historial de compras</h2>
        {historial.length === 0 ? <Empty text="Sin compras registradas" /> : (
          <ul className="divide-y">
            {historial.map((c) => (
              <li key={c.id} className="flex justify-between py-3">
                <span>#{c.numero} · {c.proveedores?.nombre ?? "Sin proveedor"} <span className="text-sm text-slate-400">{fechaCorta(c.fecha)}</span></span>
                <span className="font-semibold">{money(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function Compras() {
  return <Suspense><ComprasInner /></Suspense>;
}
