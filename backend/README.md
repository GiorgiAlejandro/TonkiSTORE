# Backend

Backend Flask de TonkiSTORE con autenticación, administración, catálogo de productos y las funciones implementadas en Sprint 3 y Sprint 4.

## Arranque rápido

```bash
pip install -r requirements.txt
python model/create_db.py   # crea tablas nuevas (favorites, reservations) sin borrar datos existentes
python init_test_data.py    # opcional: datos de ejemplo
python app.py
```

Servidor local: `http://localhost:5000`

## Qué se agregó en Sprint 3

- Sistema de Favoritos: endpoints para añadir/quitar/ver favoritos del usuario.
- Sistema de Reservas: crear/consultar/cancelar reservas con validación de solapamientos.
- Búsqueda por rango de fechas: encontrar juegos disponibles entre dos fechas.
- Endpoints de disponibilidad por juego para consultar intervalos ocupados.

## Qué se agregó en Sprint 4

- Checkout unificado de carrito con compras y alquileres.
- Pantalla de confirmación con detalle de items comprados y alquilados.
- Biblioteca del usuario con compras y alquileres activos.
- Endpoints de compra, alquiler y biblioteca para completar el flujo.
- Filtro visual de ofertas en la búsqueda avanzada y ajustes de catálogo/recomendaciones.

## Endpoints principales (resumen)

- Autenticación: `POST /api/users/login`, `POST /api/users/register`, `GET /api/users/me`.
- Productos: `GET /api/games`, `GET /api/games/<app_id>`, `GET /api/games/search/by-date`.
- Favoritos: `GET /api/favorites`, `POST /api/favorites/<app_id>`, `DELETE /api/favorites/<app_id>`.
- Reservas: `POST /api/reservations`, `GET /api/reservations`, `DELETE /api/reservations/<id>`.

Ver `API_ENDPOINTS_SPRINT3.md`, `SPRINT_3_CHANGES.md`, `API_ENDPOINTS_SPRINT4.md` y `SPRINT_4_CHANGES.md` para ejemplos y detalles.

## Base de datos

Se agregaron las tablas `favorites` y `reservations`. Ejecutar `python model/create_db.py` para crear/actualizar la estructura.

## Pruebas

```bash
python test_api.py
```

## Notas de implementación

- Las rutas de favoritos y reservas requieren autenticación; el backend valida que el usuario solo acceda/modifique sus propios recursos.
- Las fechas usan formato `YYYY-MM-DD`.
- Para integrarse con el frontend, el backend expone los campos `image_url`, `price_usd` y `discount_pct` en los objetos de juego.

Para instrucciones de despliegue y detalles de endpoints ver los archivos de documentación.
