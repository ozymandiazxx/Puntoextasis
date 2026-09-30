/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AgeGate from "@/components/sitio/AgeGate";
import { CarritoProvider } from "@/components/sitio/Carrito";
import Catalogo from "@/components/sitio/Catalogo";
import Catalogos from "@/components/sitio/Catalogos";
import Foto from "@/components/sitio/Foto";
import SiteHeader from "@/components/sitio/SiteHeader";
import fotos from "@/lib/fotos-manifest.json";
import {
  CATEGORIAS, EVENTOS, MOMENTOS, NEGOCIO, mapaAbrir, mapaEmbed, whatsappLink, type ProductoWeb,
} from "@/lib/sitio";

const fotoManifest = (nombre: string): string | null => (fotos as Record<string, string>)[nombre] ?? null;

async function cargarFotosSitio(): Promise<Record<string, string>> {
  const negocio = process.env.NEGOCIO_PUBLICO_ID;
  if (!negocio) return {};
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await supabase.rpc("sitio_fotos_publico", { p_negocio: negocio });
    return Object.fromEntries((data ?? []).map((f: { clave: string; url: string }) => [f.clave, f.url]));
  } catch {
    return {};
  }
}

async function cargarProductos(): Promise<ProductoWeb[]> {
  const negocio = process.env.NEGOCIO_PUBLICO_ID;
  if (!negocio) return [];
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.rpc("catalogo_publico", { p_negocio: negocio });
    if (error || !data) return [];
    return data.map((p: Record<string, unknown>) => ({ ...p, precio: Number(p.precio) })) as ProductoWeb[];
  } catch {
    return [];
  }
}

const iconoRed = "h-5 w-5";
const Red = ({ href, nombre, children }: { href: string; nombre: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={nombre} title={nombre}
    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#c9c3b8] transition hover:border-[#c6a15b] hover:text-[#c6a15b]">
    {children}
  </a>
);

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#c6a15b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>
);

function Titulo({ etiqueta, titulo, texto }: { etiqueta: string; titulo: string; texto?: string }) {
  return (
    <div className="mb-12 max-w-2xl">
      <p className="text-xs uppercase tracking-[0.3em] text-[#c6a15b]">{etiqueta}</p>
      <h2 className="mt-3 font-[family-name:var(--font-serif)] text-4xl font-semibold leading-tight sm:text-5xl">{titulo}</h2>
      {texto && <p className="mt-4 text-[#a8a29a]">{texto}</p>}
    </div>
  );
}

const Seccion = ({ id, children, fondo = "" }: { id: string; children: React.ReactNode; fondo?: string }) => (
  <section id={id} className={`scroll-mt-16 ${fondo}`}>
    <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">{children}</div>
  </section>
);

