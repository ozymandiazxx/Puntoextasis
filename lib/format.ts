export const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(n ?? 0));

export const fechaCorta = (d: string) =>
  new Date(d).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });

export const hoyISO = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

// Inicio/fin (ISO UTC) de un rango de fechas locales YYYY-MM-DD, fin exclusivo
export const rango = (desde: string, hasta: string) => {
  const ini = new Date(desde + "T00:00:00");
  const fin = new Date(hasta + "T00:00:00");
  fin.setDate(fin.getDate() + 1);
  return { ini: ini.toISOString(), fin: fin.toISOString() };
};

export const IVA_OPCIONES = [
  { value: "", label: "Sin IVA" },
  { value: "0", label: "IVA 0%" },
  { value: "8", label: "IVA 8%" },
  { value: "15", label: "IVA 15%" },
];
