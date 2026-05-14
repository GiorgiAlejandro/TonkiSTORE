# Sprint 3 - API Endpoints Guide

## Base URL
```
http://localhost:5000/api
```

## Authentication
Todos los endpoints que requieren autenticación esperan:
```
Header: Authorization: Bearer <token>
```

---

## 1. FAVORITES (Favoritos)

### 1.1 Get User Favorites
```
GET /favorites
Authentication: REQUIRED
```
**Description:** Obtiene todos los productos marcados como favoritos por el usuario.

**Response (200):**
```json
[
  {
    "app_id": 730,
    "name": "Counter-Strike 2",
    "price_usd": 0.0,
    "discount_pct": 0,
    "created_at": "2026-05-09T10:30:00",
    "game_details": { ... complete game object ... }
  }
]
```

**Error (401):** Usuario no autenticado

---

### 1.2 Add to Favorites
```
POST /favorites/<app_id>
Authentication: REQUIRED
```
**Description:** Marca un producto como favorito.

**Params:**
- `app_id` (integer, path): ID del producto

**Response (201):**
```json
{
  "message": "Product added to favorites",
  "app_id": 730,
  "user_id": 1
}
```

**Error (404):** Producto no encontrado
**Error (409):** Producto ya está en favoritos
**Error (401):** Usuario no autenticado

---

### 1.3 Remove from Favorites
```
DELETE /favorites/<app_id>
Authentication: REQUIRED
```
**Description:** Elimina un producto de los favoritos.

**Params:**
- `app_id` (integer, path): ID del producto

**Response (200):**
```json
{
  "message": "Product removed from favorites",
  "app_id": 730,
  "user_id": 1
}
```

**Error (404):** Producto no está en favoritos
**Error (401):** Usuario no autenticado

---

### 1.4 Check if Favorite
```
GET /favorites/<app_id>/check
Authentication: REQUIRED
```
**Description:** Verifica si un producto es favorito del usuario.

**Params:**
- `app_id` (integer, path): ID del producto

**Response (200):**
```json
{
  "app_id": 730,
  "is_favorite": true
}
```

**Error (401):** Usuario no autenticado

---

## 2. RESERVATIONS (Reservas)

### 2.1 Create Reservation
```
POST /reservations
Authentication: REQUIRED
Content-Type: application/json
```
**Description:** Crea una nueva reserva para un producto.

**Body:**
```json
{
  "app_id": 730,
  "start_date": "2026-05-15",
  "end_date": "2026-05-20"
}
```

**Response (201):**
```json
{
  "message": "Reservation created successfully",
  "app_id": 730,
  "start_date": "2026-05-15",
  "end_date": "2026-05-20",
  "user_id": 1,
  "status": "confirmed"
}
```

**Error (404):** Producto no encontrado
**Error (409):** Fechas no disponibles
**Error (400):** Formato de fecha inválido o parámetros faltantes
**Error (401):** Usuario no autenticado

---

### 2.2 Get User Reservations
```
GET /reservations
Authentication: REQUIRED
```
**Description:** Obtiene todas las reservas del usuario autenticado.

**Response (200):**
```json
[
  {
    "id": 1,
    "app_id": 730,
    "start_date": "2026-05-15",
    "end_date": "2026-05-20",
    "status": "confirmed",
    "created_at": "2026-05-09T10:30:00",
    "name": "Counter-Strike 2",
    "price_usd": 0.0,
    "discount_pct": 0
  }
]
```

**Error (401):** Usuario no autenticado

---

### 2.3 Get Reservation Details
```
GET /reservations/<reservation_id>
Authentication: REQUIRED
```
**Description:** Obtiene los detalles de una reserva específica.

**Params:**
- `reservation_id` (integer, path): ID de la reserva

**Response (200):**
```json
{
  "id": 1,
  "app_id": 730,
  "user_id": 1,
  "start_date": "2026-05-15",
  "end_date": "2026-05-20",
  "status": "confirmed",
  "created_at": "2026-05-09T10:30:00"
}
```

**Error (404):** Reserva no encontrada
**Error (403):** No autorizado (reserva pertenece a otro usuario)
**Error (401):** Usuario no autenticado

---

### 2.4 Cancel Reservation
```
DELETE /reservations/<reservation_id>
Authentication: REQUIRED
```
**Description:** Cancela una reserva.

