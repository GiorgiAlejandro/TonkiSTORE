# API Documentation

Referencia corta y vigente de los endpoints que usa el frontend.

## Base

Servidor local: `http://localhost:5000`

Todos los endpoints están montados bajo `/api`.

## Autenticación y usuarios

- `POST /api/users/register` - Registra un usuario nuevo.
- `POST /api/users/login` - Inicia sesión y devuelve token o datos de sesión.
- `POST /api/users/logout` - Cierra sesión.
- `GET /api/users/me` - Devuelve el usuario autenticado.
- `GET /api/users` - Lista usuarios, solo admin.
- `PUT /api/users/<user_id>/admin` - Asigna o revoca rol admin, solo admin.

## Productos

- `GET /api/games` - Listado de juegos con filtros.
- `GET /api/games/<app_id>` - Detalle de un juego.
- `GET /api/games/search?q=...` - Búsqueda por texto.
- `GET /api/games/search/by-date?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&q=...` - Búsqueda por rango de fechas.
- `GET /api/games/<app_id>/availability` - Detalle del juego con fechas ocupadas.
- `GET /api/games/<app_id>/occupied-dates` - Intervalos ocupados.
- `GET /api/games/<app_id>/check-availability?start_date=...&end_date=...` - Verifica disponibilidad.

## Favoritos

- `GET /api/favorites` - Lista favoritos del usuario autenticado.
- `POST /api/favorites/<app_id>` - Agrega un favorito.
- `DELETE /api/favorites/<app_id>` - Quita un favorito.
- `GET /api/favorites/<app_id>/check` - Verifica si un juego es favorito.

## Reservas

- `POST /api/reservations` - Crea una reserva con `app_id`, `start_date` y `end_date`.
- `GET /api/reservations` - Lista reservas del usuario.
- `GET /api/reservations/<id>` - Detalle de una reserva.
- `DELETE /api/reservations/<id>` - Cancela una reserva.

## Sprint 4: carrito y biblioteca

- `POST /api/cart/checkout` - Procesa compras y alquileres en una sola operación.
- `POST /api/purchases` - Registra una compra permanente.
- `POST /api/rentals` - Registra un alquiler por cantidad de días.
- `GET /api/library` - Devuelve compras y alquileres activos del usuario.

### Ejemplo de checkout

```json
{
    "user_id": 1,
    "items": [
        {
            "type": "purchase",
            "game_id": 730,
            "price": 19.99
        },
        {
            "type": "rental",
            "game_id": 440,
            "startDate": "2026-05-15",
            "endDate": "2026-05-20",
            "days": 6,
            "total": 4.99
        }
    ]
}
```

Respuesta típica:

```json
{
    "message": "Cart processed successfully",
    "user_id": 1,
    "count": 2,
    "total": 24.98,
    "purchases": [],
    "rentals": []
}
```

## Notas de integración

- Los endpoints protegidos requieren autenticación.
- El frontend usa `image_url`, `price_usd` y `discount_pct` para renderizar tarjetas.
- Los eventos relevantes de UI son `products:updated`, `favorites:changed` y `auth:changed`.
