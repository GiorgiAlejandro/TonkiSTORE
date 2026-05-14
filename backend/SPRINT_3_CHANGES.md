# Sprint 3 - Backend & Frontend Changes (Resumen)

Este documento centraliza los cambios introducidos durante Sprint 3: funcionalidades de favoritos, reservas, búsqueda por fecha y las adaptaciones necesarias en frontend para integrarlas.

## Resumen técnico

- Nuevas tablas en la DB: `favorites`, `reservations` (creadas por `model/create_db.py`).
- Nuevos módulos backend: `model/favorites_db.py`, `model/reservations_db.py`, nuevas rutas en `routes/favorites.py` y `routes/reservations.py`.
- Nuevos endpoints en `routes/games.py` para obtener disponibilidad y buscar por rango de fechas.
- Cambios en frontend: nuevos módulos `frontend/js/favorites-view.js`, `frontend/js/detail-availability.js` (control de alquileres), `frontend/js/search-advanced.js`, y ajustes en `render.js`, `data.js`, `router.js` y `admin.js`.

## Migración y esquema

Agregar las tablas necesarias ejecutando:

```bash
python model/create_db.py
```

Tablas añadidas (resumen):

- `favorites(user_id INTEGER, app_id INTEGER, created_at TIMESTAMP)` — unicidad `(user_id, app_id)`.
- `reservations(id, app_id, user_id, start_date, end_date, status, created_at)` — unicidad por bloque reservado para evitar solapamientos.

## Endpoints claves añadidos

- Favoritos:
    - `GET /api/favorites` — listar favoritos del usuario.
    - `POST /api/favorites/<app_id>` — añadir favorito.
    - `DELETE /api/favorites/<app_id>` — quitar favorito.
    - `GET /api/favorites/<app_id>/check` — comprobar favorito.

- Reservas y disponibilidad:
    - `POST /api/reservations` — crear reserva (body: `app_id`, `start_date`, `end_date`).
    - `GET /api/reservations` — listar reservas del usuario.
    - `DELETE /api/reservations/<id>` — cancelar reserva.
    - `GET /api/games/<app_id>/occupied-dates` — listas de intervalos ocupados.
    - `GET /api/games/<app_id>/check-availability` — valida un rango concreto.

- Búsqueda por fecha:
    - `GET /api/games/search/by-date?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — devuelve juegos disponibles en el rango.

## Cambios en el frontend

- Nuevo flujo de alquiler/reserva en la vista de detalle:
    - Dos inputs de fecha (inicio/fin). El componente calcula precio por día y total.
    - Lógica: `price_per_day = round((price_with_discount / 30) * 100) / 100` y `total = price_per_day * days` (redondeo a dos decimales).
    - Si `days > 30` se muestra una advertencia que sugiere comprar el juego.

- Se eliminó el calendario de disponibilidad cuando el producto no lo requiere; la vista muestra resumen de alquiler y permite crear la reserva.

- Favoritos:
    - Nueva vista `/favorites` (módulo `favorites-view.js`) que sincroniza con el backend.
    - El frontend usa eventos `favorites:changed` y `products:updated` para mantener la UI en sync.

- Búsqueda avanzada (`search-advanced.js`) para filtrar por fechas, texto y otras opciones.

- Ajustes menores:
    - `admin.js` ahora prefiere `product.image_url` como fuente de miniaturas.
    - Se removieron banners de cuenta de prueba de las plantillas públicas.

## Consideraciones y validaciones

- Todas las rutas de favoritos y reservas requieren autenticación.
- Las fechas se validan en formato `YYYY-MM-DD` y se verifica que no existan solapamientos al crear reservas.
- El backend retorna errores claros (`400/409/404`) para entrada inválida, conflictos o recursos no encontrados.

## Testing y QA

1. Ejecutar el script de creación de datos y comprobar que las tablas nuevas existen.
2. Probar creación de reservas válidas y esperar respuesta `201`/`200` con objeto de reserva.
3. Probar conflictos de fechas (devolverá `409` o error con mensaje de conflicto).
4. Probar endpoints de favoritos (añadir/quitar/listar/verificar).

Para detalles técnicos completos, ver `API_ENDPOINTS_SPRINT3.md`.
