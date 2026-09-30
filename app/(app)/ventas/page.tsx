"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fechaCorta, money } from "@/lib/format";
import { Btn, Card, Empty, ErrorMsg, PageHeader, inputCls } from "@/components/ui";
import Icon from "@/components/Icon";
import ClienteSelect, { type ClienteOpcion } from "@/components/ClienteSelect";

type P = { id: string; nombre: string; stock: number; costo: number; precio_venta: number; es_servicio: boolean };
type Linea = { producto_id: string; cantidad: number };
type Venta = {
  id: string; numero: number; fecha: string; metodo_pago: string; estado_pago: string;
  total: number; monto_pagado: number; ganancia: number; clientes: { nombre: string } | null;
};

const METODOS = [
  { v: "efectivo", l: "Efectivo" }, { v: "transferencia", l: "Transferencia" },
  { v: "tarjeta", l: "Tarjeta" }, { v: "otros", l: "Otros" },
];
const vacia = (): Linea => ({ producto_id: "", cantidad: 1 });

function Chips<T extends string>({ valor, opciones, onChange }: {
  valor: T; opciones: { v: T; l: string; off?: boolean }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button key={o.v} type="button" disabled={o.off} onClick={() => onChange(o.v)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${
            valor === o.v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-panel text-slate-600 hover:border-slate-300"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export default function Facturas() {
  const [prods, setProds] = useState<P[]>([]);
  const [historial, setHistorial] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [ultima, setUltima] = useState<{ id: string; numero: number; total: number } | null>(null);
  const [cliente, setCliente] = useState("");
  const [estado, setEstado] = useState("pagada");
  const [lineas, setLineas] = useState<Linea[]>([vacia()]);
  const [metodo, setMetodo] = useState("efectivo");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("productos").select("id,nombre,stock,costo,precio_venta,es_servicio").eq("activo", true).order("nombre"),
      supabase.from("ventas").select("id,numero,fecha,metodo_pago,estado_pago,total,monto_pagado,ganancia,clientes(nombre)")
        .order("fecha", { ascending: false }).limit(20),
      supabase.from("clientes").select("id,nombre,identificacion").order("nombre"),
    ]);
    setProds(a.data ?? []); setHistorial((b.data ?? []) as unknown as Venta[]); setClientes(c.data ?? []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const setLinea = (i: number, c: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...c } : l)));

  const detalle = lineas.map((l) => {
    const p = prods.find((x) => x.id === l.producto_id);
    return { l, p, sub: p ? p.precio_venta * l.cantidad : 0, gan: p ? (p.precio_venta - p.costo) * l.cantidad : 0 };
  });
  const validas = detalle.filter((d) => d.p && d.l.cantidad > 0);
  const total = validas.reduce((a, d) => a + d.sub, 0);
  const ganancia = validas.reduce((a, d) => a + d.gan, 0);

  const confirmar = async () => {
    setEnviando(true); setError(""); setOk(""); setUltima(null);
    const { data: ventaId, error } = await supabase.rpc("registrar_venta", {
      p_metodo_pago: metodo,
      p_cliente_id: cliente || null,
      p_estado_pago: estado,
      p_items: validas.map((d) => ({ producto_id: d.p!.id, cantidad: d.l.cantidad })),
    });
    setEnviando(false);
    if (error) { setError(error.message); cargar(); return; }
    const { data: v } = await supabase.from("ventas").select("id,numero,total").eq("id", ventaId).single();
    setUltima(v);
    setOk(`Factura registrada por ${money(total)}. Inventario actualizado.`);
    setLineas([vacia()]); setCliente(""); setEstado("pagada"); cargar();
  };

  const marcarPagada = async (id: string) => {
    const v = historial.find((x) => x.id === id);
    const { error } = await supabase.rpc("registrar_pago", { p_venta_id: id, p_monto: v ? v.total - v.monto_pagado : 0 });
    if (error) setError(error.message); else cargar();
  };

  return (
    <>
      <PageHeader title="Nueva factura" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-3 font-bold">Productos</h2>
          <div className="space-y-3">
            {detalle.map(({ l, p, sub }, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex gap-2">
                  <select className={inputCls} value={l.producto_id} onChange={(e) => setLinea(i, { producto_id: e.target.value, cantidad: 1 })}>
                    <option value="">Elegir producto...</option>
                    {prods.map((x) => (
                      <option key={x.id} value={x.id} disabled={!x.es_servicio && x.stock <= 0}>
                        {x.nombre} — {money(x.precio_venta)} ({x.es_servicio ? "servicio" : x.stock <= 0 ? "agotado" : `stock ${x.stock}`})
                      </option>
                    ))}
                  </select>
                  <button type="button" aria-label="Quitar" disabled={lineas.length === 1}
                    onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                    className="rounded-xl px-3 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                    <Icon name="cerrar" />
                  </button>
                </div>
                {p && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                      <button type="button" className="h-9 w-9 rounded-lg text-xl font-bold hover:bg-panel"
                        onClick={() => setLinea(i, { cantidad: Math.max(1, l.cantidad - 1) })}>−</button>
                      <span className="w-10 text-center text-lg font-bold">{l.cantidad}</span>
                      <button type="button" className="h-9 w-9 rounded-lg text-xl font-bold hover:bg-panel"
                        onClick={() => setLinea(i, { cantidad: p.es_servicio ? l.cantidad + 1 : Math.min(p.stock, l.cantidad + 1) })}>+</button>
                    </div>
                    <span className="text-lg font-bold">{money(sub)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Btn variant="ghost" className="mt-3 inline-flex items-center gap-2" onClick={() => setLineas([...lineas, vacia()])}>
            <Icon name="plus" className="h-4 w-4" />Agregar producto
          </Btn>
        </Card>

        <Card className="h-fit space-y-5 lg:sticky lg:top-8">
          <div>
            <h2 className="mb-2 font-bold">Cliente</h2>
            <ClienteSelect clientes={clientes} value={cliente} onCreado={cargar}
              onChange={(id) => { setCliente(id); if (!id) setEstado("pagada"); }} />
          </div>
          <div>
            <h2 className="mb-2 font-bold">Método de pago</h2>
            <Chips valor={metodo} opciones={METODOS} onChange={setMetodo} />
          </div>
          <div>
            <h2 className="mb-2 font-bold">Estado</h2>
            <Chips valor={estado} onChange={setEstado}
              opciones={[{ v: "pagada", l: "Pagada" }, { v: "pendiente", l: "A crédito", off: !cliente }]} />
            {!cliente && <p className="mt-1 text-xs text-slate-400">Elige un cliente para vender a crédito.</p>}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500">Total</span>
              <span className="text-3xl font-bold">{money(total)}</span>
            </div>
            <p className="text-right text-sm text-green-700">Ganancia: {money(ganancia)}</p>
          </div>
          <ErrorMsg msg={error} />
          {ok && (
            <div className="space-y-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              <p>{ok}</p>
              {ultima && (
                <Link href={`/ventas/${ultima.id}`} className="inline-flex items-center gap-2 font-bold text-brand-700 underline">
                  <Icon name="recibo" className="h-4 w-4" />Ver e imprimir la factura #{ultima.numero}
                </Link>
              )}
            </div>
          )}
          <Btn className="w-full !py-4 text-lg" disabled={validas.length === 0 || enviando} onClick={confirmar}>
            {enviando ? "Guardando..." : "Registrar factura"}
          </Btn>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-2 font-bold">Últimas facturas</h2>
        {historial.length === 0 ? <Empty text="Sin facturas registradas" /> : (
          <ul className="divide-y divide-slate-100">
            {historial.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <Link href={`/ventas/${v.id}`} className="font-semibold text-brand-700">#{v.numero}</Link>{" "}
                  {v.clientes?.nombre ?? "Consumidor final"}{" "}
                  <span className="text-sm text-slate-400">{fechaCorta(v.fecha)} · {v.metodo_pago}</span>
                </span>
                <span className="flex items-center gap-2">
                  <b>{money(v.total)}</b>
                  <Link href={`/ventas/${v.id}`} className="rounded-xl bg-slate-100 px-3 py-1 text-sm font-semibold hover:bg-slate-200">Ver factura</Link>
                  {v.estado_pago === "pendiente" && (
                    <Btn variant="danger" className="!px-3 !py-1 text-sm" onClick={() => marcarPagada(v.id)}>Debe {money(v.total - v.monto_pagado)} · Marcar pagada</Btn>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
