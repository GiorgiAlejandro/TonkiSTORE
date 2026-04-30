# Guía del Panel de Administración

> NOTA IMPORTANTE: Cuenta de prueba administrador: **prueba@gmail.com** — contraseña: **password**. Está creada por el script de datos de prueba.

## Acceso

Hay dos formas de entrar:

1. Ir directo a `admin.html`.
2. Desde la tienda principal, usar el botón `Panel de admin` del header. Solo aparece para usuarios autenticados con rol de administrador.

## Qué permite hacer

- Ver, buscar, crear, editar y eliminar productos.
- Gestionar usuarios y dar o quitar permisos de admin.
- Administrar características y tags desde el editor de productos.

## Editor de producto

- El campo de géneros funciona con chips: escribís, presionás Enter y se agrega debajo.
- Las sugerencias excluyen lo que ya elegiste.
- La `x` de cada chip lo quita de la selección.

## Usuarios

- La tabla de usuarios se puede buscar y paginar.
- El botón de admin está deshabilitado para la propia cuenta activa.

## Requisitos para usarlo

- El backend debe estar ejecutándose.
- Necesitás una cuenta administradora.
- La sesión se guarda con cookies del navegador.

## Ruta útil

- Backend: `http://localhost:5000/admin`
- Frontend estático: `admin.html`
