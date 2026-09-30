"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { whatsappLink } from "@/lib/sitio";
import { BotonCarrito } from "@/components/sitio/Carrito";

const ENLACES = [
  { href: "#catalogo", texto: "Catálogo" },
  { href: "#categorias", texto: "Categorías" },
  { href: "#delivery", texto: "Delivery" },
  { href: "#eventos", texto: "Eventos" },
  { href: "#contacto", texto: "Contacto" },
];

export default function SiteHeader() {
  const [abierto, setAbierto] = useState(false);
  const [conSesion, setConSesion] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setConSesion(!!data.session)).catch(() => setConSesion(false));
  }, []);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080808]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <a href="#inicio" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Punto Éxtasis" className="h-10 w-10 rounded-full" />
          <span className="hidden font-[family-name:var(--font-serif)] text-xl font-semibold tracking-[0.12em] text-[#f3ede3] sm:block">PUNTO ÉXTASIS</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-[#a8a29a] lg:flex">
          {ENLACES.map((e) => <a key={e.href} href={e.href} className="transition hover:text-[#f3ede3]">{e.texto}</a>)}
        </nav>

        <div className="flex items-center gap-3">
          <a href="/panel" title="Acceso del administrador" className="hidden items-center gap-2 text-sm text-[#a8a29a] transition hover:text-[#f3ede3] md:flex">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {conSesion ? "Ir a mi panel" : "Administración"}
          </a>
          <BotonCarrito />
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
            className="hidden rounded-full bg-[#994bbb] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8540a6] sm:block">
            Pedir por WhatsApp
          </a>
          <button onClick={() => setAbierto(!abierto)} aria-label="Menú" className="rounded-full border border-white/15 p-2.5 text-[#f3ede3] lg:hidden">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d={abierto ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
      </div>

      {abierto && (
        <nav className="border-t border-white/10 bg-[#0c0c0c] px-5 py-4 lg:hidden">
          <ul className="space-y-1">
            {ENLACES.map((e) => (
              <li key={e.href}><a href={e.href} onClick={() => setAbierto(false)} className="block py-2.5 text-[#f3ede3]">{e.texto}</a></li>
            ))}
            <li><a href="/panel" className="block py-2.5 text-[#a8a29a]">{conSesion ? "Ir a mi panel" : "Administración"}</a></li>
            <li className="pt-2">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="block rounded-full bg-[#994bbb] py-3 text-center font-semibold text-white">Pedir por WhatsApp</a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
