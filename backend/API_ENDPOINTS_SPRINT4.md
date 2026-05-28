# API Endpoints - Sprint 4

Referencia corta de los endpoints agregados o usados de forma central en Sprint 4.

## Base

Servidor local: `http://localhost:5000`

Todos los endpoints de esta sección se montan bajo `/api`.

## Carrito

### `POST /api/cart/checkout`

Procesa un carrito con compras y alquileres en una sola llamada.

Body esperado:

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

## Compras y alquileres

### `POST /api/purchases`

Registra una compra permanente para el usuario autenticado.

### `POST /api/rentals`

Registra un alquiler a partir de `user_id`, `game_id` y `package_days`.

## Biblioteca

### `GET /api/library`

Devuelve la biblioteca del usuario autenticado separada en:

- `purchases`: juegos comprados.
- `rentals`: alquileres activos.

Respuesta típica:

```json
{
    "user_id": 1,
    "purchases": [],
    "rentals": [],
    "counts": {
        "purchases": 0,
        "rentals": 0,
        "total": 0
    }
}
```

## Notas

- Los endpoints de compra, alquiler y biblioteca requieren autenticación.
- El checkout devuelve el detalle necesario para la pantalla de confirmación del frontend.
