"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fechaCorta, money } from "@/lib/format";
import { Btn, Card, ErrorMsg, inputCls } from "@/components/ui";

type Venta = {
  numero: number; fecha: string; metodo_pago: string; estado_pago: string;
  total: number; iva_total: number; monto_pagado: number;
  clientes: { nombre: string; tipo_identificacion: string; identificacion: string | null; direccion: string | null; telefono: string | null } | null;
};
type Linea = { id: string; nombre_producto: string; cantidad: number; precio_unitario: number; subtotal: number; iva_porcentaje: number | null };
type Pago = { id: string; monto: number; metodo_pago: string; nota: string | null; fecha: string };
type Negocio = { nombre: string; razon_social: string | null; ruc: string | null; direccion: string | null; telefono: string | null; establecimiento: string; punto_emision: string };

export default function Factura() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<Venta | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [n, setN] = useState<Negocio | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [noExiste, setNoExiste] = useState(false);

  const cargar = useCallback(async () => {
    {
      const [a, b, c, d] = await Promise.all([
        supabase.from("ventas").select("numero,fecha,metodo_pago,estado_pago,total,iva_total,monto_pagado,clientes(nombre,tipo_identificacion,identificacion,direccion,telefono)").eq("id", id).maybeSingle(),
        supabase.from("detalle_ventas").select("id,nombre_producto,cantidad,precio_unitario,subtotal,iva_porcentaje").eq("venta_id", id).order("created_at"),
        supabase.from("negocios").select("nombre,razon_social,ruc,direccion,telefono,establecimiento,punto_emision").single(),
        supabase.from("pagos").select("id,monto,metodo_pago,nota,fecha").eq("venta_id", id).order("fecha"),
      ]);
      if (!a.data) return setNoExiste(true);
      setV(a.data as unknown as Venta); setLineas(b.data ?? []); setN(c.data); setPagos(d.data ?? []);
    }
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const abonar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true); setError("");
    const { error } = await supabase.rpc("registrar_pago", { p_venta_id: id, p_monto: Number(monto), p_metodo_pago: metodo });
    setGuardando(false);
    if (error) return setError(error.message);
    setMonto(""); cargar();
  };

  if (noExiste) return <p className="py-10 text-center text-slate-500">Factura no encontrada. <Link href="/facturas" className="text-brand-700">Volver</Link></p>;
  if (!v || !n) return null;

  const numero = `${n.establecimiento}-${n.punto_emision}-${String(v.numero).padStart(9, "0")}`;
  const base = v.total - v.iva_total;
  const saldo = v.total - v.monto_pagado;

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/facturas" className="font-semibold text-brand-700">← Volver a facturas</Link>
        <Btn onClick={() => window.print()}>Imprimir</Btn>
      </div>
      <Card className="mx-auto max-w-3xl">
        <div className="flex flex-wrap justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-xl font-bold">{n.razon_social || n.nombre}</p>
            {n.ruc && <p>RUC: {n.ruc}</p>}
            {n.direccion && <p className="text-sm text-slate-600">{n.direccion}</p>}
            {n.telefono && <p className="text-sm text-slate-600">Tel: {n.telefono}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Comprobante de venta</p>
            <p className="text-xl font-bold">N° {numero}</p>
            <p className="text-sm text-slate-600">{fechaCorta(v.fecha)}</p>
            <p className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${v.estado_pago === "pagada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {v.estado_pago === "pagada" ? "PAGADA" : "PENDIENTE DE PAGO"}
            </p>
          </div>
        </div>

        <div className="border-b py-4">
          <p className="text-sm text-slate-500">Cliente</p>
          {v.clientes ? (
            <>
              <p className="font-semibold">{v.clientes.nombre}</p>
              {v.clientes.identificacion && <p className="text-sm">{v.clientes.tipo_identificacion.toUpperCase()}: {v.clientes.identificacion}</p>}
              {v.clientes.direccion && <p className="text-sm text-slate-600">{v.clientes.direccion}</p>}
            </>
          ) : <p className="font-semibold">Consumidor final</p>}
        </div>

        <table className="mt-4 w-full text-left">
          <thead className="text-sm text-slate-500">
            <tr><th className="py-1">Descripción</th><th className="text-right">Cant.</th><th className="text-right">P. unit.</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y">
            {lineas.map((l) => (
              <tr key={l.id}>
                <td className="py-2">{l.nombre_producto}{l.iva_porcentaje !== null && <span className="text-xs text-slate-400"> (IVA {l.iva_porcentaje}%)</span>}</td>
                <td className="text-right">{l.cantidad}</td><td className="text-right">{money(l.precio_unitario)}</td><td className="text-right">{money(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-64 space-y-1 border-t pt-3">
          <div className="flex justify-between"><span>Subtotal sin IVA</span><span>{money(base)}</span></div>
          <div className="flex justify-between"><span>IVA</span><span>{money(v.iva_total)}</span></div>
          <div className="flex justify-between text-xl font-bold"><span>Total</span><span>{money(v.total)}</span></div>
          <p className="text-sm capitalize text-slate-500">Pago: {v.metodo_pago}</p>
        </div>
        {(pagos.length > 0 || saldo > 0) && (
          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 font-bold">Pagos</h3>
            {pagos.length > 0 && (
              <ul className="divide-y divide-slate-100 text-sm">
                {pagos.map((p) => (
                  <li key={p.id} className="flex justify-between py-1.5">
                    <span>{fechaCorta(p.fecha)} · <span className="capitalize">{p.metodo_pago}</span>{p.nota ? ` · ${p.nota}` : ""}</span>
                    <b>{money(p.monto)}</b>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex justify-between text-sm"><span>Pagado</span><b>{money(v.monto_pagado)}</b></div>
            <div className={`flex justify-between text-lg font-bold ${saldo > 0 ? "text-red-600" : "text-green-700"}`}>
              <span>Saldo pendiente</span><span>{money(saldo)}</span>
            </div>
            {saldo > 0 && (
              <form onSubmit={abonar} className="no-print mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Registrar abono</label>
                  <input className={inputCls + " !w-36"} type="number" min="0.01" step="0.01" max={saldo} required placeholder="Monto"
                    value={monto} onChange={(e) => setMonto(e.target.value)} />
                </div>
                <select className={inputCls + " !w-auto"} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option><option value="otros">Otros</option>
                </select>
                <Btn disabled={guardando}>{guardando ? "..." : "Abonar"}</Btn>
                <Btn type="button" variant="ghost" onClick={() => setMonto(String(saldo))}>Pagar todo</Btn>
                <div className="w-full"><ErrorMsg msg={error} /></div>
              </form>
            )}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-slate-400">Comprobante interno. No es una factura electrónica autorizada por el SRI.</p>
      </Card>
    </>
  );
}
