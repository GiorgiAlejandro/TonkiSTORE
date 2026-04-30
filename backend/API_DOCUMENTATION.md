# API Documentation

Referencia corta y vigente de los endpoints que usa el frontend.

## Base

Servidor local: `http://localhost:5000`

## Auth y usuarios

### `POST /api/users/register`

Registra un usuario nuevo.

```json
{
    "email": "usuario@example.com",
    "password": "password123",
    "first_name": "Juan",
    "last_name": "Pérez"
}
```

### `POST /api/users/login`

Inicia sesión y devuelve `token` y `user`.

### `POST /api/users/logout`

Cierra la sesión actual.

### `GET /api/users/me`

Devuelve el usuario autenticado.

### `GET /api/users`

Lista usuarios. Requiere admin.

### `PUT /api/users/<user_id>/admin`

Activa o desactiva permisos de administrador. Requiere admin.

```json
{ "is_admin": true }
```

## Productos

### `GET /api/games`

Lista juegos.

### `GET /api/games/search?q=...`

Busca juegos por texto.

### `GET /api/games/<app_id>`

Devuelve el detalle completo del juego. Incluye `tags` y `features`.

### `POST /api/games`

Crea un juego. Requiere admin.

### `PUT /api/games/<app_id>`

Actualiza un juego. Requiere admin.

### `DELETE /api/games/<app_id>`

Elimina un juego. Requiere admin.

### `GET /api/games/<app_id>/features`

Lista las características asociadas al juego.

### `POST /api/games/<app_id>/features`

Reemplaza las características del juego. Requiere admin.

```json
{ "feature_ids": [1, 2, 3] }
```

## Tags y características

### `GET /api/tags`

Devuelve el catálogo de tags que usa el editor de productos.

### `GET /api/features`

Lista características visibles en el detalle del producto.

### `POST /api/features`

### `PUT /api/features/<feature_id>`

### `DELETE /api/features/<feature_id>`

CRUD de características. Solo admin.

## Respuestas esperadas

- Los endpoints que crean recursos devuelven el objeto creado.
- Los endpoints protegidos retornan `403` cuando no hay sesión de admin.
- Los errores de validación retornan JSON con `error`.

## Uso desde frontend

- En requests autenticadas, el navegador debe enviar cookies de sesión.
- El frontend actual consulta `/api/tags` para el selector de géneros y `/api/features` para el detalle del producto.
  }

````

---

### 2. Asociar Características a Producto (Solo Admin)
**PUT** `/api/games/<app_id>/features`

Body:
```json
{
  "feature_ids": [1, 2, 3]
}
````

Response (200):

```json
{
    "message": "features associated successfully",
    "game": {
        "app_id": 123,
        "name": "Portal 2",
        "features": [
            {
                "feature_id": 1,
                "name": "WiFi",
                "icon": "wifi"
            }
        ]
    }
}
```

---

## Notas de Implementación

- **Autenticación**: Se usa sesiones de Flask. El usuario debe estar autenticado para acceder a endpoints que lo requieran.
- **Permisos Admin**: Solo usuarios con `is_admin = 1` pueden acceder a endpoints administrativos.
- **Validación**: Se valida que emails sean únicos, nombres tengan al menos 2 caracteres, contraseñas mínimo 6 caracteres.
- **Seguridad**: Las contraseñas se hashean con werkzeug.security.
- **CORS**: Habilitado para permitir requests desde otros puertos (ej: Live Server del frontend).
