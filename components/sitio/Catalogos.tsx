"use client";
import { useState } from "react";
import { CATALOGOS_PDF, driveAbrir, driveVista } from "@/lib/sitio";

// Catálogos en PDF (Drive): visor dentro del sitio
export default function Catalogos() {
  const [abierto, setAbierto] = useState<string | null>(null);
  const actual = CATALOGOS_PDF.find((c) => c.id === abierto);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[#a8a29a]">Catálogos completos en PDF</p>
        {CATALOGOS_PDF.map((c) => (
          <button key={c.id} onClick={() => setAbierto(c.id)}
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-[#f3ede3] transition hover:border-[#c6a15b] hover:text-[#c6a15b]">
            {c.titulo}
          </button>
        ))}
      </div>

      {actual && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 p-3 sm:p-6" onClick={() => setAbierto(null)}>
          <div className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between text-[#f3ede3]" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium">{actual.titulo}</p>
            <div className="flex items-center gap-5">
              <a href={driveAbrir(actual.id)} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c6a15b] underline">Abrir en Drive</a>
              <button onClick={() => setAbierto(null)} aria-label="Cerrar" className="text-3xl leading-none">×</button>
            </div>
          </div>
          <iframe src={driveVista(actual.id)} title={actual.titulo} allow="autoplay"
            className="mx-auto w-full max-w-5xl flex-1 rounded-lg bg-white" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
