import { supabase } from "@/lib/supabase/client";

// Reduce la imagen (JPEG, lado máximo configurable) y la sube al almacenamiento público.
// Devuelve la URL pública. Cada negocio sube solo a su propia carpeta.
export async function subirImagen(archivo: File, bucket: "productos" | "sitio", maxLado = 1000): Promise<string> {
  const img = await new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => fail(new Error("imagen no válida"));
    i.src = URL.createObjectURL(archivo);
  });
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, fail) =>
    canvas.toBlob((b) => (b ? ok(b) : fail(new Error("no se pudo procesar"))), "image/jpeg", 0.85));
  const { data: neg } = await supabase.from("negocios").select("id").single();
  const ruta = `${neg?.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(ruta, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
}
