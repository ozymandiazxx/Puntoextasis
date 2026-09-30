"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fechaCorta, money, rango } from "@/lib/format";
import { Card, Empty, FiltroPeriodo, PageHeader, Stat, inputCls, periodoPreset, type Periodo } from "@/components/ui";
import Icon from "@/components/Icon";

type Fila = {
  id: string; numero: number; fecha: string; metodo_pago: string; estado_pago: string;
  total: number; monto_pagado: number; clientes: { nombre: string } | null;
};

export default function ListadoFacturas() {
  const [per, setPer] = useState<Periodo>(periodoPreset("mes"));
  const [filas, setFilas] = useState<Fila[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"todas" | "pagada" | "pendiente">("todas");

  useEffect(() => {
    if (!per.desde || !per.hasta || per.desde > per.hasta) return;
    const { ini, fin } = rango(per.desde, per.hasta);
    supabase.from("ventas")
      .select("id,numero,fecha,metodo_pago,estado_pago,total,monto_pagado,clientes(nombre)")
      .gte("fecha", ini).lt("fecha", fin).order("fecha", { ascending: false }).limit(1000)
      .then(({ data }) => setFilas((data ?? []) as unknown as Fila[]));
  }, [per]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((f) =>
      (estado === "todas" || f.estado_pago === estado) &&
      (!t || String(f.numero).includes(t) || (f.clientes?.nombre ?? "consumidor final").toLowerCase().includes(t)));
  }, [filas, q, estado]);

  const facturado = visibles.reduce((a, f) => a + f.total, 0);
  const cobrado = visibles.reduce((a, f) => a + f.monto_pagado, 0);
  const pendiente = facturado - cobrado;

  return (
    <>
      <PageHeader title="Facturas">
        <Link href="/ventas" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-[#8540a6]">
          <Icon name="plus" className="h-5 w-5" />Nueva factura
        </Link>
      </PageHeader>

      <Card className="mb-4 space-y-3">
        <FiltroPeriodo value={per} onChange={setPer} />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className={inputCls} placeholder="Buscar por número o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-2">
            {([["todas", "Todas"], ["pagada", "Pagadas"], ["pendiente", "Pendientes"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setEstado(v)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${estado === v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-panel text-slate-600"}`}>{l}</button>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label={`Facturado (${visibles.length})`} value={money(facturado)} />
        <Stat label="Cobrado" value={money(cobrado)} tone="text-green-700" />
        <Stat label="Por cobrar" value={money(pendiente)} tone={pendiente > 0 ? "text-red-600" : ""} />
      </div>

      <Card className="overflow-x-auto !p-0">
        {visibles.length === 0 ? <Empty text="No hay facturas en este periodo" /> : (
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="p-3">N°</th><th className="p-3">Fecha</th><th className="p-3">Cliente</th>
                <th className="p-3 text-right">Total</th><th className="p-3 text-right">Saldo</th><th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((f) => {
                const saldo = f.total - f.monto_pagado;
                return (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="p-3"><Link href={`/ventas/${f.id}`} className="font-semibold text-brand-700">#{f.numero}</Link></td>
                    <td className="p-3 text-sm text-slate-500">{fechaCorta(f.fecha)}</td>
                    <td className="p-3">{f.clientes?.nombre ?? "Consumidor final"}</td>
                    <td className="p-3 text-right font-semibold">{money(f.total)}</td>
                    <td className={`p-3 text-right ${saldo > 0 ? "font-semibold text-red-600" : "text-slate-400"}`}>{money(saldo)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.estado_pago === "pagada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {f.estado_pago === "pagada" ? "Pagada" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
