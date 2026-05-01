# Backend

Backend Flask de TonkiSTORE con autenticación, administración, productos y catálogo de tags/características.

## Arranque rápido

```bash
pip install -r requirements.txt
python model/create_db.py
python init_test_data.py
python app.py
```

Servidor: `http://localhost:5000`

## Datos de prueba

- Admin de prueba: `prueba@gmail.com`
- Password: `password`

Este usuario es creado por `init_test_data.py` para pruebas rápidas.

## Qué expone

- Autenticación y sesión: `POST /api/users/register`, `POST /api/users/login`, `POST /api/users/logout`, `GET /api/users/me`
- Administración de usuarios: `GET /api/users`, `PUT /api/users/<id>/admin`
- Productos: `GET /api/games`, `GET /api/games/search`, `GET /api/games/<app_id>`, `POST /api/games`, `PUT /api/games/<app_id>`, `DELETE /api/games/<app_id>`
- Tags: `GET /api/tags`
- Características: `GET /api/features`, `POST /api/features`, `PUT /api/features/<id>`, `DELETE /api/features/<id>`
- Asignación de características a producto: `GET /api/games/<app_id>/features`, `POST /api/games/<app_id>/features`

## Pruebas

```bash
python test_api.py
```

## Notas

- Las rutas administrativas requieren sesión de admin.
- El frontend usa cookies de sesión y el catálogo de tags para el editor de productos.
- La base SQLite está en `model/data/games.db`.
