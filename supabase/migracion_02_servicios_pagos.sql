-- Migración 02: servicios (ítems sin inventario) y pagos/abonos de facturas a crédito.
-- Ejecutar DESPUÉS de migracion_01.

-- ---------- Servicios: productos que no controlan stock ----------
alter table productos add column es_servicio boolean not null default false;

-- ---------- Pagos: lo cobrado de cada factura ----------
alter table ventas add column monto_pagado numeric(12,2) not null default 0;
update ventas set monto_pagado = total where estado_pago = 'pagada';

create table pagos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  venta_id uuid not null references ventas(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  metodo_pago text not null check (metodo_pago in ('efectivo','transferencia','tarjeta','otros')),
  nota text,
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on pagos(venta_id);
create index on pagos(negocio_id, fecha desc);
create trigger trg_pagos_updated before update on pagos
  for each row execute function set_updated_at();

alter table pagos enable row level security;
create policy pagos_leer on pagos for select using (negocio_id = mi_negocio_id());
create policy pagos_insertar on pagos for insert with check (negocio_id = mi_negocio_id());

-- ---------- registrar_venta: servicios sin stock + monto pagado ----------
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
    if not p.es_servicio and p.stock < cant then
      raise exception 'Stock insuficiente de "%" (disponible: %)', p.nombre, p.stock;
    end if;

    sub := round(p.precio_venta * cant, 2);
    gan := round((p.precio_venta - p.costo) * cant, 2);
    iva := case when p.iva_porcentaje is null then 0
                else round(sub - sub / (1 + p.iva_porcentaje / 100), 2) end;

    insert into detalle_ventas(negocio_id, venta_id, producto_id, nombre_producto, cantidad,
      costo_unitario, precio_unitario, iva_porcentaje, subtotal, ganancia)
    values (nid, vid, p.id, p.nombre, cant, p.costo, p.precio_venta, p.iva_porcentaje, sub, gan);

    if not p.es_servicio then
      update productos set stock = stock - cant where id = p.id;
      insert into movimientos_inventario(negocio_id, producto_id, tipo, cantidad, stock_resultante, referencia_id)
        values (nid, p.id, 'venta', -cant, p.stock - cant, vid);
    end if;

    t_total := t_total + sub; t_gan := t_gan + gan; t_iva := t_iva + iva;
  end loop;

  update ventas set total = t_total, ganancia = t_gan, iva_total = t_iva,
    monto_pagado = case when p_estado_pago = 'pagada' then t_total else 0 end
  where id = vid;
  return vid;
end $$;

-- ---------- registrar_pago: abono a una factura a crédito ----------
-- Devuelve el saldo pendiente después del abono. Al llegar a 0 la factura queda pagada.
create or replace function registrar_pago(
  p_venta_id uuid, p_monto numeric, p_metodo_pago text default 'efectivo', p_nota text default null)
returns numeric language plpgsql as $$
declare
  nid uuid := mi_negocio_id();
  v ventas%rowtype;
  nuevo numeric;
begin
  if nid is null then raise exception 'Usuario sin negocio'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto inválido'; end if;

  select * into v from ventas where id = p_venta_id and negocio_id = nid for update;
  if not found then raise exception 'Factura no encontrada'; end if;
  if p_monto > v.total - v.monto_pagado then
    raise exception 'El abono supera el saldo pendiente (%)', v.total - v.monto_pagado;
  end if;

  insert into pagos(negocio_id, venta_id, monto, metodo_pago, nota)
    values (nid, v.id, p_monto, p_metodo_pago, p_nota);

  nuevo := v.monto_pagado + p_monto;
  update ventas set monto_pagado = nuevo,
    estado_pago = case when nuevo >= total then 'pagada' else 'pendiente' end
  where id = v.id;
  return v.total - nuevo;
end $$;
