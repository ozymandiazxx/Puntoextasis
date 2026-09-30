# 🥃 Mi Licorería — MVP

Inventario, ventas (POS), compras, gastos, proveedores y reportes para una licorería.
Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Auth, Postgres, Storage).

## Arquitectura

- **Multi-negocio con RLS**: cada tabla tiene `negocio_id` (default `mi_negocio_id()`); las políticas RLS solo permiten ver/editar filas del negocio del usuario. Al registrarse, un trigger crea el negocio, el perfil (`usuarios`) y las categorías iniciales.
- **Ventas y compras atómicas**: se registran con las funciones SQL `registrar_venta` y `registrar_compra` (bloqueo de filas, validación de stock, numeración, movimientos de inventario, todo en una transacción). La app siempre usa estas funciones; las políticas RLS impiden borrar ventas/compras, pero un usuario técnico podría insertar filas directamente (endurecer antes de tener empleados).
- **Protección de rutas**: `proxy.ts` (antes `middleware`) renueva la sesión y redirige a `/login` si no hay usuario.
- **Páginas cliente** que consultan Supabase directamente con la anon key (seguro gracias a RLS).

```
app/
  (auth)/login, registro
  (app)/ page (dashboard), productos, categorias, ventas, compras, gastos, proveedores, reportes
components/  ui.tsx (Btn, Card, Modal, FiltroPeriodo…), Shell.tsx (menú lateral / móvil)
lib/         supabase/client.ts, format.ts, types.ts
proxy.ts     protección de rutas
supabase/schema.sql   tablas, RLS, funciones
```

## Reglas de negocio

- Ganancia = precio de venta − costo (columna calculada). % ganancia = ganancia / costo.
- **Precio de venta = precio final con IVA incluido.** IVA de una venta = total − total/(1+tarifa). «Sin IVA» = sin tarifa; «IVA 0%» es tarifa 0. Las tarifas son un valor numérico por producto, fáciles de cambiar (`IVA_OPCIONES` en `lib/format.ts`).
- Una compra suma stock y **actualiza el costo** del producto al costo de esa compra.
- Utilidad aproximada (reportes) = ganancia en ventas − gastos, **sin** la categoría «Compra de mercadería» para no descontar dos veces el costo.
- Eliminar un producto es lógico (`activo=false`) para conservar el historial.

## Puesta en marcha local

```bash
npm install
cp .env.local.example .env.local   # completa URL y anon key
npm run dev
```

## Despliegue

### 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. **SQL Editor → New query**, pega todo `supabase/schema.sql` y ejecuta; luego haz lo mismo con `supabase/migracion_01_clientes_facturas.sql` `supabase/migracion_02_servicios_pagos.sql` `supabase/migracion_03_catalogo_web.sql`, `supabase/migracion_04_fotos_sitio.sql` y `supabase/migracion_05_acceso_cerrado.sql` (en orden).
3. **Authentication → Providers → Email**: para probar rápido desactiva «Confirm email» (o déjalo activo y confirma por correo).
4. **Project Settings → API**: copia `Project URL` y `anon public key`.

### 2. Vercel
1. Sube el proyecto a GitHub e impórtalo en https://vercel.com/new.
2. En *Environment Variables* agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.
4. En Supabase → **Authentication → URL Configuration**, pon la URL de Vercel como *Site URL*.

## Preparado para el futuro

- **Lector de código de barras**: el campo de búsqueda en «Vender» ya acepta códigos (los lectores USB escriben + Enter); `codigo_barras` está en productos.
- **Importación Excel**: tabla `productos` lista; agregar una pantalla con `xlsx` + `insert` por lotes.
- **Empleados**: `usuarios.rol` (`dueno`/`empleado`) y `ventas.usuario_id` ya existen; falta restringir políticas por rol.
- **Sucursales**: agregar `sucursales` y `sucursal_id` junto a `negocio_id`.
- **Facturación electrónica**: `ventas.iva_total` y `detalle_ventas.iva_porcentaje` guardan el desglose por línea.

## Sitio público (página principal `/`)

- Datos del negocio (teléfono, dirección, enlaces, catálogos PDF): `lib/sitio.ts`.
- **Fotos del sitio**: colócalas en `public/fotos/` con los nombres indicados en `public/fotos/LEEME.txt` (hero, categoria-*, momento-*). Si falta una, se muestra un marco de marca.
- **Catálogo con productos reales**: en el panel, Productos → editar → «Mostrar este producto en la tienda de la página web» y sube su foto. Solo se publican nombre, marca, presentación, precio y si hay disponibilidad (nunca costos ni cantidades).
- Variable `NEGOCIO_PUBLICO_ID`: id del negocio (tabla `negocios`) cuyo catálogo muestra el sitio.
- El carrito arma el pedido y lo envía por WhatsApp. Pasos futuros: pedidos guardados en base de datos y pago en línea.

## Acceso de administración

- No hay registro público: la migración 05 bloquea la creación de usuarios desde internet (también llamando a la API). El acceso es **Administración** en la página principal → inicio de sesión.
- Para crear otro administrador del mismo negocio hay que crear el usuario con `raw_user_meta_data` = `{"negocio_id": "<id del negocio>", "nombre": "..."}` estando activa la sesión SQL `set local app.permitir_registro = 'si';`.
- Cada usuario puede cambiar su contraseña en el panel → Mi negocio.
