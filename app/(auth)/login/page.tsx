"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Btn, ErrorMsg, Field, inputCls } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError("Correo o contraseña incorrectos"); setCargando(false); return; }
    router.replace("/panel");
    router.refresh();
  };

  return (
    <form onSubmit={entrar} className="space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#c6a15b]">Punto Éxtasis</p>
        <h1 className="mt-2 font-[family-name:var(--font-serif)] text-4xl font-semibold">Administración</h1>
        <span className="mx-auto mt-3 block h-px w-10 bg-[#c6a15b]" />
        <p className="mt-3 text-sm text-slate-500">Acceso solo para el personal autorizado.</p>
      </div>
      <Field label="Correo">
        <input className={inputCls} type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Contraseña">
        <input className={inputCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <ErrorMsg msg={error} />
      <Btn className="w-full !py-3.5" disabled={cargando}>{cargando ? "Entrando..." : "Entrar"}</Btn>
    </form>
  );
}
