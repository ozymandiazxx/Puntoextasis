"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hoyISO, money } from "@/lib/format";
import { Btn, Card, ErrorMsg, Field, PageHeader, inputCls } from "@/components/ui";
import Icon from "@/components/Icon";

type Ref = { id: string; nombre: string };
type Prod = Ref & { costo: number; precio_venta: number; codigo_barras: string | null };
type Linea = {
  nombre: string; cantidad: string; costo: string; precio_venta: string;
  marca: string; presentacion: string; codigo_barras: string;
  producto_id: string | null; categoria_id: string | null;
};
type Tipo = "proveedor" | "cliente" | "gasto" | "producto" | "ingreso" | "venta";
type Accion = {
  uid: number; tipo: Tipo; c: Record<string, string>;
  categoria_id: string | null; proveedor_id: string | null; cliente_id: string | null;
  items: Linea[]; error?: string;
};

const TITULOS: Record<Tipo, string> = {
  proveedor: "Nuevo proveedor", cliente: "Nuevo cliente", gasto: "Gasto", producto: "Nuevo producto",
  ingreso: "Ingreso de inventario", venta: "Factura de venta",
};
const CATS_GASTO = ["Compra de mercadería", "Servicios", "Transporte", "Arriendo", "Otros"];
const EJEMPLOS = [
  "Agrega un proveedor Distribuidora Andina, teléfono 0991234567",
  "Llegaron 10 whisky Buchanan's a 25 y 20 rones Abuelo a 12",
  "Registra un gasto de luz por 45 dólares",
  "Vendí 2 cervezas Pilsener a Juan Pérez, queda a crédito",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
const s = (v: any) => (v === null || v === undefined ? "" : String(v));
const nulo = (v: string) => v.trim() || null;

export default function Asistente() {
  const [texto, setTexto] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [prods, setProds] = useState<Prod[]>([]);
  const [provs, setProvs] = useState<Ref[]>([]);
  const [clientes, setClientes] = useState<Ref[]>([]);
  const [cats, setCats] = useState<Ref[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cargando, setCargando] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [foto, setFoto] = useState<{ url: string; data: string; mimeType: string } | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  // Reduce la foto (máx. 1600 px, JPEG) para que suba rápido y Gemini la analice bien
  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setProcesandoFoto(true); setError("");
    try {
      const img = await new Promise<HTMLImageElement>((ok, fail) => {
        const i = new Image();
        i.onload = () => ok(i); i.onerror = () => fail(new Error("img"));
        i.src = URL.createObjectURL(f);
      });
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala); canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", 0.85);
      setFoto({ url, data: url.split(",")[1], mimeType: "image/jpeg" });
    } catch {
      setError("No se pudo leer esa imagen. Prueba con otra foto (JPG o PNG).");
    }
    setProcesandoFoto(false);
  };

  const cargarListas = async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("productos").select("id,nombre,costo,precio_venta,codigo_barras").eq("activo", true).order("nombre"),
      supabase.from("proveedores").select("id,nombre").order("nombre"),
      supabase.from("categorias").select("id,nombre").order("nombre"),
      supabase.from("clientes").select("id,nombre").order("nombre"),
    ]);
    setProds(a.data ?? []); setProvs(b.data ?? []); setCats(c.data ?? []); setClientes(d.data ?? []);
  };
  useEffect(() => { cargarListas(); }, []);

  // Graba con el micrófono y Gemini transcribe: funciona en cualquier navegador
  const dictar = async () => {
    if (escuchando) { rec.current?.stop(); return; }
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setError("Tu navegador no permite grabar audio. Escribe el texto.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("No hay acceso al micrófono. Permítelo en el candado de la barra de direcciones y vuelve a intentar.");
    }
    const r = new MediaRecorder(stream);
    const partes: Blob[] = [];
    // Dictado instantáneo del navegador (Chrome/Edge). Si no da texto, se usa Gemini.
    const SRC = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let vivo = "";
    let srFin: Promise<void> = Promise.resolve();
    if (SRC) {
      try {
        const sr = new SRC();
        sr.lang = "es-EC"; sr.continuous = true; sr.interimResults = false;
        sr.onresult = (e: any) => { vivo = Array.from(e.results).map((x: any) => x[0].transcript).join(" ").trim(); };
        srFin = new Promise<void>((ok) => { sr.onend = () => ok(); sr.onerror = () => ok(); });
        sr.start();
        (r as any)._sr = sr;
      } catch { /* sin dictado del navegador: se usa Gemini */ }
    }
    r.ondataavailable = (e) => e.data.size && partes.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setEscuchando(false);
      try { (r as any)._sr?.stop(); } catch { /* */ }
      setTranscribiendo(true);
      await Promise.race([srFin, new Promise((ok) => setTimeout(ok, 1500))]);
      if (vivo) {
        setTexto((prev) => (prev ? prev + " " : "") + vivo);
        setTranscribiendo(false);
        return;
      }
      if (partes.length === 0) { setTranscribiendo(false); return; }
      try {
        const blob = new Blob(partes, { type: r.mimeType });
        const data = await new Promise<string>((ok, fail) => {
          const fr = new FileReader();
          fr.onload = () => ok(String(fr.result).split(",")[1]);
          fr.onerror = fail;
          fr.readAsDataURL(blob);
        });
        const resp = await fetch("/api/asistente", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: { data, mimeType: r.mimeType } }),
          signal: AbortSignal.timeout(100_000),
        });
        const j = await resp.json().catch(() => ({ error: "Respuesta inválida" }));
        if (!resp.ok) setError(j.error ?? "Error al transcribir");
        else if (j.texto) setTexto((prev) => (prev ? prev + " " : "") + j.texto);
        else setError("No se entendió el audio. Intenta de nuevo.");
      } catch {
        setError("No se pudo procesar el audio (tardó demasiado). Intenta de nuevo o escribe el texto.");
      }
      setTranscribiendo(false);
    };
    rec.current = r; r.start(); setEscuchando(true);
  };

  const interpretar = async () => {
    setCargando(true); setError(""); setOk(""); setAcciones([]);
    const resp = await fetch("/api/asistente", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, imagen: foto ? { data: foto.data, mimeType: foto.mimeType } : undefined, productos: prods, proveedores: provs, clientes, categorias: cats }),
      signal: AbortSignal.timeout(140_000),
    }).catch(() => null);
    if (!resp) { setCargando(false); return setError("Tardó demasiado. Intenta de nuevo."); }
    const j = await resp.json().catch(() => ({ error: "Respuesta inválida" }));
    setCargando(false);
    if (!resp.ok) return setError(j.error ?? "Error");
    if (!j.acciones?.length) return setError("No entendí qué registrar. Prueba con un ejemplo de los de arriba.");
    setAcciones(j.acciones.map((a: any, i: number): Accion => ({
      uid: i, tipo: a.tipo,
      c: {
        marca: s(a.marca), presentacion: s(a.presentacion), codigo_barras: s(a.codigo_barras),
        nombre: s(a.nombre), empresa: s(a.empresa), identificacion: s(a.identificacion), telefono: s(a.telefono),
        correo: s(a.correo), direccion: s(a.direccion), valor: s(a.valor), categoria_gasto: a.categoria_gasto ?? "Otros",
        descripcion: s(a.descripcion), fecha: a.fecha || hoyISO(), costo: s(a.costo), precio_venta: s(a.precio_venta),
        metodo_pago: a.metodo_pago ?? "efectivo", estado_pago: a.estado_pago ?? "pagada",
      },
      categoria_id: a.categoria_id ?? null, proveedor_id: a.proveedor_id ?? null, cliente_id: a.cliente_id ?? null,
      items: (a.items ?? []).map((it: any): Linea => {
        const ex = prods.find((p) => p.id === it.producto_id);
        return {
          nombre: it.nombre, cantidad: s(it.cantidad ?? 1),
          costo: s(it.costo ?? ex?.costo), precio_venta: s(it.precio_venta ?? ex?.precio_venta),
          marca: s(it.marca), presentacion: s(it.presentacion), codigo_barras: s(it.codigo_barras),
          producto_id: it.producto_id ?? null, categoria_id: it.categoria_id ?? null,
        };
      }),
    })));
  };

  const upd = (uid: number, cambios: Partial<Accion>) =>
    setAcciones((l) => l.map((a) => (a.uid === uid ? { ...a, ...cambios } : a)));
  const updC = (a: Accion, k: string, v: string) => upd(a.uid, { c: { ...a.c, [k]: v } });
  const updItem = (a: Accion, i: number, cambios: Partial<Linea>) =>
    upd(a.uid, { items: a.items.map((l, j) => (j === i ? { ...l, ...cambios } : l)) });

  // Ejecuta una acción; lanza Error si falla. Devuelve el id creado (proveedor/cliente) si aplica.
  const ejecutar = async (a: Accion, porDefecto: { proveedor: string | null; cliente: string | null }): Promise<string | null> => {
    const c = a.c;
    const prov = a.proveedor_id ?? porDefecto.proveedor;
    const cli = a.cliente_id ?? porDefecto.cliente;
    if (["proveedor", "cliente", "gasto", "producto"].includes(a.tipo) && !c.nombre.trim()) throw new Error("Falta el nombre");

    if (a.tipo === "proveedor") {
      const { data, error } = await supabase.from("proveedores").insert({
        nombre: c.nombre.trim(), empresa: nulo(c.empresa), ruc: nulo(c.identificacion),
        telefono: nulo(c.telefono), correo: nulo(c.correo), direccion: nulo(c.direccion),
      }).select("id").single();
      if (error) throw new Error(error.message);
      return data.id;
    }
    if (a.tipo === "cliente") {
      const { data, error } = await supabase.from("clientes").insert({
        nombre: c.nombre.trim(), tipo_identificacion: c.identificacion.trim().length === 13 ? "ruc" : "cedula",
        identificacion: nulo(c.identificacion), telefono: nulo(c.telefono), correo: nulo(c.correo), direccion: nulo(c.direccion),
      }).select("id").single();
      if (error) throw new Error(error.message);
      return data.id;
    }
    if (a.tipo === "gasto") {
      if (c.valor === "" || !(Number(c.valor) >= 0)) throw new Error("Falta el valor del gasto");
      const { error } = await supabase.from("gastos").insert({
        nombre: c.nombre.trim(), categoria: c.categoria_gasto, proveedor_id: prov,
        valor: Number(c.valor), fecha: c.fecha || hoyISO(), descripcion: nulo(c.descripcion),
      });
      if (error) throw new Error(error.message);
      return null;
    }
    if (a.tipo === "producto") {
      const { error } = await supabase.from("productos").insert({
        nombre: c.nombre.trim(), categoria_id: a.categoria_id, proveedor_id: prov, stock: 0,
        marca: nulo(c.marca), presentacion: nulo(c.presentacion), codigo_barras: nulo(c.codigo_barras),
        costo: Number(c.costo || 0), precio_venta: Number(c.precio_venta || 0), iva_porcentaje: 15,
      });
      if (error) throw new Error(error.message);
      return null;
    }

    if (a.items.length === 0) throw new Error("No hay productos");
    const items = [...a.items];
    if (a.tipo === "venta") {
      const falta = items.find((l) => !l.producto_id);
      if (falta) throw new Error(`No encontré "${falta.nombre}" en tu inventario. Créalo o ingrésalo primero.`);
      if (c.estado_pago === "pendiente" && !cli) throw new Error("Para vender a crédito elige un cliente");
      const { error } = await supabase.rpc("registrar_venta", {
        p_metodo_pago: c.metodo_pago, p_cliente_id: cli, p_estado_pago: c.estado_pago,
        p_items: items.map((l) => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad) })),
      });
      if (error) throw new Error(error.message);
      return null;
    }
    // ingreso: los productos nuevos se crean con stock 0 y la compra les suma el stock
    for (let i = 0; i < items.length; i++) {
      if (items[i].producto_id) continue;
      const { data, error } = await supabase.from("productos").insert({
        nombre: items[i].nombre.trim(), categoria_id: items[i].categoria_id, proveedor_id: prov, stock: 0,
        marca: nulo(items[i].marca), presentacion: nulo(items[i].presentacion), codigo_barras: nulo(items[i].codigo_barras),
        costo: Number(items[i].costo || 0), precio_venta: Number(items[i].precio_venta || 0), iva_porcentaje: 15,
      }).select("id").single();
      if (error) throw new Error(error.message);
      items[i] = { ...items[i], producto_id: data.id };
      updItem(a, i, { producto_id: data.id }); // si reintentas, no se duplica
    }
    const { error } = await supabase.rpc("registrar_compra", {
      p_proveedor_id: prov,
      p_items: items.map((l) => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad), costo: Number(l.costo || 0) })),
    });
    if (error) throw new Error(error.message);
    return null;
  };

  const confirmar = async () => {
    setCargando(true); setError(""); setOk("");
    const porDefecto = { proveedor: null as string | null, cliente: null as string | null };
    const fallidas = new Map<number, string>();
    let hechas = 0;
    for (const a of acciones) {
      try {
        const id = await ejecutar(a, porDefecto);
        if (a.tipo === "proveedor") porDefecto.proveedor = id;
        if (a.tipo === "cliente") porDefecto.cliente = id;
        hechas++;
      } catch (e) {
        fallidas.set(a.uid, (e as Error).message);
      }
    }
    setAcciones((l) => l.filter((a) => fallidas.has(a.uid)).map((a) => ({ ...a, error: fallidas.get(a.uid) })));
    if (hechas) {
      setOk(`Listo: ${hechas} ${hechas === 1 ? "acción registrada" : "acciones registradas"}.`);
      if (fallidas.size === 0) { setTexto(""); setFoto(null); }
    }
    if (fallidas.size) setError("Algunas acciones no se pudieron guardar. Revísalas abajo.");
    await cargarListas();
    setCargando(false);
  };

  const selectRef = (valor: string | null, lista: Ref[], vacio: string, onChange: (v: string | null) => void) => (
    <select className={inputCls} value={valor ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{vacio}</option>
      {lista.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
    </select>
  );
  const txt = (a: Accion, k: string, label: string, tipo = "text", extra: object = {}) => (
    <Field label={label}><input className={inputCls} type={tipo} value={a.c[k]} onChange={(e) => updC(a, k, e.target.value)} {...extra} /></Field>
  );

  const totalCompra = (a: Accion) => a.items.reduce((t, l) => t + Number(l.cantidad || 0) * Number(l.costo || 0), 0);

  return (
    <>
      <PageHeader title="Asistente IA" />
      <Card className="mb-4">
        <p className="mb-2 text-slate-600">
          Dicta, escribe o sube una foto (de un producto, de la factura de un proveedor, de un recibo) para registrar proveedores, clientes, gastos, productos, ingresos de inventario o facturas. Puedes pedir varias cosas a la vez. Revisarás todo antes de guardar.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {EJEMPLOS.map((e) => (
            <button key={e} type="button" onClick={() => setTexto(e)}
              className="rounded-full border border-slate-200 px-3 py-1 text-left text-xs text-slate-600 hover:border-brand-500">{e}</button>
          ))}
        </div>
        {foto && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt="Foto a analizar" className="h-20 w-20 rounded-lg object-cover" />
            <p className="flex-1 text-sm text-slate-600">Foto lista. Puedes añadir una instrucción (ej. «es un ingreso de 12 unidades») o pulsar Interpretar.</p>
            <button type="button" aria-label="Quitar foto" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setFoto(null)}><Icon name="cerrar" /></button>
          </div>
        )}
        <textarea className={inputCls} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe aquí o pulsa Dictar..." />
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant={escuchando ? "danger" : "ghost"} disabled={transcribiendo} onClick={dictar} className="inline-flex items-center gap-2">
            <Icon name="mic" className="h-5 w-5" />{transcribiendo ? "Transcribiendo..." : escuchando ? "Detener y transcribir" : "Dictar"}
          </Btn>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-base font-semibold text-slate-800 hover:bg-slate-200 ${procesandoFoto ? "opacity-50" : ""}`}>
            <Icon name="camara" className="h-5 w-5" />{procesandoFoto ? "Procesando..." : "Foto"}
            <input type="file" accept="image/*" className="hidden" onChange={elegirFoto} disabled={procesandoFoto} />
          </label>
          <Btn disabled={(!texto.trim() && !foto) || cargando} onClick={interpretar}>{cargando && acciones.length === 0 ? "Interpretando..." : "Interpretar"}</Btn>
        </div>
        <div className="mt-3 space-y-2">
          <ErrorMsg msg={error} />
          {ok && <p className="rounded-xl bg-green-50 px-4 py-3 text-green-700">{ok}</p>}
        </div>
      </Card>

      {acciones.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold">Revisa y confirma ({acciones.length})</h2>
          {acciones.map((a) => (
            <Card key={a.uid}>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{TITULOS[a.tipo]}</span>
                <button type="button" aria-label="Descartar" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                  onClick={() => setAcciones((l) => l.filter((x) => x.uid !== a.uid))}><Icon name="cerrar" /></button>
              </div>
              {a.error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{a.error}</p>}

              {(a.tipo === "proveedor" || a.tipo === "cliente") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {txt(a, "nombre", "Nombre *")}
                  {a.tipo === "proveedor" && txt(a, "empresa", "Empresa")}
                  {txt(a, "identificacion", "Cédula / RUC")}
                  {txt(a, "telefono", "Teléfono")}
                  {txt(a, "correo", "Correo", "email")}
                  {txt(a, "direccion", "Dirección")}
                </div>
              )}

              {a.tipo === "gasto" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {txt(a, "nombre", "Nombre del gasto *")}
                  {txt(a, "valor", "Valor *", "number", { min: 0, step: "0.01" })}
                  <Field label="Categoría">
                    <select className={inputCls} value={a.c.categoria_gasto} onChange={(e) => updC(a, "categoria_gasto", e.target.value)}>
                      {CATS_GASTO.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Field>
                  {txt(a, "fecha", "Fecha", "date")}
                  <Field label="Proveedor relacionado">{selectRef(a.proveedor_id, provs, "Ninguno", (v) => upd(a.uid, { proveedor_id: v }))}</Field>
                  {txt(a, "descripcion", "Descripción")}
                </div>
              )}

              {a.tipo === "producto" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {txt(a, "nombre", "Nombre *")}
                  <Field label="Categoría">{selectRef(a.categoria_id, cats, "Sin categoría", (v) => upd(a.uid, { categoria_id: v }))}</Field>
                  {txt(a, "marca", "Marca")}
                  {txt(a, "presentacion", "Presentación (750 ml, litro...)")}
                  {txt(a, "codigo_barras", "Código de barras")}
                  {txt(a, "costo", "Costo de compra", "number", { min: 0, step: "0.01" })}
                  {txt(a, "precio_venta", "Precio de venta", "number", { min: 0, step: "0.01" })}
                  <Field label="Proveedor">{selectRef(a.proveedor_id, provs, "Ninguno", (v) => upd(a.uid, { proveedor_id: v }))}</Field>
                </div>
              )}

              {(a.tipo === "ingreso" || a.tipo === "venta") && (
                <>
                  <div className="mb-3 grid gap-3 sm:grid-cols-3">
                    {a.tipo === "ingreso" ? (
                      <Field label="Proveedor">{selectRef(a.proveedor_id, provs, "Sin proveedor", (v) => upd(a.uid, { proveedor_id: v }))}</Field>
                    ) : (
                      <>
                        <Field label="Cliente">{selectRef(a.cliente_id, clientes, "Consumidor final", (v) => upd(a.uid, { cliente_id: v }))}</Field>
                        <Field label="Método de pago">
                          <select className={inputCls} value={a.c.metodo_pago} onChange={(e) => updC(a, "metodo_pago", e.target.value)}>
                            <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                            <option value="tarjeta">Tarjeta</option><option value="otros">Otros</option>
                          </select>
                        </Field>
                        <Field label="Estado">
                          <select className={inputCls} value={a.c.estado_pago} onChange={(e) => updC(a, "estado_pago", e.target.value)}>
                            <option value="pagada">Pagada</option><option value="pendiente">A crédito</option>
                          </select>
                        </Field>
                      </>
                    )}
                  </div>
                  <div className="space-y-3">
                    {a.items.map((l, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <input className={inputCls} value={l.nombre} disabled={!!l.producto_id} onChange={(e) => updItem(a, i, { nombre: e.target.value })} />
                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${l.producto_id ? "bg-green-100 text-green-700" : "bg-brand-100 text-brand-700"}`}>
                            {l.producto_id ? "Existente" : "Nuevo"}
                          </span>
                          <button type="button" aria-label="Quitar" className="rounded-full p-1.5 text-slate-400 hover:bg-panel"
                            onClick={() => upd(a.uid, { items: a.items.filter((_, j) => j !== i) })}><Icon name="cerrar" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Field label="Cantidad"><input className={inputCls} type="number" min="1" step="any" value={l.cantidad} onChange={(e) => updItem(a, i, { cantidad: e.target.value })} /></Field>
                          {a.tipo === "ingreso" && (
                            <>
                              <Field label="Costo c/u"><input className={inputCls} type="number" min="0" step="0.01" value={l.costo} onChange={(e) => updItem(a, i, { costo: e.target.value })} /></Field>
                              {!l.producto_id && (
                                <>
                                  <Field label="Marca"><input className={inputCls} value={l.marca} onChange={(e) => updItem(a, i, { marca: e.target.value })} /></Field>
                                  <Field label="Presentación"><input className={inputCls} value={l.presentacion} onChange={(e) => updItem(a, i, { presentacion: e.target.value })} /></Field>
                                  <Field label="Código de barras"><input className={inputCls} value={l.codigo_barras} onChange={(e) => updItem(a, i, { codigo_barras: e.target.value })} /></Field>
                                  <Field label="Precio venta"><input className={inputCls} type="number" min="0" step="0.01" value={l.precio_venta} onChange={(e) => updItem(a, i, { precio_venta: e.target.value })} /></Field>
                                  <Field label="Categoría">{selectRef(l.categoria_id, cats, "Sin categoría", (v) => updItem(a, i, { categoria_id: v }))}</Field>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {a.tipo === "ingreso" && <p className="mt-3 text-right font-semibold">Total compra: {money(totalCompra(a))}</p>}
                </>
              )}
            </Card>
          ))}
          <Btn className="w-full !py-4 text-lg" disabled={cargando} onClick={confirmar}>
            {cargando ? "Guardando..." : acciones.length === 1 ? "Confirmar y guardar" : `Confirmar y guardar las ${acciones.length} acciones`}
          </Btn>
        </div>
      )}
    </>
  );
}
