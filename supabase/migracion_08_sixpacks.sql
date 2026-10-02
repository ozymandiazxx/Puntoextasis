-- Migración 08: sixpacks de cerveza como productos propios (precio del pack del catálogo).
insert into productos (negocio_id, nombre, categoria_id, stock, costo, precio_venta, publicado, imagen_url)
select p.negocio_id, v.nuevo, p.categoria_id, 10, 0, v.precio, true, p.imagen_url
from (values
  ('Heineken Lata 355 ml', 'Heineken Lata 355 ml - Sixpack', 9::numeric),
  ('Amstel Lata 355 ml', 'Amstel Lata 355 ml - Sixpack', 7.5::numeric),
  ('Budweiser 269 ml', 'Budweiser 269 ml - Sixpack', 7.5::numeric),
  ('Pilsener Lata 269 ml', 'Pilsener Lata 269 ml - Sixpack', 5::numeric),
  ('Pilsener Lata 355 ml', 'Pilsener Lata 355 ml - Sixpack', 6::numeric),
  ('Pilsener Lata 473 ml', 'Pilsener Lata 473 ml - Sixpack', 8.4::numeric),
  ('Corona Bot 330 ml', 'Corona Bot 330 ml - Sixpack', 10::numeric),
  ('Sixpack Heineken Bot 330 ml', 'Sixpack Heineken Bot 330 ml x6', 9::numeric)
) as v(base, nuevo, precio)
join productos p on p.negocio_id = 'ccb1fbd8-40d3-49e0-854c-c1efacdf884b' and p.nombre = v.base
where not exists (select 1 from productos x where x.negocio_id = p.negocio_id and x.nombre = v.nuevo);
