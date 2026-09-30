import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Mi Licorería",
  description: "Inventario, facturas, clientes y gastos para tu licorería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${serif.variable}`}>
      <body className="text-ink antialiased">{children}</body>
    </html>
  );
}
