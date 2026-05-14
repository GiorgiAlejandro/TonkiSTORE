# Guía del Panel de Administración

Acceso rápido al panel de administración para crear/editar productos, gestionar usuarios y administrar características.

## Acceso

1. Abrir `admin.html` en el navegador.
2. Desde la tienda principal, usar el botón `Panel de admin` del header (visible solo para admins autenticados).

## Qué permite hacer

- Listar, buscar, crear, editar y eliminar productos.
- Gestionar usuarios y asignar/remover permisos de admin.
- Administrar `features` y `tags` desde el editor de producto.

## Notas importantes sobre cambios recientes

- Se eliminaron los banners públicos que mostraban credenciales de prueba en el frontend.
- Miniaturas de producto en el panel ahora usan la propiedad `image_url` proporcionada por el backend cuando esté disponible. Si no hay `image_url`, se usa `image` o una imagen por defecto.
- Se ajustó el CSS de las miniaturas para mantener la misma relación que la vista pública de productos.

## Editor de producto

- El campo de géneros usa chips: escribe y presiona Enter para añadir. Las sugerencias excluyen las opciones ya seleccionadas.

## Requisitos

- Backend en `http://localhost:5000` corriendo.
- Usuario con rol admin autenticado (sesión basada en cookies o token según configuración).

## Rutas útiles

- Backend admin: `http://localhost:5000/admin`
- Frontend estático: `admin.html`
