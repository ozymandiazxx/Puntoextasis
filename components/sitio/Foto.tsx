/* eslint-disable @next/next/no-img-element */
// Foto con marco de marca cuando todavía no hay imagen (sin fotos falsas).
export default function Foto({ src, alt, className = "", contener = false }: {
  src?: string | null; alt: string; className?: string; contener?: boolean;
}) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={`${className} ${contener ? "object-contain p-4" : "object-cover"}`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center bg-[#141414]`} role="img" aria-label={alt}>
      <img src="/logo.png" alt="" className="h-1/3 max-h-24 w-auto rounded-full opacity-25 grayscale" />
    </div>
  );
}