**Params:**
- `reservation_id` (integer, path): ID de la reserva

**Response (200):**
```json
{
  "message": "Reservation cancelled successfully",
  "reservation_id": 1,
  "status": "cancelled"
}
```

**Error (404):** Reserva no encontrada
**Error (403):** No autorizado
**Error (401):** Usuario no autenticado

---

### 2.5 Get Occupied Dates
```
GET /games/<app_id>/occupied-dates
Authentication: NOT REQUIRED
```
**Description:** Obtiene las fechas ocupadas/reservadas de un producto.

**Params:**
- `app_id` (integer, path): ID del producto

**Response (200):**
```json
{
  "app_id": 730,
  "game_name": "Counter-Strike 2",
  "occupied_dates": [
    {
      "start_date": "2026-05-20",
      "end_date": "2026-05-25"
    },
    {
      "start_date": "2026-06-01",
      "end_date": "2026-06-05"
    }
  ],
  "total_reservations": 2
}
```

**Error (404):** Producto no encontrado

---

### 2.6 Check Availability
```
GET /games/<app_id>/check-availability
Authentication: NOT REQUIRED
```
**Description:** Verifica si un producto está disponible en un rango de fechas.

**Params:**
- `app_id` (integer, path): ID del producto
- `start_date` (string, query): Fecha inicio (YYYY-MM-DD) - REQUERIDO
- `end_date` (string, query): Fecha fin (YYYY-MM-DD) - REQUERIDO

**Example:**
```
GET /games/730/check-availability?start_date=2026-05-15&end_date=2026-05-20
```

**Response (200):**
```json
{
  "app_id": 730,
  "start_date": "2026-05-15",
  "end_date": "2026-05-20",
  "is_available": true
}
```

**Error (400):** Parámetros faltantes o formato inválido
**Error (404):** Producto no encontrado

---

## 3. GAMES (Juegos - Actualizados)

### 3.1 Get Game with Availability
```
GET /games/<app_id>/availability
Authentication: NOT REQUIRED
```
**Description:** Obtiene información completa de un producto con sus fechas ocupadas.

**Params:**
- `app_id` (integer, path): ID del producto

**Response (200):**
```json
{
  "app_id": 730,
  "name": "Counter-Strike 2",
  "release_date": "2012-08-21",
  "price_usd": 0.0,
  "discount_pct": 0,
  "genre": { "id": 1, "name": "Action" },
  "tags": ["Multiplayer", "FPS"],
  "image_url": "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
  "occupied_dates": [
    {
      "start_date": "2026-05-20",
      "end_date": "2026-05-25"
    }
  ]
}
```

**Error (404):** Producto no encontrado
**Error (500):** Error al obtener disponibilidad

---

### 3.2 Search by Date Range
```
GET /games/search/by-date
Authentication: NOT REQUIRED
```
**Description:** Busca productos disponibles en un rango de fechas.

**Params (Query):**
- `start_date` (string): Fecha inicio (YYYY-MM-DD) - REQUERIDO
- `end_date` (string): Fecha fin (YYYY-MM-DD) - REQUERIDO
- `q` (string): Búsqueda adicional por nombre - OPCIONAL

**Example:**
```
GET /games/search/by-date?start_date=2026-05-15&end_date=2026-05-20&q=counter
```

**Response (200):**
```json
[
  {
    "app_id": 730,
    "name": "Counter-Strike 2",
    "release_date": "2012-08-21",
    "genre_id": 1,
    "price_usd": 0.0,
    "discount_pct": 0,
    "genre": "Action"
  }
]
```

**Error (400):** Parámetros faltantes o formato inválido
**Error (500):** Error en la búsqueda

---

## Date Format
Todos los rangos de fechas deben estar en formato **ISO 8601**:
```
YYYY-MM-DD
Ejemplo: 2026-05-15
```

## HTTP Status Codes Summary
| Code | Meaning |
|------|---------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Falta autenticación |
| 403 | Forbidden - No autorizado para este recurso |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: fecha ya reservada) |
| 500 | Server Error - Error interno |

---

## Notes
- Todas las fechas se manejan en formato ISO 8601 (YYYY-MM-DD)
- Los tokens de autenticación tienen expiración
- La validación de fechas rechaza si start_date > end_date
- Las fechas ocupadas incluyen el rango completo (inclusive en ambas fechas)
