export type Categoria = { id: string; nombre: string };
export type Proveedor = {
  id: string; nombre: string; empresa: string | null; ruc: string | null;
  telefono: string | null; correo: string | null; direccion: string | null;
};
export type Producto = {
  id: string; nombre: string; categoria_id: string | null; marca: string | null;
  presentacion: string | null; codigo_interno: string | null; codigo_barras: string | null;
  proveedor_id: string | null; stock: number; stock_minimo: number; costo: number;
  precio_venta: number; ganancia_unidad: number; ganancia_pct: number;
  iva_porcentaje: number | null; es_servicio: boolean; publicado: boolean; imagen_url: string | null;
};
