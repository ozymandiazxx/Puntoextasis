import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Punto Éxtasis | Licorería premium en Santo Domingo",
  description: "Licores premium, buenos precios y delivery rápido hasta tu puerta en Santo Domingo, Ecuador.",
};

export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return <div className={`min-h-screen bg-[#080808] text-[#f3ede3]`}>{children}</div>;
}
