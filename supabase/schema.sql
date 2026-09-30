-- =====================================================================
-- LICORERÍA - Esquema Supabase (PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Multi-tenant: cada fila pertenece a un negocio (negocio_id) y RLS
-- garantiza que cada usuario solo vea los datos de su negocio.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Utilidad: updated_at ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Negocios y usuarios ----------
create table negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "usuarios": perfil ligado a auth.users. rol preparado para empleados.
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text,
  rol text not null default 'dueno' check (rol in ('dueno','empleado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on usuarios(negocio_id);

-- Negocio del usuario autenticado (SECURITY DEFINER evita recursión de RLS)
create or replace function mi_negocio_id() returns uuid
language sql stable security definer set search_path = public as $$
  select negocio_id from usuarios where id = auth.uid()
$$;

-- ---------- Catálogos ----------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negocio_id, nombre)
);

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  nombre text not null,
  empresa text,
  ruc text,
  telefono text,
  correo text,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- IVA: iva_porcentaje NULL = "Sin IVA"; 0 = tarifa 0%; 8, 15 = tarifas.
-- El precio de venta se considera FINAL (IVA incluido).
create table productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  nombre text not null,
  categoria_id uuid references categorias(id) on delete set null,
  marca text,
  presentacion text,
  codigo_interno text,
  codigo_barras text,
  proveedor_id uuid references proveedores(id) on delete set null,
  stock numeric(12,2) not null default 0 check (stock >= 0),
  stock_minimo numeric(12,2) not null default 0,
  costo numeric(12,2) not null default 0 check (costo >= 0),
  precio_venta numeric(12,2) not null default 0 check (precio_venta >= 0),
  ganancia_unidad numeric(12,2) generated always as (precio_venta - costo) stored,
  ganancia_pct numeric(8,2) generated always as
    (case when costo > 0 then round((precio_venta - costo) / costo * 100, 2) else 0 end) stored,
  iva_porcentaje numeric(5,2) check (iva_porcentaje is null or iva_porcentaje >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on productos(negocio_id, nombre);
create index on productos(negocio_id, codigo_barras);

-- ---------- Ventas ----------
create table ventas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  numero bigint not null,
  fecha timestamptz not null default now(),
  metodo_pago text not null check (metodo_pago in ('efectivo','transferencia','tarjeta','otros')),
  total numeric(12,2) not null default 0,
  iva_total numeric(12,2) not null default 0,
  ganancia numeric(12,2) not null default 0,
  usuario_id uuid default auth.uid() references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negocio_id, numero)
);
create index on ventas(negocio_id, fecha desc);

create table detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  nombre_producto text not null,          -- copia histórica
  cantidad numeric(12,2) not null check (cantidad > 0),
  costo_unitario numeric(12,2) not null,
  precio_unitario numeric(12,2) not null,
  iva_porcentaje numeric(5,2),
  subtotal numeric(12,2) not null,
  ganancia numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on detalle_ventas(venta_id);
create index on detalle_ventas(negocio_id, producto_id);

-- ---------- Gastos ----------
create table gastos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  nombre text not null,
  categoria text not null default 'Otros'
    check (categoria in ('Compra de mercadería','Servicios','Transporte','Arriendo','Otros')),
  proveedor_id uuid references proveedores(id) on delete set null,
  valor numeric(12,2) not null check (valor >= 0),
  fecha date not null default current_date,
  descripcion text,
  comprobante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on gastos(negocio_id, fecha desc);

-- ---------- Compras ----------
create table compras (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  numero bigint not null,
  proveedor_id uuid references proveedores(id) on delete set null,
  fecha timestamptz not null default now(),
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negocio_id, numero)
);
create index on compras(negocio_id, fecha desc);

