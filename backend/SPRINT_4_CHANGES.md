# Sprint 4 - Cambios principales

Este sprint se enfocó en pulir la experiencia pública de la tienda y en completar el flujo de compra/alquiler del carrito.

## Resumen técnico

- Carrito unificado: permite procesar compras y alquileres en una sola operación.
- Confirmación de checkout: muestra total, cantidad de items y detalle separado de compras y alquileres.
- Biblioteca del usuario: expone juegos comprados y alquileres activos.
- Catálogo más limpio: los juegos ya poseídos se marcan con un badge visible y no se muestran en recomendados ni en el catálogo normal salvo búsqueda manual.
- Header simplificado: los accesos rápidos quedaron solo con iconos.
- Filtro "En oferta": se implementó como checkbox en la búsqueda avanzada y se activa automáticamente desde el CTA principal.
- Recomendaciones: se eliminaron controles de depuración y se agregó paginación por grupos de 6.

## Backend involucrado

- `POST /api/cart/checkout` procesa el carrito completo.
- `POST /api/purchases` registra compras permanentes.
- `POST /api/rentals` registra alquileres.
- `GET /api/library` devuelve compras y alquileres activos del usuario.

## Frontend involucrado

- `frontend/js/render.js` para tarjetas, carrito y confirmación.
- `frontend/js/router.js` para navegación del carrito y la confirmación.
- `frontend/js/search-advanced.js` para el filtro de ofertas.
- `frontend/js/recommendations.js` para la paginación de sugerencias.
- `frontend/js/ui.js` para la exclusión de juegos poseídos en catálogo.
- `frontend/js/main.js` para el CTA "Ver ofertas".

## Validaciones importantes

- El checkout devuelve compras y alquileres en listas separadas.
- La biblioteca y las operaciones de compra/alquiler requieren autenticación.
- El filtro de ofertas debe aplicarse sin un segundo submit cuando se entra desde el CTA principal.
