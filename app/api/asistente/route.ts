import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Interpreta un dictado/texto con Gemini y devuelve una lista de ACCIONES estructuradas.
// La IA NO escribe en la base: el usuario revisa y confirma en la pantalla.
const MODELO = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const RESPALDO = "gemini-3.5-flash-lite";

// Reintenta ante saturación (503/429) y cae a un modelo más liviano
async function llamarGemini(apiKey: string, payload: object, modelos: string[] = [MODELO, "gemini-3.5-flash", "gemini-3.7-flash", RESPALDO]) {
  let ultimo: { ok: boolean; json: any; status: number } = { ok: false, json: null, status: 502 }; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (let i = 0; i < modelos.length; i++) {
    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelos[i]}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000), // nunca dejar colgada la petición
      });
    } catch {
      ultimo = { ok: false, json: { error: { message: "UNAVAILABLE: tiempo de espera agotado" } }, status: 502 };
      continue;
    }
    const json = await r.json().catch(() => null);
    ultimo = { ok: r.ok, json, status: r.ok ? 200 : 502 };
    if (r.ok || (r.status !== 503 && r.status !== 429)) return ultimo;
    await new Promise((res) => setTimeout(res, 800));
  }
  return ultimo;
}

type Ref = { id: string; nombre: string };

const TIPOS = ["proveedor", "cliente", "gasto", "producto", "ingreso", "venta"];
const CATEGORIAS_GASTO = ["Compra de mercadería", "Servicios", "Transporte", "Arriendo", "Otros"];
const str = (nullable = true) => ({ type: "STRING", nullable });
const num = () => ({ type: "NUMBER", nullable: true });

