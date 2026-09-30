"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Icon, { type IconName } from "@/components/Icon";

type Item = { href: string; label: string; icon: IconName };

const NAV: Item[] = [
  { href: "/panel", label: "Inicio", icon: "home" },
  { href: "/ventas", label: "Nueva factura", icon: "plus" },
  { href: "/facturas", label: "Facturas", icon: "factura" },
  { href: "/clientes", label: "Clientes", icon: "clientes" },
  { href: "/productos", label: "Productos", icon: "producto" },
  { href: "/sitio-web", label: "Sitio web", icon: "sitio" },
  { href: "/compras", label: "Ingresar inventario", icon: "inventario" },
  { href: "/gastos", label: "Gastos", icon: "gastos" },
  { href: "/proveedores", label: "Proveedores", icon: "proveedores" },
  { href: "/categorias", label: "Categorías", icon: "categorias" },
  { href: "/reportes", label: "Reportes", icon: "reportes" },
];
const ASISTENTE: Item = { href: "/asistente", label: "Asistente IA", icon: "asistente" };
const NEGOCIO: Item = { href: "/configuracion", label: "Mi negocio", icon: "negocio" };
const SITIO: Item = { href: "/", label: "Ver sitio web", icon: "home" };

// Barra inferior del celular
const TABS: Item[] = [NAV[0], NAV[1], NAV[2], NAV[4]];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [negocio, setNegocio] = useState("");

  useEffect(() => {
    supabase.from("negocios").select("nombre").maybeSingle().then(({ data }) => setNegocio(data?.nombre ?? ""));
  }, []);

  const salir = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const activo = (href: string) =>
    href === "/" ? false
    : href === "/ventas" ? path === "/ventas"
    : href === "/facturas" ? path.startsWith("/facturas") || path.startsWith("/ventas/")
    : path.startsWith(href);

  const link = (n: Item) => (
    <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition ${
        activo(n.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>
      <Icon name={n.icon} />{n.label}
    </Link>
  );

  const logo = (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="h-9 w-9 rounded-full" />
      <span className="truncate font-[family-name:var(--font-serif)] text-lg font-semibold tracking-wide">{negocio || "Mi licorería"}</span>
    </div>
  );

  const menu = (
    <nav className="flex flex-col gap-1">
      {NAV.map(link)}
      <div className="my-2 border-t border-slate-200" />
      {link(ASISTENTE)}
      {link(NEGOCIO)}
      {link(SITIO)}
      <button onClick={salir} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-slate-500 hover:bg-slate-100">
        <Icon name="salir" />Salir
      </button>
    </nav>
  );

  return (
    <div className="tema-panel min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-panel p-4 lg:block">
        <div className="mb-6 px-1 pt-1">{logo}</div>
        {menu}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-panel px-4 py-3 lg:hidden">
        {logo}
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-panel p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            {menu}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${activo(t.href) ? "text-brand-700" : "text-slate-500"}`}>
            <Icon name={t.icon} className="h-6 w-6" />{t.label.replace(" IA", "")}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-slate-500">
          <Icon name="mas" className="h-6 w-6" />Más
        </button>
      </nav>
    </div>
  );
}
