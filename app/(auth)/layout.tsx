/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tema-panel flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#c6a15b]/25 bg-panel px-8 py-10 sm:px-10">
        <img src="/logo.png" alt="Punto Éxtasis" className="mx-auto mb-8 h-24 w-24 rounded-full" />
        {children}
      </div>
      <Link href="/" className="mt-8 text-sm text-slate-500 transition hover:text-ink">← Volver al sitio web</Link>
    </div>
  );
}
