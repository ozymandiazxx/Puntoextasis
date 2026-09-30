"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dinero, mensajePedido, whatsappLink, type DatosPedido, type ItemCarrito, type ProductoWeb } from "@/lib/sitio";
import Foto from "@/components/sitio/Foto";

type Ctx = {
  items: ItemCarrito[]; cantidad: number; total: number; abierto: boolean;
  agregar: (p: ProductoWeb) => void; cambiar: (id: string, delta: number) => void;
  abrir: () => void; cerrar: () => void;
};
const CarritoCtx = createContext<Ctx | null>(null);
const CLAVE = "carrito_punto_extasis";

export function useCarrito() {
  const c = useContext(CarritoCtx);
  if (!c) throw new Error("useCarrito fuera de CarritoProvider");
  return c;
}

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado) setItems(JSON.parse(guardado));
    } catch { /* sin almacenamiento */ }
    setListo(true);
  }, []);
  useEffect(() => {
    if (!listo) return;
    try { localStorage.setItem(CLAVE, JSON.stringify(items)); } catch { /* ignorar */ }
  }, [items, listo]);

  const agregar = useCallback((p: ProductoWeb) => {
    setItems((l) => {
      const ex = l.find((i) => i.id === p.id);
      if (ex) return l.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...l, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, imagen_url: p.imagen_url }];
    });
    setAbierto(true);
  }, []);
  const cambiar = useCallback((id: string, delta: number) => {
    setItems((l) => l.flatMap((i) => (i.id !== id ? [i] : i.cantidad + delta <= 0 ? [] : [{ ...i, cantidad: i.cantidad + delta }])));
  }, []);

  const valor = useMemo<Ctx>(() => ({
    items, abierto,
    cantidad: items.reduce((a, i) => a + i.cantidad, 0),
    total: items.reduce((a, i) => a + i.precio * i.cantidad, 0),
    agregar, cambiar, abrir: () => setAbierto(true), cerrar: () => setAbierto(false),
  }), [items, abierto, agregar, cambiar]);

  return <CarritoCtx.Provider value={valor}>{children}<Panel /><BarraPedido /></CarritoCtx.Provider>;
}

export function BotonCarrito() {
  const { cantidad, abrir } = useCarrito();
  return (
    <button onClick={abrir} aria-label={`Carrito, ${cantidad} productos`}
      className="relative rounded-full border border-white/15 p-2.5 text-[#f3ede3] transition hover:border-[#c6a15b]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {cantidad > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#994bbb] px-1 text-[11px] font-bold text-white">{cantidad}</span>
      )}
    </button>
  );
}

// Barra fija: siempre a un toque de enviar el pedido
function BarraPedido() {
  const { cantidad, total, abierto, abrir } = useCarrito();
  if (cantidad === 0 || abierto) return null;
  return (
    <button onClick={abrir}
      className="fixed inset-x-4 bottom-4 z-[60] flex items-center justify-between rounded-full bg-[#994bbb] px-6 py-4 font-semibold text-white shadow-2xl transition hover:bg-[#8540a6] sm:inset-x-auto sm:right-6 sm:w-80">
      <span>Ver pedido ({cantidad})</span>
      <span>{dinero(total)} →</span>
    </button>
  );
}

function Panel() {
  const { items, total, abierto, cerrar, cambiar } = useCarrito();
  const [datos, setDatos] = useState<DatosPedido>({ nombre: "", entrega: "domicilio", direccion: "", pago: "Efectivo", notas: "" });
  const cambiarDato = (c: Partial<DatosPedido>) => setDatos((d) => ({ ...d, ...c }));
  if (!abierto) return null;

  const campo = "w-full rounded-lg border border-white/15 bg-[#0d0d0d] px-4 py-3 text-sm text-[#f3ede3] outline-none placeholder:text-[#7d776e] focus:border-[#c6a15b]";
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/70" onClick={cerrar}>
      <aside className="flex h-full w-full max-w-md flex-col bg-[#101010] text-[#f3ede3]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h2 className="font-[family-name:var(--font-serif)] text-2xl font-semibold">Tu pedido</h2>
          <button onClick={cerrar} aria-label="Cerrar" className="text-3xl leading-none text-[#a8a29a] hover:text-white">×</button>
        </div>

        {items.length === 0 ? (
          <p className="flex-1 px-6 py-10 text-center text-[#a8a29a]">Aún no agregas productos.</p>
        ) : (
          <ul className="flex-1 divide-y divide-white/10 overflow-y-auto px-6">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <Foto src={i.imagen_url} alt={i.nombre} contener className="h-20 w-16 shrink-0 rounded-md bg-[#141414]" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{i.nombre}</p>
                  <p className="mt-1 text-sm text-[#a8a29a]">{dinero(i.precio)}</p>
                  <div className="mt-2 inline-flex items-center rounded-full border border-white/15">
                    <button className="h-8 w-8 text-lg" onClick={() => cambiar(i.id, -1)} aria-label="Quitar uno">−</button>
                    <span className="w-8 text-center text-sm">{i.cantidad}</span>
                    <button className="h-8 w-8 text-lg" onClick={() => cambiar(i.id, 1)} aria-label="Agregar uno">+</button>
                  </div>
                </div>
                <p className="font-medium">{dinero(i.precio * i.cantidad)}</p>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="space-y-3 border-t border-white/10 px-6 py-5">
            <div className="grid grid-cols-2 gap-2">
              {(["domicilio", "retiro"] as const).map((v) => (
                <button key={v} type="button" onClick={() => cambiarDato({ entrega: v })}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition ${datos.entrega === v ? "border-[#c6a15b] bg-[#c6a15b]/10 text-[#c6a15b]" : "border-white/15 text-[#a8a29a] hover:border-white/40"}`}>
                  {v === "domicilio" ? "Entrega a domicilio" : "Retiro en el local"}
                </button>
              ))}
            </div>
            <input className={campo} placeholder="Tu nombre (opcional)" value={datos.nombre} onChange={(e) => cambiarDato({ nombre: e.target.value })} />
            {datos.entrega === "domicilio" && (
              <input className={campo} placeholder="Dirección de entrega y referencia" value={datos.direccion} onChange={(e) => cambiarDato({ direccion: e.target.value })} />
            )}
            <select className={campo} value={datos.pago} onChange={(e) => cambiarDato({ pago: e.target.value })} aria-label="Forma de pago">
              {["Efectivo", "Transferencia", "Tarjeta"].map((o) => <option key={o} value={o}>Pago: {o}</option>)}
            </select>
            <input className={campo} placeholder="Observaciones (opcional)" value={datos.notas} onChange={(e) => cambiarDato({ notas: e.target.value })} />
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[#a8a29a]">Total</span>
              <span className="font-[family-name:var(--font-serif)] text-3xl font-semibold">{dinero(total)}</span>
            </div>
            <a href={whatsappLink(mensajePedido(items, datos))} target="_blank" rel="noopener noreferrer"
              className="block rounded-full bg-[#994bbb] py-3.5 text-center font-semibold text-white transition hover:bg-[#8540a6]">
              Enviar pedido por WhatsApp
            </a>
            <p className="text-center text-xs text-[#7d776e]">Confirmamos disponibilidad, costo de envío y forma de pago por WhatsApp.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
