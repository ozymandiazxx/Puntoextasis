// Genera supabase/migracion_06_catalogo_inicial.sql desde assets-catalogo/catalogo_productos.json
import { readFileSync, writeFileSync } from "node:fs";
const env = readFileSync(".env.local", "utf8").replace(/\r/g, "");
const negocio = env.match(/NEGOCIO_PUBLICO_ID=(.+)/)[1].trim();
const items = JSON.parse(readFileSync("assets-catalogo/catalogo_productos.json", "utf8"));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const bonito = (s) => (s.toLowerCase().replace(/(^|[\s(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
  .replace(/\b(\d+)\s?(ml|lt|l|cl)\b/gi, (_, n, u) => `${n} ${/^l/i.test(u) && u.length === 1 ? "L" : u.toLowerCase() === "lt" ? "Lt" : u.toLowerCase()}`)).replace(/\bXl\b/g, "XL");
const cats = [...new Set(items.map((i) => i.category))];
let sql = `-- Migración 06: catálogo inicial (generado por scripts/catalogo-sql.mjs).\n-- Stock inicial 10 y costo 0 son marcadores: ajústalos en Productos.\n\n`;
sql += `insert into categorias (negocio_id, nombre) values\n${cats.map((c) => `  (${q(negocio)}, ${q(c)})`).join(",\n")}\non conflict (negocio_id, nombre) do nothing;\n\n`;
sql += `insert into productos (negocio_id, nombre, categoria_id, stock, costo, precio_venta, publicado, imagen_url)\nselect ${q(negocio)}, v.nombre, c.id, 10, 0, v.precio, true, v.img\nfrom (values\n`;
sql += items.map((i) => `  (${q(bonito(i.name))}, ${q(i.category)}, ${i.price}::numeric, ${q("/productos/" + i.source_image.replace("images/", ""))})`).join(",\n");
sql += `\n) as v(nombre, categoria, precio, img)\njoin categorias c on c.negocio_id = ${q(negocio)} and c.nombre = v.categoria\nwhere not exists (select 1 from productos p where p.negocio_id = ${q(negocio)} and p.nombre = v.nombre);\n`;
writeFileSync("supabase/migracion_06_catalogo_inicial.sql", sql);
console.log(items.length, "productos,", cats.length, "categorías");

// Corrige nombres de productos ya cargados con una versión anterior del formato.
const viejo = (s) => s.toLowerCase().replace(/(^|[\s(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
  .replace(/\b(\d+)\s?(ml|lt|l|cl)\b/gi, (_, n, u) => `${n} ${u.toUpperCase()}`);
const cambios = items.map((i) => [viejo(i.name), bonito(i.name)]).filter(([a, b]) => a !== b);
writeFileSync("supabase/migracion_07_nombres_catalogo.sql",
  `-- Migración 07: unifica el formato de los nombres (unidades en minúscula, XL).\n` +
  cambios.map(([a, b]) => `update productos set nombre = ${q(b)} where negocio_id = ${q(negocio)} and nombre = ${q(a)};`).join("\n") + "\n");
console.log(cambios.length, "nombres a corregir");

// Sixpack como producto aparte (mismo catálogo, sin cambiar el esquema ni la interfaz).
const packs = items.filter((i) => i.pack_price);
writeFileSync("supabase/migracion_08_sixpacks.sql",
  `-- Migración 08: sixpacks de cerveza como productos propios (precio del pack del catálogo).\n` +
  `insert into productos (negocio_id, nombre, categoria_id, stock, costo, precio_venta, publicado, imagen_url)\n` +
  `select p.negocio_id, v.nuevo, p.categoria_id, 10, 0, v.precio, true, p.imagen_url\nfrom (values\n` +
  packs.map((i) => `  (${q(bonito(i.name))}, ${q(/^sixpack/i.test(i.name) ? bonito(i.name) + " x6" : bonito(i.name) + " - Sixpack")}, ${i.pack_price}::numeric)`).join(",\n") +
  `\n) as v(base, nuevo, precio)\njoin productos p on p.negocio_id = ${q(negocio)} and p.nombre = v.base\n` +
  `where not exists (select 1 from productos x where x.negocio_id = p.negocio_id and x.nombre = v.nuevo);\n`);
console.log(packs.length, "sixpacks");
