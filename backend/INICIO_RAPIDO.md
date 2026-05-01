# Inicio rápido

## 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

## 2. Crear y poblar la base de datos

```bash
python model/create_db.py
python init_test_data.py
```

## 3. Levantar el servidor

```bash
python app.py
```

Servidor: `http://localhost:5000`

## 4. Ejecutar pruebas

```bash
python test_api.py
```

## 5. Usuario administrador

- Email: `prueba@gmail.com`
- Password: `password`

La cuenta de prueba es creada por `init_test_data.py`.

## Endpoints que más se usan

| Función                               | Método          | URL                            |
| ------------------------------------- | --------------- | ------------------------------ |
| Registrar usuario                     | POST            | `/api/users/register`          |
| Login                                 | POST            | `/api/users/login`             |
| Logout                                | POST            | `/api/users/logout`            |
| Usuario actual                        | GET             | `/api/users/me`                |
| Listar usuarios                       | GET             | `/api/users`                   |
| Cambiar admin                         | PUT             | `/api/users/{id}/admin`        |
| Listar tags                           | GET             | `/api/tags`                    |
| Listar características                | GET             | `/api/features`                |
| Crear/editar/eliminar características | POST/PUT/DELETE | `/api/features`                |
| Detalle de juego                      | GET             | `/api/games/{app_id}`          |
| Asignar características               | POST            | `/api/games/{app_id}/features` |

## Nota útil

El frontend usa cookies de sesión. Si abrís la tienda principal, el botón `Panel de admin` aparece solo para usuarios autenticados con rol de administrador.
