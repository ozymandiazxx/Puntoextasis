"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fechaCorta, hoyISO, money, rango } from "@/lib/format";
import { Card, Empty } from "@/components/ui";
import Icon, { type IconName } from "@/components/Icon";

type Top = { nombre: string; cantidad: number };

const ACCESOS: { href: string; label: string; icon: IconName }[] = [
  { href: "/ventas", label: "Nueva factura", icon: "factura" },
  { href: "/compras", label: "Ingresar inventario", icon: "inventario" },
  { href: "/gastos", label: "Registrar gasto", icon: "gastos" },
  { href: "/clientes", label: "Clientes", icon: "clientes" },
  { href: "/asistente", label: "Asistente IA", icon: "asistente" },
];

function Titulo({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-bold">
      <Icon name={icon} className="h-5 w-5 text-brand-600" />{children}
    </h2>
  );
}

export default function Dashboard() {
  const [d, setD] = useState({ hoy: 0, mes: 0, ganancia: 0, nHoy: 0 });
  const [bajo, setBajo] = useState<{ id: string; nombre: string; stock: number; stock_minimo: number }[]>([]);
  const [gastos, setGastos] = useState<{ id: string; nombre: string; valor: number; fecha: string }[]>([]);
  const [top, setTop] = useState<Top[]>([]);
  const [ultimas, setUltimas] = useState<{ id: string; numero: number; fecha: string; total: number }[]>([]);

  useEffect(() => {
    const hoy = hoyISO();
    const mesIni = hoy.slice(0, 8) + "01";
    const hoyR = rango(hoy, hoy);
    const mesR = rango(mesIni, hoy);

    (async () => {
      const [{ data: ventasMes }, { data: prods }, { data: gs }, { data: det }] = await Promise.all([
        supabase.from("ventas").select("id,numero,fecha,total,ganancia")
          .gte("fecha", mesR.ini).lt("fecha", mesR.fin).order("fecha", { ascending: false }),
        supabase.from("productos").select("id,nombre,stock,stock_minimo").eq("activo", true).eq("es_servicio", false),
        supabase.from("gastos").select("id,nombre,valor,fecha").order("fecha", { ascending: false }).limit(5),
        supabase.from("detalle_ventas").select("nombre_producto,cantidad,created_at")
          .gte("created_at", mesR.ini).lt("created_at", mesR.fin),
      ]);

      const vm = ventasMes ?? [];
      const deHoy = vm.filter((v) => v.fecha >= hoyR.ini && v.fecha < hoyR.fin);
      setD({
        hoy: deHoy.reduce((a, v) => a + v.total, 0),
        nHoy: deHoy.length,
        mes: vm.reduce((a, v) => a + v.total, 0),
        ganancia: vm.reduce((a, v) => a + v.ganancia, 0),
      });
      setUltimas(vm.slice(0, 5));
      setBajo((prods ?? []).filter((p) => p.stock <= p.stock_minimo));
      setGastos(gs ?? []);

      const acc = new Map<string, number>();
      (det ?? []).forEach((x) => acc.set(x.nombre_producto, (acc.get(x.nombre_producto) ?? 0) + x.cantidad));
      setTop([...acc].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5));
    })();
  }, []);

  return (
    <>
      <div className="rounded-2xl border border-[#c6a15b]/30 bg-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Ventas de hoy</p>
        <p className="mt-2 font-[family-name:var(--font-serif)] text-5xl font-semibold text-ink sm:text-6xl">{money(d.hoy)}</p>
        <p className="mt-1 text-sm text-slate-500">{d.nHoy} {d.nHoy === 1 ? "factura" : "facturas"}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Ventas del mes</p>
            <p className="mt-0.5 text-xl font-bold">{money(d.mes)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Ganancia estimada del mes</p>
            <p className="mt-0.5 text-xl font-bold">{money(d.ganancia)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ACCESOS.map((a) => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-panel p-4 text-center max-sm:last:col-span-2 text-sm font-semibold transition hover:border-brand-500">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={a.icon} className="h-6 w-6" />
            </span>
            {a.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <Titulo icon="alerta">Poco stock</Titulo>
          {bajo.length === 0 ? <Empty text="Todo el inventario está bien" /> : (
            <ul className="divide-y divide-slate-100">
              {bajo.map((p) => (
                <li key={p.id} className="flex justify-between py-2.5">
                  <span>{p.nombre}</span>
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-semibold text-red-600">{p.stock} / mín. {p.stock_minimo}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Titulo icon="fuego">Más vendidos del mes</Titulo>
          {top.length === 0 ? <Empty text="Aún no hay ventas este mes" /> : (
            <ul className="divide-y divide-slate-100">
              {top.map((t, i) => (
                <li key={t.nombre} className="flex items-center justify-between py-2.5">
                  <span><span className="mr-2 text-slate-400">{i + 1}</span>{t.nombre}</span>
                  <span className="font-semibold">{t.cantidad} u.</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Titulo icon="recibo">Últimas facturas</Titulo>
          {ultimas.length === 0 ? <Empty text="Sin facturas todavía" /> : (
            <ul className="divide-y divide-slate-100">
              {ultimas.map((v) => (
                <li key={v.id} className="flex justify-between py-2.5">
                  <Link href={`/ventas/${v.id}`} className="hover:text-brand-700">#{v.numero} <span className="text-sm text-slate-400">{fechaCorta(v.fecha)}</span></Link>
                  <span className="font-semibold">{money(v.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Titulo icon="gastos">Gastos recientes</Titulo>
          {gastos.length === 0 ? <Empty text="Sin gastos registrados" /> : (
            <ul className="divide-y divide-slate-100">
              {gastos.map((g) => (
                <li key={g.id} className="flex justify-between py-2.5">
                  <span>{g.nombre} <span className="text-sm text-slate-400">{g.fecha}</span></span>
                  <span className="font-semibold">{money(g.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
