"use client";
import { useEffect, useState } from "react";

// Confirmación de mayoría de edad (se recuerda en este navegador)
export default function AgeGate() {
  const [estado, setEstado] = useState<"cargando" | "pedir" | "ok" | "menor">("cargando");

  useEffect(() => {
    let confirmado = false;
    try { confirmado = localStorage.getItem("mayor_de_edad") === "1"; } catch { /* sin almacenamiento */ }
    setEstado(confirmado ? "ok" : "pedir");
  }, []);

  if (estado === "ok" || estado === "cargando") return null;

  const si = () => {
    try { localStorage.setItem("mayor_de_edad", "1"); } catch { /* ignorar */ }
    setEstado("ok");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080808]/97 p-6">
      <div className="w-full max-w-md border border-[#c6a15b]/40 bg-[#0f0f0f] p-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Punto Éxtasis" className="mx-auto mb-6 h-24 w-24 rounded-full" />
        {estado === "pedir" ? (
          <>
            <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#f3ede3]">¿Eres mayor de 18 años?</h2>
            <p className="mt-3 text-sm text-[#a8a29a]">Este sitio promociona bebidas alcohólicas y está dirigido a personas mayores de edad.</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button onClick={si} className="rounded-full bg-[#994bbb] px-4 py-3 font-semibold text-white hover:bg-[#8540a6]">Sí, soy mayor</button>
              <button onClick={() => setEstado("menor")} className="rounded-full border border-white/20 px-4 py-3 text-[#f3ede3] hover:border-white/50">No</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#f3ede3]">Lo sentimos</h2>
            <p className="mt-3 text-sm text-[#a8a29a]">Solo personas mayores de 18 años pueden ingresar a este sitio.</p>
          </>
        )}
      </div>
    </div>
  );
}
