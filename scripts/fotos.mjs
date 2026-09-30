// Genera lib/fotos-manifest.json con las fotos disponibles en public/fotos
// (así funciona igual en local y en Vercel, donde no se puede leer public/ en tiempo de ejecución).
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const carpeta = "public/fotos";
if (!existsSync(carpeta)) mkdirSync(carpeta, { recursive: true });
const mapa = {};
for (const f of readdirSync(carpeta)) {
  const m = f.match(/^(.+)\.(jpe?g|png|webp)$/i);
  if (m) mapa[m[1].toLowerCase()] = `/fotos/${f}`;
}
writeFileSync("lib/fotos-manifest.json", JSON.stringify(mapa, null, 2) + "\n");
console.log(`fotos: ${Object.keys(mapa).length} encontradas`);
