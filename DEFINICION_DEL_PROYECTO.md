# Definicion del proyecto

Este proyecto consiste en el desarrollo de una aplicacion web orientada a la visualizacion y gestion de un catalogo de videojuegos, con una experiencia de usuario dividida entre un sitio publico de exploracion y un panel de administracion.

La aplicacion fue construida utilizando un backend en Python con Flask, una base de datos SQLite para la persistencia de la informacion y un frontend desarrollado con HTML, CSS y JavaScript.

Como fuente de datos, se utilizo una base de datos encontrada en linea, que contiene los 1000 juegos mas populares de Steam. A partir de esa informacion se implementaron funcionalidades de consulta, busqueda, filtrado y visualizacion detallada de los juegos.

El objetivo principal del proyecto fue integrar una interfaz moderna con una API funcional, permitiendo explorar el catalogo, acceder al detalle de cada juego y administrar nuevos registros desde un panel dedicado.

## Nuevas implementaciones (Sprint 3)

Durante Sprint 3 se añadieron varias funcionalidades importantes que amplían tanto la experiencia de usuario como las capacidades del backend:

- Sistema de Favoritos: usuarios autenticados pueden marcar/desmarcar juegos como favoritos y acceder a una vista dedicada con sus favoritos.
- Sistema de Reservas: los usuarios pueden reservar juegos por rango de fechas; el backend valida conflictos y almacena las reservas.
- Búsqueda por Fecha: se puede filtrar el catálogo por disponibilidad en un rango de fechas (`start_date`, `end_date`).
- Flujo de alquiler/reserva en detalle de producto: la vista de detalle muestra inputs de fecha, calcula precio por día y total (regla: precio por día = precio_con_descuento / 30, redondeado) y permite confirmar reserva.
- Integración frontend-backend: nuevos endpoints y módulos JS (`favorites-view.js`, `detail-availability.js`, `search-advanced.js`) y eventos para mantener la UI sincronizada (`products:updated`, `favorites:changed`).

Estas implementaciones permiten casos de uso como:

- Marcar y gestionar una lista personal de favoritos.
- Buscar juegos que estén disponibles en fechas concretas para planificar alquileres.
- Reservar un juego por un período limitado, con validación de solapamientos.

Para más detalles técnicos y ejemplos de uso, ver `backend/API_ENDPOINTS_SPRINT3.md` y `backend/SPRINT_3_CHANGES.md`.

## Nuevas implementaciones (Sprint 4)

Durante Sprint 4 se cerró el flujo de compra/alquiler y se ajustó la experiencia pública para que sea más clara y utilizable:

- Carrito unificado: permite procesar compras y alquileres juntos desde una sola confirmación.
- Confirmación de checkout: muestra el total final y el detalle de juegos comprados y alquilados.
- Biblioteca del usuario: agrupa compras y alquileres activos en una vista dedicada.
- Catálogo y recomendaciones: los juegos ya poseídos se marcan visualmente y se ocultan del listado normal salvo búsqueda manual.
- Búsqueda avanzada: se incorporó el filtro "En oferta" como checkbox y el acceso directo desde la portada.
- Interfaz principal: se simplificaron los accesos rápidos y se eliminó información de depuración innecesaria.

Para más detalles técnicos y ejemplos de uso, ver `backend/API_ENDPOINTS_SPRINT4.md` y `backend/SPRINT_4_CHANGES.md`.