const schema = {
  type: "OBJECT",
  properties: {
    acciones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          tipo: { type: "STRING", enum: TIPOS },
          nombre: str(), marca: str(), presentacion: str(), codigo_barras: str(), empresa: str(), identificacion: str(), telefono: str(), correo: str(), direccion: str(),
          valor: num(), categoria_gasto: { type: "STRING", enum: CATEGORIAS_GASTO, nullable: true },
          descripcion: str(), fecha: str(),
          costo: num(), precio_venta: num(), categoria_id: str(),
          proveedor_id: str(), cliente_id: str(),
          metodo_pago: { type: "STRING", enum: ["efectivo", "transferencia", "tarjeta", "otros"], nullable: true },
          estado_pago: { type: "STRING", enum: ["pagada", "pendiente"], nullable: true },
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                nombre: { type: "STRING" }, cantidad: { type: "NUMBER" }, costo: num(), precio_venta: num(),
                marca: str(), presentacion: str(), codigo_barras: str(),
                producto_id: str(), categoria_id: str(),
              },
              required: ["nombre", "cantidad"],
            },
          },
        },
        required: ["tipo", "items"],
      },
    },
  },
  required: ["acciones"],
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta configurar GEMINI_API_KEY en el servidor" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);

  // Modo dictado: transcribe el audio grabado en el navegador
  if (body?.audio?.data) {
    const mime = String(body.audio.mimeType || "audio/webm").split(";")[0];
    if (String(body.audio.data).length > 6_000_000) {
      return NextResponse.json({ error: "El audio es muy largo. Dicta en partes más cortas." }, { status: 413 });
    }
    const { ok, json, status } = await llamarGemini(apiKey, {
      contents: [{ role: "user", parts: [
        { text: "Transcribe este audio en español, tal cual se dice. Devuelve solo el texto, sin comentarios." },
        { inlineData: { mimeType: mime, data: body.audio.data } },
      ] }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
    }, [RESPALDO, RESPALDO]);
    if (!ok) return NextResponse.json({ error: "No se pudo transcribir ahora. Intenta de nuevo o escribe el texto." }, { status });
    const t = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim();
    return NextResponse.json({ texto: t ?? "" });
  }

  const texto = String(body?.texto ?? "").slice(0, 2000).trim();
  const imagen = body?.imagen?.data ? { data: String(body.imagen.data), mimeType: String(body.imagen.mimeType || "image/jpeg").split(";")[0] } : null;
  if (imagen && (imagen.data.length > 6_000_000 || !imagen.mimeType.startsWith("image/"))) {
    return NextResponse.json({ error: "La imagen es muy pesada o no es válida. Prueba con otra foto." }, { status: 413 });
  }
  if (!texto && !imagen) return NextResponse.json({ error: "Escribe, dicta o sube una foto" }, { status: 400 });

  const lista = (x: unknown): (Ref & { codigo_barras?: string })[] =>
    Array.isArray(x) ? x.slice(0, 500).map((r: Ref & { codigo_barras?: string | null }) => ({
      id: String(r.id), nombre: String(r.nombre), ...(r.codigo_barras ? { codigo_barras: String(r.codigo_barras) } : {}),
    })) : [];
  const productos = lista(body?.productos);
  const proveedores = lista(body?.proveedores);
  const clientes = lista(body?.clientes);
  const categorias = lista(body?.categorias);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });

  const instruccion = `Eres el asistente administrativo de una licorería en Ecuador. Conviertes lo que dice el dueño en una lista de ACCIONES. Puede haber varias acciones en un mismo mensaje. Hoy es ${hoy}.
Tipos de acción (elige según el VERBO y el SUSTANTIVO, no asumas que todo es un producto):
- "proveedor": registrar/agregar/crear un proveedor (quien vende mercadería al negocio). Campos: nombre, empresa, identificacion (RUC o cédula), telefono, correo, direccion. Ej: "agrega un proveedor Distribuidora Andina, teléfono 0991234567".
- "cliente": registrar/agregar un cliente (a quien se le vende). Mismos campos que proveedor (sin empresa obligatoria).
- "gasto": registrar un gasto (luz, agua, arriendo, transporte, sueldos, etc.). Campos: nombre, valor, categoria_gasto, fecha (YYYY-MM-DD, por defecto hoy), descripcion, proveedor_id si se menciona uno de la lista.
- "producto": crear un producto nuevo SIN cargar stock. Campos: nombre, costo, precio_venta, categoria_id, proveedor_id.
- "ingreso": llegó/compró/cargar mercadería al inventario. Campos: items[] (nombre, cantidad, costo unitario, precio_venta opcional, producto_id, categoria_id) y proveedor_id.
- "venta": vendió/facturó productos. Campos: items[] (nombre, cantidad, producto_id), cliente_id si se menciona un cliente de la lista, metodo_pago (por defecto efectivo), estado_pago ("pendiente" si fue fiado/a crédito; si no, "pagada").
Si recibes una FOTO (con o sin texto), analízala así:
- Foto de producto(s) (botella, caja, pack, etiqueta): acción "ingreso" con un item por cada tipo de producto visible. nombre completo con marca y presentación (ej. "Whisky Buchanan's 12 años 750 ml"), marca, presentacion (ej. "750 ml"), cantidad = cuántas unidades se ven (1 si es una sola), codigo_barras solo si los dígitos se leen con claridad, costo/precio_venta solo si hay una etiqueta de precio legible. Si el texto del usuario pide crear/agregar el producto sin stock, usa "producto" en vez de "ingreso". Si coincide con un producto de PRODUCTOS (por nombre o codigo_barras), devuelve su producto_id.
- Foto de factura, nota de entrega o lista de un proveedor: acción "ingreso" con TODOS los productos, cantidades y costos unitarios que se lean; proveedor_id si el proveedor está en la lista.
- Foto de una factura de servicio (luz, agua, internet, arriendo...): acción "gasto" con nombre, valor total y fecha si se lee.
- Foto de una tarjeta de presentación: "proveedor" o "cliente" según el texto del usuario (si no dice, "proveedor").
- Nunca inventes lo que no se lee. Si la imagen no sirve, devuelve acciones vacío.
Reglas:
- Deja en null los campos que no se dijeron. NO inventes números, teléfonos ni datos.
- Si un producto/proveedor/cliente coincide con uno de las listas, devuelve su id y usa el nombre exacto de la lista; si no existe, id null y el nombre como se dijo.
- categoria_id: elige de CATEGORIAS la más adecuada para productos nuevos; si ninguna aplica, null.
- Números dichos en palabras van como número. Si un precio es total y no unitario, conviértelo a unitario.
- Si el mensaje no pide registrar nada (saludo, pregunta), devuelve acciones vacío.
PRODUCTOS: ${JSON.stringify(productos)}
PROVEEDORES: ${JSON.stringify(proveedores)}
CLIENTES: ${JSON.stringify(clientes)}
CATEGORIAS: ${JSON.stringify(categorias)}`;

  const payload = {
    systemInstruction: { parts: [{ text: instruccion }] },
    contents: [{ role: "user", parts: [
      { text: texto || "Analiza esta imagen y registra lo que corresponda." },
      ...(imagen ? [{ inlineData: { mimeType: imagen.mimeType, data: imagen.data } }] : []),
    ] }],
    // tope de salida + algo de variación: evita bucles degenerados (números infinitos)
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2, maxOutputTokens: 4096 },
  };
  const parsear = (j: any): any | null => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const o = JSON.parse(j.candidates[0].content.parts[0].text);
      return Array.isArray(o.acciones) ? o : null;
    } catch { return null; }
  };
  let { ok, json } = await llamarGemini(apiKey, payload);
  let salida = ok ? parsear(json) : null;
  if (ok && !salida) {
    // respuesta dañada o cortada: se reintenta con otros modelos (sin el liviano)
    const r2 = await llamarGemini(apiKey, payload, ["gemini-3.5-flash", "gemini-3.7-flash", MODELO]);
    ok = r2.ok; json = r2.json; salida = ok ? parsear(json) : null;
  }
  if (!ok) {
    const saturado = /high demand|overloaded|UNAVAILABLE|quota/i.test(JSON.stringify(json?.error ?? ""));
    return NextResponse.json(
      { error: saturado ? "Gemini está saturado en este momento. Intenta de nuevo en unos segundos." : `Gemini: ${json?.error?.message ?? "error"}` },
      { status: 502 }
    );
  }
  if (!salida) return NextResponse.json({ error: "No pude interpretar la respuesta. Intenta de nuevo." }, { status: 502 });
  try {
    // Solo se aceptan ids que existen en las listas enviadas
    const ids = (l: Ref[]) => new Set(l.map((x) => x.id));
    const pIds = ids(productos), cIds = ids(categorias), vIds = ids(proveedores), clIds = ids(clientes);
    const acciones = (Array.isArray(salida.acciones) ? salida.acciones : []).slice(0, 20);
    for (const a of acciones) {
      a.proveedor_id = vIds.has(a.proveedor_id) ? a.proveedor_id : null;
      a.cliente_id = clIds.has(a.cliente_id) ? a.cliente_id : null;
      a.categoria_id = cIds.has(a.categoria_id) ? a.categoria_id : null;
      a.items = (Array.isArray(a.items) ? a.items : []).slice(0, 50);
      for (const it of a.items) {
        it.producto_id = pIds.has(it.producto_id) ? it.producto_id : null;
        it.categoria_id = cIds.has(it.categoria_id) ? it.categoria_id : null;
      }
    }
    return NextResponse.json({ acciones });
  } catch {
    return NextResponse.json({ error: "No pude interpretar la respuesta. Intenta de nuevo." }, { status: 502 });
  }
}
