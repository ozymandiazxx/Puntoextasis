// Íconos de trazo (estilo lineal), sin dependencias
const ICONOS = {
  home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  factura: ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6M9 12h6"],
  clientes: ["M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1", "M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z", "M20 19v-1a4 4 0 0 0-3-3.9M15 3.3a4 4 0 0 1 0 7.4"],
  producto: ["M21 8 12 3 3 8v8l9 5 9-5z", "M3 8l9 5 9-5M12 13v8"],
  inventario: ["M3 13h5l1.5 3h5L16 13h5", "M5 13 7 5h10l2 8v6H3z", "M12 3v6M9.5 6.5 12 9l2.5-2.5"],
  gastos: ["M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 7l12-4v4M16 14h2"],
  proveedores: ["M2 6h11v10H2zM13 10h4l3 3v3h-7z", "M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"],
  categorias: ["M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z", "M8 8h.01"],
  reportes: ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  negocio: ["M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1", "M15 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM17 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"],
  asistente: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  mas: ["M5 12h.01M12 12h.01M19 12h.01"],
  plus: ["M12 5v14M5 12h14"],
  salir: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5M21 12H9"],
  mic: ["M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z", "M19 11a7 7 0 0 1-14 0M12 18v3"],
  alerta: ["M12 3 2 20h20z", "M12 10v4M12 17h.01"],
  fuego: ["M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"],
  recibo: ["M6 3h12v18l-3-2-3 2-3-2-3 2z"],
  cerrar: ["M6 6l12 12M18 6 6 18"],
  sitio: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3 12h18", "M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"],
  camara: ["M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z", "M16 13.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"],
} as const;

export type IconName = keyof typeof ICONOS;

export default function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {ICONOS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
