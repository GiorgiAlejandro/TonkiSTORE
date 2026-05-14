# API Documentation

Referencia corta y vigente de los endpoints que usa el frontend.

## Base

Servidor local: `http://localhost:5000`

## Auth y usuarios

### `POST /api/users/register`

Registra un usuario nuevo.

````json
{
    # API Documentation

    Referencia de los endpoints más relevantes, incluyendo las nuevas implementaciones de Sprint 3 (favoritos, reservas y búsqueda por fecha).

    Base: `http://localhost:5000`

    ## Autenticación y usuarios

    - `POST /api/users/register` — Registra un usuario.
    - `POST /api/users/login` — Inicia sesión y devuelve token/user.
    - `POST /api/users/logout` — Cierra sesión.
    - `GET /api/users/me` — Datos del usuario autenticado.
    - `GET /api/users` — Listar usuarios (admin).
    - `PUT /api/users/<user_id>/admin` — Asignar/revocar admin (admin only).

    ## Productos

    - `GET /api/games` — Listado y filtros.
    - `GET /api/games/search?q=...` — Búsqueda por texto.
    - `GET /api/games/search/by-date?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&q=...` — Buscar juegos disponibles en un rango de fechas.
    - `GET /api/games/<app_id>` — Detalle del juego (incluye `tags`, `features`, `price_usd`, `discount_pct`, etc.).
    - `GET /api/games/<app_id>/availability` — Detalle + `occupied_dates` del juego.
    - `GET /api/games/<app_id>/occupied-dates` — Lista de intervalos ocupados (para calendario/frontend).
    - `GET /api/games/<app_id>/check-availability?start_date=...&end_date=...` — Verifica disponibilidad en un rango.
    - `POST /api/games` / `PUT /api/games/<app_id>` / `DELETE /api/games/<app_id>` — CRUD (admin).

    ## Favoritos (Sprint 3)

    Todos los endpoints de favoritos requieren autenticación del usuario.

    - `GET /api/favorites` — Lista los juegos marcados como favoritos por el usuario autenticado.
    - `POST /api/favorites/<app_id>` — Marca el juego `app_id` como favorito.
    - `DELETE /api/favorites/<app_id>` — Remueve de favoritos.
    - `GET /api/favorites/<app_id>/check` — Devuelve `{ "is_favorite": true|false }`.

    Ejemplo `GET /api/favorites`:

    ```json
    [
        { "app_id": 730, "name": "Counter-Strike 2", "price_usd": 0.0, "discount_pct": 0 }
    ]
    ```

    ## Reservas (Sprint 3)

    Todos los endpoints de reservas requieren autenticación.

    - `POST /api/reservations`
        - Crea una reserva para el usuario autenticado.
        - Body esperado:

    ```json
    {
        "app_id": 730,
        "start_date": "2026-05-15",
        "end_date": "2026-05-20"
    }
    ```

    - `GET /api/reservations` — Lista reservas del usuario.
    - `GET /api/reservations/<id>` — Detalle de una reserva.
    - `DELETE /api/reservations/<id>` — Cancela una reserva.

    Respuesta exitosa típica (POST):

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

    ## Formatos y convenciones

    - Todas las fechas usan ISO `YYYY-MM-DD`.
    - Endpoints protegidos requieren `Authorization: Bearer <token>` o sesión activa (cookies), según configuración.
    - Errores de validación devuelven JSON con `error` y código HTTP apropiado.

    ## Notas de integración frontend

    - El frontend solicita listas de juegos y mapea campos `image`, `image_url` y `price_usd` para mostrar miniaturas.
    - Eventos del frontend relevantes: `products:updated`, `favorites:changed`, `auth:changed`.
    - Para crear reservas el frontend usa `POST /api/reservations` con las cabeceras de autenticación.

    ---

    Para detalles completos de payloads y ejemplos, ver `API_ENDPOINTS_SPRINT3.md` y `SPRINT_3_CHANGES.md`.
- Los errores de validación retornan JSON con `error`.
````
