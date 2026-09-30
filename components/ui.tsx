"use client";
import { ReactNode } from "react";
import { hoyISO } from "@/lib/format";
import Icon from "@/components/Icon";

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-panel px-4 py-3 text-base text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function Btn({
  variant = "primary", className = "", ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-brand-600 text-white hover:bg-[#8540a6]",
    ghost: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  }[variant];
  return (
    <button
      {...p}
      className={`rounded-xl px-5 py-3 text-base font-semibold transition disabled:opacity-50 ${v} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-panel p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <span className="mt-1 block h-px w-10 bg-[#c6a15b]" />
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="!p-3 sm:!p-5">
      <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
      <p className={`mt-1 text-lg font-bold sm:text-2xl ${tone}`}>{value}</p>
    </Card>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-panel p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><Icon name="cerrar" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-slate-400">{text}</p>;
}

export function ErrorMsg({ msg }: { msg: string }) {
  return msg ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{msg}</p> : null;
}

// ---- Filtro de fechas: Hoy / Semana / Mes / Personalizado ----
export type Periodo = { desde: string; hasta: string };

export function periodoPreset(p: "hoy" | "semana" | "mes"): Periodo {
  const d = new Date();
  if (p === "semana") d.setDate(d.getDate() - 6);
  if (p === "mes") d.setDate(1);
  return { desde: d.toLocaleDateString("en-CA"), hasta: hoyISO() };
}

export function FiltroPeriodo({ value, onChange }: { value: Periodo; onChange: (p: Periodo) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {(["hoy", "semana", "mes"] as const).map((p) => (
        <Btn key={p} variant="ghost" className="!px-4 !py-2" onClick={() => onChange(periodoPreset(p))}>
          {p === "hoy" ? "Hoy" : p === "semana" ? "Semana" : "Mes"}
        </Btn>
      ))}
      <input type="date" className={inputCls + " !w-[calc(50%-0.25rem)] !py-2 sm:!w-auto"} value={value.desde}
        onChange={(e) => onChange({ ...value, desde: e.target.value })} />
      <input type="date" className={inputCls + " !w-[calc(50%-0.25rem)] !py-2 sm:!w-auto"} value={value.hasta}
        onChange={(e) => onChange({ ...value, hasta: e.target.value })} />
    </div>
  );
}
