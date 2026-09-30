-- Migración 01: clientes, estado de pago, datos del emisor.
-- Ejecutar DESPUÉS de schema.sql (Supabase > SQL Editor).

-- ---------- Datos del emisor (para la factura) ----------
alter table negocios
  add column ruc text,
  add column razon_social text,
  add column direccion text,
  add column telefono text,
  add column establecimiento text not null default '001',
  add column punto_emision text not null default '001';

-- ---------- Clientes ----------
-- "Consumidor final" = venta sin cliente (cliente_id null)
create table clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  nombre text not null,
  tipo_identificacion text not null default 'cedula'
    check (tipo_identificacion in ('cedula','ruc','pasaporte')),
  identificacion text,
  telefono text,
  correo text,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on clientes(negocio_id, nombre);
create trigger trg_clientes_updated before update on clientes
  for each row execute function set_updated_at();

alter table clientes enable row level security;
create policy clientes_negocio on clientes for all
  using (negocio_id = mi_negocio_id()) with check (negocio_id = mi_negocio_id());

-- ---------- Ventas: cliente y estado de pago ----------
alter table ventas
  add column cliente_id uuid references clientes(id) on delete set null,
  add column estado_pago text not null default 'pagada' check (estado_pago in ('pagada','pendiente'));
create index on ventas(negocio_id, cliente_id);

-- ---------- registrar_venta con cliente y estado ----------
drop function registrar_venta(text, jsonb);

create or replace function registrar_venta(
  p_metodo_pago text, p_items jsonb,
  p_cliente_id uuid default null, p_estado_pago text default 'pagada')
returns uuid language plpgsql as $$
declare
  nid uuid := mi_negocio_id();
  vid uuid := gen_random_uuid();
  num bigint;
  it jsonb;
  p productos%rowtype;
  cant numeric;
  sub numeric; gan numeric; iva numeric;
  t_total numeric := 0; t_gan numeric := 0; t_iva numeric := 0;
begin
  if nid is null then raise exception 'Usuario sin negocio'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if p_cliente_id is not null
     and not exists (select 1 from clientes where id = p_cliente_id and negocio_id = nid) then
    raise exception 'Cliente no encontrado';
  end if;

  perform pg_advisory_xact_lock(hashtext(nid::text || 'venta'));
  select coalesce(max(numero), 0) + 1 into num from ventas where negocio_id = nid;

  insert into ventas(id, negocio_id, numero, metodo_pago, cliente_id, estado_pago)
    values (vid, nid, num, p_metodo_pago, p_cliente_id, p_estado_pago);

  for it in select * from jsonb_array_elements(p_items) loop
    cant := (it->>'cantidad')::numeric;
    if cant is null or cant <= 0 then raise exception 'Cantidad inválida'; end if;

    select * into p from productos
      where id = (it->>'producto_id')::uuid and negocio_id = nid for update;
    if not found then raise exception 'Producto no encontrado'; end if;
    if p.stock < cant then
      raise exception 'Stock insuficiente de "%" (disponible: %)', p.nombre, p.stock;
    end if;

    sub := round(p.precio_venta * cant, 2);
    gan := round((p.precio_venta - p.costo) * cant, 2);
    iva := case when p.iva_porcentaje is null then 0
                else round(sub - sub / (1 + p.iva_porcentaje / 100), 2) end;

    insert into detalle_ventas(negocio_id, venta_id, producto_id, nombre_producto, cantidad,
      costo_unitario, precio_unitario, iva_porcentaje, subtotal, ganancia)
    values (nid, vid, p.id, p.nombre, cant, p.costo, p.precio_venta, p.iva_porcentaje, sub, gan);

    update productos set stock = stock - cant where id = p.id;
    insert into movimientos_inventario(negocio_id, producto_id, tipo, cantidad, stock_resultante, referencia_id)
      values (nid, p.id, 'venta', -cant, p.stock - cant, vid);

    t_total := t_total + sub; t_gan := t_gan + gan; t_iva := t_iva + iva;
  end loop;

  update ventas set total = t_total, ganancia = t_gan, iva_total = t_iva where id = vid;
  return vid;
end $$;
