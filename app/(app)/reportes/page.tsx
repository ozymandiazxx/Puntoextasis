"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fechaCorta, money, rango } from "@/lib/format";
import { Card, Empty, FiltroPeriodo, PageHeader, Stat, periodoPreset, type Periodo } from "@/components/ui";

type Venta = { id: string; numero: number; fecha: string; total: number; ganancia: number; iva_total: number; metodo_pago: string };
type Gasto = { categoria: string; valor: number };
type Vendido = { nombre: string; cantidad: number; total: number; ganancia: number };

export default function Reportes() {
  const [per, setPer] = useState<Periodo>(periodoPreset("mes"));
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [vendidos, setVendidos] = useState<Vendido[]>([]);

  useEffect(() => {
    if (!per.desde || !per.hasta || per.desde > per.hasta) return;
    const { ini, fin } = rango(per.desde, per.hasta);
    (async () => {
      const [v, g, d] = await Promise.all([
        supabase.from("ventas").select("id,numero,fecha,total,ganancia,iva_total,metodo_pago")
          .gte("fecha", ini).lt("fecha", fin).order("fecha", { ascending: false }),
        supabase.from("gastos").select("categoria,valor").gte("fecha", per.desde).lte("fecha", per.hasta),
        supabase.from("detalle_ventas").select("nombre_producto,cantidad,subtotal,ganancia,ventas!inner(fecha)")
          .gte("ventas.fecha", ini).lt("ventas.fecha", fin),
      ]);
      setVentas(v.data ?? []); setGastos(g.data ?? []);
      const acc = new Map<string, Vendido>();
      (d.data ?? []).forEach((x) => {
        const a = acc.get(x.nombre_producto) ?? { nombre: x.nombre_producto, cantidad: 0, total: 0, ganancia: 0 };
        a.cantidad += x.cantidad; a.total += x.subtotal; a.ganancia += x.ganancia;
        acc.set(x.nombre_producto, a);
      });
      setVendidos([...acc.values()].sort((a, b) => b.cantidad - a.cantidad));
    })();
  }, [per]);

  const totalVentas = ventas.reduce((a, v) => a + v.total, 0);
  const gananciaBruta = ventas.reduce((a, v) => a + v.ganancia, 0);
  const iva = ventas.reduce((a, v) => a + v.iva_total, 0);
  const totalGastos = gastos.reduce((a, g) => a + g.valor, 0);
  // La mercadería ya está descontada en la ganancia (costo vs precio): no se resta dos veces
  const gastosOperativos = gastos.filter((g) => g.categoria !== "Compra de mercadería").reduce((a, g) => a + g.valor, 0);
  const utilidad = gananciaBruta - gastosOperativos;

  // ventas por día
  const porDia = new Map<string, { total: number; ganancia: number }>();
  ventas.forEach((v) => {
    const dia = new Date(v.fecha).toLocaleDateString("en-CA");
    const a = porDia.get(dia) ?? { total: 0, ganancia: 0 };
    a.total += v.total; a.ganancia += v.ganancia; porDia.set(dia, a);
  });
  const dias = [...porDia].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <>
      <PageHeader title="Reportes" />
      <Card className="mb-4"><FiltroPeriodo value={per} onChange={setPer} /></Card>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Stat label="Ventas" value={money(totalVentas)} />
        <Stat label="Ganancia en ventas" value={money(gananciaBruta)} tone="text-green-700" />
        <Stat label="Gastos" value={money(totalGastos)} tone="text-red-600" />
        <Stat label="Utilidad aproximada" value={money(utilidad)} tone={utilidad >= 0 ? "text-green-700" : "text-red-600"} />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Utilidad = ganancia en ventas − gastos (sin contar «Compra de mercadería», ya incluida en el costo).
        IVA incluido en ventas del periodo: {money(iva)}.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">Ventas y ganancia por día</h2>
          {dias.length === 0 ? <Empty text="Sin ventas en este periodo" /> : (
            <table className="w-full text-left">
              <thead className="text-sm text-slate-500"><tr><th className="py-1">Día</th><th className="text-right">Ventas</th><th className="text-right">Ganancia</th></tr></thead>
              <tbody className="divide-y">
                {dias.map(([dia, v]) => (
                  <tr key={dia}><td className="py-2">{dia}</td><td className="text-right">{money(v.total)}</td><td className="text-right text-green-700">{money(v.ganancia)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Productos vendidos</h2>
          {vendidos.length === 0 ? <Empty text="Sin ventas en este periodo" /> : (
            <table className="w-full text-left">
              <thead className="text-sm text-slate-500"><tr><th className="py-1">Producto</th><th className="text-right">Cant.</th><th className="text-right">Total</th><th className="text-right">Ganancia</th></tr></thead>
              <tbody className="divide-y">
                {vendidos.map((p) => (
                  <tr key={p.nombre}><td className="py-2">{p.nombre}</td><td className="text-right">{p.cantidad}</td><td className="text-right">{money(p.total)}</td><td className="text-right text-green-700">{money(p.ganancia)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-bold">Detalle de ventas</h2>
          {ventas.length === 0 ? <Empty text="Sin ventas en este periodo" /> : (
            <ul className="divide-y">
              {ventas.map((v) => (
                <li key={v.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>#{v.numero} <span className="text-sm text-slate-400">{fechaCorta(v.fecha)} · {v.metodo_pago}</span></span>
                  <span><b>{money(v.total)}</b> <span className="text-sm text-green-700">(+{money(v.ganancia)})</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
