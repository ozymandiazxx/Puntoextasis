// Datos del negocio para el sitio público. Edítalos aquí.
export const NEGOCIO = {
  nombre: "Punto Éxtasis",
  whatsapp: "593967114704",
  telefono: "0967114704",
  horario: "14:00 – 02:00",
  ciudad: "Santo Domingo, Ecuador",
  direccion: "Av. Patricio Romero Barberi, entrada Juan Eulogio (abajo del Hostal Japón 7)",
  instagram: "https://www.instagram.com/puntoextasis__official/",
  instagramUsuario: "@PuntoExtasisEc",
  linktree: "https://linktr.ee/LicoreriaPunto_ExtasisEc",
  cobertura: "Santo Domingo",
  // Punto exacto del local: pega aquí las coordenadas (clic derecho sobre el pin en Google Maps → copiar coordenadas).
  // Ejemplo: { lat: -0.2531, lng: -79.1754 }. Si es null, el mapa se ubica por la dirección.
  // (Punto tomado del pin de Google Maps enviado por el negocio.)
  coordenadas: { lat: -0.2375247, lng: -79.1818009 } as { lat: number; lng: number } | null,
  // Confirma el tiempo real con el negocio antes de publicarlo como promesa:
  tiempoEntrega: "Te confirmamos el tiempo al hacer tu pedido",
};

export const CATALOGOS_PDF = [
  { titulo: "Catálogo 1", id: "1ULd7n5cLhi0RmOZkmtVvVKf947ooqgNR" },
  { titulo: "Catálogo 2", id: "195qckwW1qy_1-d8bmvwXdhWFYeWLOUBf" },
];

// Fotos: se colocan en public/fotos/<nombre>.jpg (o .png/.webp). Si falta, se muestra un marco de marca.
export const CATEGORIAS = [
  { nombre: "Whisky", foto: "categoria-whisky" },
  { nombre: "Ron", foto: "categoria-ron" },
  { nombre: "Vodka", foto: "categoria-vodka" },
  { nombre: "Vinos", foto: "categoria-vinos" },
  { nombre: "Cervezas", foto: "categoria-cervezas" },
  { nombre: "Tequila", foto: "categoria-tequila" },
  { nombre: "Snacks", foto: "categoria-snacks" },
];

export const MOMENTOS = [
  { titulo: "Reuniones", texto: "Una buena mesa, buena compañía y la botella correcta.", foto: "momento-reuniones" },
  { titulo: "Celebraciones", texto: "Brindis para cada logro, grande o pequeño.", foto: "momento-celebraciones" },
  { titulo: "Eventos", texto: "Te ayudamos a abastecer tu evento sin complicaciones.", foto: "momento-eventos" },
  { titulo: "Regalos", texto: "Una botella bien elegida siempre acierta.", foto: "momento-regalos" },
];

export const EVENTOS = [
  { titulo: "Fiestas", texto: "Cotiza tus botellas para la fiesta y coordinamos la entrega." },
  { titulo: "Cumpleaños", texto: "Arma tu pedido para celebrar como se merece." },
  { titulo: "Reuniones", texto: "Licores y snacks para una noche con amigos." },
  { titulo: "Promociones especiales", texto: "Pregunta por las promociones vigentes de la semana." },
];

export const FOTOS_ESPERADAS = ["hero", ...CATEGORIAS.map((c) => c.foto), ...MOMENTOS.map((m) => m.foto)];

export type ProductoWeb = {
  id: string; nombre: string; marca: string | null; presentacion: string | null;
  categoria: string | null; precio: number; imagen_url: string | null; disponible: boolean;
};

// Normaliza para comparar categorías ("Vinos" = "Vino", "Cervezas" = "Cerveza")
export const claveCategoria = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/s$/, "").trim();

export const whatsappLink = (mensaje = "Hola Punto Éxtasis, quiero hacer un pedido") =>
  `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;

export const dinero = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

export type ItemCarrito = { id: string; nombre: string; precio: number; cantidad: number; imagen_url: string | null };

export type DatosPedido = {
  nombre: string; entrega: "domicilio" | "retiro"; direccion: string; pago: string; notas: string;
};

export const mensajePedido = (items: ItemCarrito[], d: DatosPedido) => {
  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const lineas = items.map((i) => `• ${i.cantidad} x ${i.nombre} — ${dinero(i.precio * i.cantidad)}`);
  return [
    "Hola Punto Éxtasis, quiero hacer este pedido:",
    "",
    ...lineas,
    "",
    `Total: ${dinero(total)} (precios con IVA incluido)`,
    d.entrega === "domicilio"
      ? `Entrega: a domicilio${d.direccion.trim() ? ` — ${d.direccion.trim()}` : ""}`
      : "Entrega: retiro en el local",
    `Forma de pago: ${d.pago}`,
    d.nombre.trim() ? `Nombre: ${d.nombre.trim()}` : "",
    d.notas.trim() ? `Observaciones: ${d.notas.trim()}` : "",
  ].filter((l, k, arr) => l !== "" || (k > 0 && arr[k - 1] !== "")).join("\n");
};

const consultaMapa = NEGOCIO.coordenadas
  ? `${NEGOCIO.coordenadas.lat},${NEGOCIO.coordenadas.lng}`
  : `${NEGOCIO.direccion}, ${NEGOCIO.ciudad}`;
export const mapaAbrir = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consultaMapa)}`;
export const mapaEmbed = `https://www.google.com/maps?q=${encodeURIComponent(consultaMapa)}&z=17&output=embed`;
export const driveVista = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
export const driveAbrir = (id: string) => `https://drive.google.com/file/d/${id}/view`;
