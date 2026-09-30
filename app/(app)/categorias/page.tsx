"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Btn, Card, Empty, ErrorMsg, PageHeader, inputCls } from "@/components/ui";
import type { Categoria } from "@/lib/types";

export default function Categorias() {
  const [lista, setLista] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("categorias").select("id,nombre").order("nombre");
    setLista(data ?? []);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.from("categorias").insert({ nombre: nombre.trim() });
    if (error) return setError(error.code === "23505" ? "Esa categoría ya existe" : error.message);
    setNombre(""); cargar();
  };

  const eliminar = async (c: Categoria) => {
    if (!confirm(`¿Eliminar "${c.nombre}"? Los productos quedarán sin categoría.`)) return;
    await supabase.from("categorias").delete().eq("id", c.id);
    cargar();
  };

  return (
    <>
      <PageHeader title="Categorías" />
      <Card className="mb-4">
        <form onSubmit={crear} className="flex gap-2">
          <input className={inputCls} placeholder="Nueva categoría (ej. Aguardiente)" required value={nombre}
            onChange={(e) => setNombre(e.target.value)} />
          <Btn>Agregar</Btn>
        </form>
        <div className="mt-3"><ErrorMsg msg={error} /></div>
      </Card>
      <Card>
        {lista.length === 0 ? <Empty text="Sin categorías" /> : (
          <ul className="divide-y">
            {lista.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <span className="text-lg">{c.nombre}</span>
                <Btn variant="danger" className="!py-2" onClick={() => eliminar(c)}>Eliminar</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