create table detalle_compras (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  compra_id uuid not null references compras(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  nombre_producto text not null,
  cantidad numeric(12,2) not null check (cantidad > 0),
  costo_unitario numeric(12,2) not null check (costo_unitario >= 0),
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on detalle_compras(compra_id);

-- ---------- Movimientos de inventario (kardex) ----------
create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null default mi_negocio_id() references negocios(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  tipo text not null check (tipo in ('venta','compra','ajuste')),
  cantidad numeric(12,2) not null,        -- + entra, - sale
  stock_resultante numeric(12,2) not null,
  referencia_id uuid,                     -- venta_id / compra_id
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on movimientos_inventario(negocio_id, producto_id, created_at desc);

-- ---------- Triggers updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['negocios','usuarios','categorias','proveedores','productos','ventas',
    'detalle_ventas','gastos','compras','detalle_compras','movimientos_inventario']
  loop
    execute format('create trigger trg_%1$s_updated before update on %1$s
      for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ---------- Registro: crea negocio + perfil + categorías por defecto ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  insert into negocios(nombre)
    values (coalesce(nullif(new.raw_user_meta_data->>'negocio', ''), 'Mi licorería'))
    returning id into nid;
  insert into usuarios(id, negocio_id, nombre, rol)
    values (new.id, nid, new.raw_user_meta_data->>'nombre', 'dueno');
  insert into categorias(negocio_id, nombre)
    select nid, c from unnest(array['Whisky','Ron','Vodka','Cerveza','Vino','Tequila','Snacks','Otros']) c;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- Funciones atómicas (SECURITY INVOKER: respetan RLS)
-- =====================================================================

-- p_items: [{"producto_id": "...", "cantidad": 2}]
create or replace function registrar_venta(p_metodo_pago text, p_items jsonb)
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

  -- serializa la numeración por negocio
  perform pg_advisory_xact_lock(hashtext(nid::text || 'venta'));
  select coalesce(max(numero), 0) + 1 into num from ventas where negocio_id = nid;

  insert into ventas(id, negocio_id, numero, metodo_pago) values (vid, nid, num, p_metodo_pago);

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

-- p_items: [{"producto_id": "...", "cantidad": 10, "costo": 12.5}]
create or replace function registrar_compra(p_proveedor_id uuid, p_items jsonb)
returns uuid language plpgsql as $$
declare
  nid uuid := mi_negocio_id();
  cid uuid := gen_random_uuid();
  num bigint;
  it jsonb;
  p productos%rowtype;
  cant numeric; v_costo numeric;
  t_total numeric := 0;
begin
  if nid is null then raise exception 'Usuario sin negocio'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La compra no tiene productos';
  end if;

  perform pg_advisory_xact_lock(hashtext(nid::text || 'compra'));
  select coalesce(max(numero), 0) + 1 into num from compras where negocio_id = nid;

  insert into compras(id, negocio_id, numero, proveedor_id) values (cid, nid, num, p_proveedor_id);

  for it in select * from jsonb_array_elements(p_items) loop
    cant := (it->>'cantidad')::numeric;
    v_costo := (it->>'costo')::numeric;
    if cant is null or cant <= 0 or v_costo is null or v_costo < 0 then
      raise exception 'Cantidad o costo inválido';
    end if;

    select * into p from productos
      where id = (it->>'producto_id')::uuid and negocio_id = nid for update;
    if not found then raise exception 'Producto no encontrado'; end if;

    insert into detalle_compras(negocio_id, compra_id, producto_id, nombre_producto, cantidad,
      costo_unitario, subtotal)
    values (nid, cid, p.id, p.nombre, cant, v_costo, round(cant * v_costo, 2));

    update productos set stock = stock + cant, costo = v_costo where id = p.id;
    insert into movimientos_inventario(negocio_id, producto_id, tipo, cantidad, stock_resultante, referencia_id)
      values (nid, p.id, 'compra', cant, p.stock + cant, cid);

    t_total := t_total + round(cant * v_costo, 2);
  end loop;

  update compras set total = t_total where id = cid;
  return cid;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table negocios enable row level security;
alter table usuarios enable row level security;

create policy negocio_propio on negocios for select using (id = mi_negocio_id());
create policy negocio_editar on negocios for update using (id = mi_negocio_id());
create policy perfil_propio on usuarios for select using (negocio_id = mi_negocio_id());
create policy perfil_editar on usuarios for update using (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['categorias','proveedores','productos','ventas','detalle_ventas',
    'gastos','compras','detalle_compras','movimientos_inventario']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all
      using (negocio_id = mi_negocio_id()) with check (negocio_id = mi_negocio_id())',
      t || '_negocio', t);
  end loop;
end $$;

-- Las ventas/compras/movimientos se crean SOLO con las funciones (no edición directa)
drop policy ventas_negocio on ventas;
create policy ventas_leer on ventas for select using (negocio_id = mi_negocio_id());
drop policy detalle_ventas_negocio on detalle_ventas;
create policy detalle_ventas_leer on detalle_ventas for select using (negocio_id = mi_negocio_id());
drop policy compras_negocio on compras;
create policy compras_leer on compras for select using (negocio_id = mi_negocio_id());
drop policy detalle_compras_negocio on detalle_compras;
create policy detalle_compras_leer on detalle_compras for select using (negocio_id = mi_negocio_id());
drop policy movimientos_inventario_negocio on movimientos_inventario;
create policy movimientos_leer on movimientos_inventario for select using (negocio_id = mi_negocio_id());

-- Las funciones de inserción necesitan insertar: políticas de insert controladas
create policy ventas_insertar on ventas for insert with check (negocio_id = mi_negocio_id());
create policy ventas_actualizar on ventas for update using (negocio_id = mi_negocio_id());
create policy detalle_ventas_insertar on detalle_ventas for insert with check (negocio_id = mi_negocio_id());
create policy compras_insertar on compras for insert with check (negocio_id = mi_negocio_id());
create policy compras_actualizar on compras for update using (negocio_id = mi_negocio_id());
create policy detalle_compras_insertar on detalle_compras for insert with check (negocio_id = mi_negocio_id());
create policy movimientos_insertar on movimientos_inventario for insert with check (negocio_id = mi_negocio_id());

-- Storage para comprobantes de gastos (opcional)
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', false)
  on conflict do nothing;
create policy comprobantes_leer on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = mi_negocio_id()::text);
create policy comprobantes_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = mi_negocio_id()::text);