export default async function Sitio({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const [productos, fotosDB] = await Promise.all([cargarProductos(), cargarFotosSitio()]);
  const foto = (nombre: string): string | null => fotosDB[nombre] ?? fotoManifest(nombre);
  const heroFoto = foto("hero");

  const botonPrimario = "inline-flex items-center justify-center rounded-full bg-[#994bbb] px-8 py-3.5 font-semibold text-white transition hover:bg-[#8540a6]";
  const botonSecundario = "inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3.5 font-semibold text-[#f3ede3] transition hover:border-[#c6a15b] hover:text-[#c6a15b]";

  return (
    <CarritoProvider>
      <AgeGate />
      <SiteHeader />

      {/* 1. HERO */}
      <section id="inicio" className="relative isolate overflow-hidden border-b border-white/10">
        {heroFoto && <img src={heroFoto} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
        <div className={`absolute inset-0 -z-10 ${heroFoto ? "bg-black/65" : "bg-[#0c0c0c]"}`} />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-5 py-20 text-center sm:py-32">
          <img src="/logo.png" alt="Punto Éxtasis Licorería" className="h-36 w-36 rounded-full sm:h-44 sm:w-44" />
          <p className="mt-10 text-xs uppercase tracking-[0.35em] text-[#c6a15b]">Santo Domingo · Ecuador</p>
          <h1 className="mt-4 font-[family-name:var(--font-serif)] text-5xl font-semibold leading-[1.05] sm:text-7xl">
            Punto Éxtasis, tu licorería premium en Santo Domingo
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#c9c3b8]">
            Licores premium, buenos precios y delivery rápido hasta tu puerta.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={botonPrimario}>Pedir por WhatsApp</a>
            <a href="#catalogo" className={botonSecundario}>Ver catálogo</a>
          </div>
          <ul className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-[#c9c3b8]">
            {["Productos originales", "Delivery en Santo Domingo", "Atención personalizada"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. CATEGORÍAS */}
      <Seccion id="categorias">
        <Titulo etiqueta="Explora" titulo="Nuestras categorías" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {CATEGORIAS.map((c, i) => (
            <Link key={c.nombre} href={`/?cat=${encodeURIComponent(c.nombre)}#catalogo`} scroll
              className={`group relative block h-56 overflow-hidden rounded-lg sm:h-72 ${i === 0 ? "md:col-span-2" : ""}`}>
              <Foto src={foto(c.foto)} alt={c.nombre} className="h-full w-full transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/35 transition group-hover:bg-black/20" />
              <div className="absolute bottom-0 left-0 p-5">
                <p className="font-[family-name:var(--font-serif)] text-3xl font-semibold">{c.nombre}</p>
                <span className="mt-2 block h-px w-8 bg-[#c6a15b] transition-all group-hover:w-16" />
              </div>
            </Link>
          ))}
        </div>
      </Seccion>

      {/* 3. CATÁLOGO DESTACADO */}
      <Seccion id="catalogo" fondo="border-y border-white/10 bg-[#0d0d0d]">
        <Titulo etiqueta="Tienda" titulo="Catálogo destacado" texto="Precios finales con IVA incluido. Agrega tus productos y envía el pedido por WhatsApp." />
        <Catalogo productos={productos} categoriaInicial={cat} />
        <div className="mt-16"><Catalogos /></div>
      </Seccion>

      {/* 4. EXPERIENCIA DE MARCA */}
      <Seccion id="momentos">
        <Titulo etiqueta="Experiencia" titulo="No solo vendemos licor, creamos momentos." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {MOMENTOS.map((m) => (
            <figure key={m.titulo}>
              <Foto src={foto(m.foto)} alt={m.titulo} className="aspect-[3/4] w-full rounded-lg" />
              <figcaption className="mt-4">
                <p className="font-[family-name:var(--font-serif)] text-2xl font-semibold">{m.titulo}</p>
                <p className="mt-1 text-sm text-[#a8a29a]">{m.texto}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Seccion>

      {/* 5. DELIVERY */}
      <Seccion id="delivery" fondo="border-y border-white/10 bg-[#0d0d0d]">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <Titulo etiqueta="Delivery" titulo="Pide tu botella sin salir de casa" texto="Un proceso simple, directo por WhatsApp." />
            <ol className="space-y-7">
              {[
                ["Escríbenos", "Cuéntanos qué botellas quieres o envía tu pedido desde el carrito."],
                ["Confirmamos", "Verificamos disponibilidad, precio y forma de pago."],
                ["Te lo llevamos", "Recibes tu pedido en la puerta de tu casa."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-5">
                  <span className="font-[family-name:var(--font-serif)] text-4xl font-semibold text-[#c6a15b]">{i + 1}</span>
                  <div><p className="text-lg font-medium">{t}</p><p className="text-[#a8a29a]">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#080808] p-8 sm:p-10">
            <dl className="space-y-6">
              <div><dt className="text-xs uppercase tracking-[0.25em] text-[#c6a15b]">WhatsApp</dt><dd className="mt-1 text-xl">{NEGOCIO.telefono}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Cobertura</dt><dd className="mt-1 text-xl">{NEGOCIO.cobertura}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Tiempo estimado</dt><dd className="mt-1 text-xl">{NEGOCIO.tiempoEntrega}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Horario</dt><dd className="mt-1 text-xl">{NEGOCIO.horario}</dd></div>
            </dl>
            <a href={whatsappLink("Hola Punto Éxtasis, quiero pedir a domicilio")} target="_blank" rel="noopener noreferrer" className={`${botonPrimario} mt-9 w-full`}>
              Pedir por WhatsApp
            </a>
          </div>
        </div>
      </Seccion>

      {/* 6. EVENTOS Y PROMOCIONES */}
      <Seccion id="eventos">
        <Titulo etiqueta="Eventos y promociones" titulo="Para cada ocasión" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EVENTOS.map((e) => (
            <div key={e.titulo} className="flex flex-col rounded-lg border border-white/10 p-7 transition hover:border-[#c6a15b]/60">
              <p className="font-[family-name:var(--font-serif)] text-2xl font-semibold">{e.titulo}</p>
              <p className="mt-3 flex-1 text-sm text-[#a8a29a]">{e.texto}</p>
              <a href={whatsappLink(`Hola Punto Éxtasis, quiero información sobre: ${e.titulo}`)} target="_blank" rel="noopener noreferrer"
                className="mt-6 text-sm font-semibold text-[#c6a15b] hover:underline">Consultar →</a>
            </div>
          ))}
        </div>
      </Seccion>

      {/* 7. FOOTER */}
      <footer id="contacto" className="border-t border-white/10 bg-[#050505]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src="/logo.png" alt="Punto Éxtasis" className="h-16 w-16 rounded-full" />
            <p className="mt-4 text-sm text-[#a8a29a]">Tu licorería premium en {NEGOCIO.ciudad}.</p>
          </div>
          <div className="text-sm">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Ubicación</p>
            <p className="text-[#c9c3b8]">{NEGOCIO.direccion}</p>
            <p className="text-[#a8a29a]">{NEGOCIO.ciudad}</p>
            <a href={mapaAbrir} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[#c6a15b] hover:underline">Cómo llegar →</a>
          </div>
          <div className="text-sm">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Contacto y horarios</p>
            <p><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="text-[#c9c3b8] hover:text-white">WhatsApp {NEGOCIO.telefono}</a></p>
            <p className="mt-2 text-[#a8a29a]">Horario: {NEGOCIO.horario}</p>
          </div>
          <div className="text-sm">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[#c6a15b]">Redes</p>
            <div className="flex gap-3">
              <Red href={NEGOCIO.instagram} nombre={`Instagram ${NEGOCIO.instagramUsuario}`}>
                <svg viewBox="0 0 24 24" className={iconoRed} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" />
                </svg>
              </Red>
              <Red href={whatsappLink()} nombre={`WhatsApp ${NEGOCIO.telefono}`}>
                <svg viewBox="0 0 24 24" className={iconoRed} fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.900-1.400A10 10 0 1 0 12 2zm0 18.100a8.100 8.100 0 0 1-4.200-1.200l-.300-.200-2.900.800.800-2.800-.200-.300A8.100 8.100 0 1 1 12 20.100zm4.400-5.700c-.2-.1-1.400-.7-1.600-.8s-.4-.1-.5.100l-.7.900c-.1.200-.3.200-.5.100a6.600 6.600 0 0 1-3.300-2.900c-.2-.4.200-.4.700-1.300.1-.2 0-.3 0-.4l-.7-1.700c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.100-.6.300-.2.300-.9.900-.9 2.200s.9 2.500 1 2.700c.1.200 1.800 2.800 4.400 3.900 1.600.7 2.200.7 3 .6.500-.1 1.400-.6 1.600-1.200.2-.6.200-1.100.1-1.200l-.5-.3z" />
                </svg>
              </Red>
              <Red href={NEGOCIO.linktree} nombre="Todos nuestros enlaces">
                <svg viewBox="0 0 24 24" className={iconoRed} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1" /><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" />
                </svg>
              </Red>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-14">
          <iframe title="Mapa: ubicación de Punto Éxtasis" src={mapaEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            className="h-72 w-full rounded-lg border border-white/10 sm:h-96" />
        </div>
        <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-[#7d776e]">
          <p>Prohibida la venta de bebidas alcohólicas a menores de 18 años. Consume con responsabilidad.</p>
          <p className="mt-2">© {new Date().getFullYear()} Punto Éxtasis · <Link href="/panel" className="text-[#a8a29a] underline-offset-4 hover:text-white hover:underline">Administración</Link></p>
        </div>
      </footer>
    </CarritoProvider>
  );
}
