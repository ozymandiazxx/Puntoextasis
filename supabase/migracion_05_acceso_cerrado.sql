-- Migración 05: registro público cerrado + administradores del mismo negocio.
-- Ejecutar DESPUÉS de migracion_04.

-- 1) Un usuario creado con raw_user_meta_data->>'negocio_id' se une a ESE negocio
--    (administrador adicional) en lugar de crear uno nuevo.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if new.raw_user_meta_data ? 'negocio_id' then
    insert into usuarios(id, negocio_id, nombre, rol)
      values (new.id, (new.raw_user_meta_data->>'negocio_id')::uuid,
              coalesce(new.raw_user_meta_data->>'nombre', 'Administración'), 'dueno');
    return new;
  end if;

  insert into negocios(nombre)
    values (coalesce(nullif(new.raw_user_meta_data->>'negocio', ''), 'Mi licorería'))
    returning id into nid;
  insert into usuarios(id, negocio_id, nombre, rol)
    values (new.id, nid, new.raw_user_meta_data->>'nombre', 'dueno');
  insert into categorias(negocio_id, nombre)
    select nid, c from unnest(array['Whisky','Ron','Vodka','Cerveza','Vino','Tequila','Snacks','Otros']) c;
  return new;
end $$;

-- 2) Nadie puede registrarse desde internet (ni llamando a la API con la llave pública).
--    Solo se crean usuarios con:  set local app.permitir_registro = 'si';
create or replace function bloquear_registro_publico() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.permitir_registro', true), '') <> 'si' then
    raise exception 'El registro está cerrado. Solicita acceso al administrador.';
  end if;
  return new;
end $$;

drop trigger if exists trg_bloquear_registro on auth.users;
create trigger trg_bloquear_registro before insert on auth.users
  for each row execute function bloquear_registro_publico();
