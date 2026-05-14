import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"


class ReservationsDB:
    def __init__(self, db_path: str | Path = DB_PATH) -> None:
        self.db_path = str(db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    def add_reservation(
        self, app_id: int, user_id: int, start_date: str, end_date: str
    ) -> bool:
        """
        Agrega una nueva reserva para un producto.
        Las fechas deben estar en formato ISO (YYYY-MM-DD).
        Retorna True si se agregó correctamente, False si hay conflicto de fechas.
        """
        try:
            with self._connect() as conn:
                # Verifica que no haya conflictos de fechas
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT 1 FROM reservations
                    WHERE app_id = ? 
                    AND (
                        (start_date <= ? AND end_date >= ?)
                        OR (start_date <= ? AND end_date >= ?)
                        OR (start_date >= ? AND end_date <= ?)
                    )
                    LIMIT 1
                    """,
                    (app_id, end_date, start_date, end_date, start_date, end_date, start_date),
                )

                if cursor.fetchone() is not None:
                    return False  # Hay conflicto de fechas

                # Si no hay conflicto, inserta la reserva
                cursor.execute(
                    """
                    INSERT INTO reservations (app_id, user_id, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'confirmed')
                    """,
                    (app_id, user_id, start_date, end_date),
                )
                return cursor.rowcount > 0
        except sqlite3.IntegrityError:
            return False

    def get_occupied_dates(self, app_id: int) -> list[dict[str, Any]]:
        """
        Obtiene todas las fechas ocupadas para un producto.
        Retorna una lista de diccionarios con start_date y end_date.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT start_date, end_date 
                FROM reservations
                WHERE app_id = ? AND status = 'confirmed'
                ORDER BY start_date ASC
                """,
                (app_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_available_dates(
        self, app_id: int, start_date: str, end_date: str
    ) -> bool:
        """
        Verifica si todas las fechas en el rango [start_date, end_date] están disponibles.
        Retorna True si están disponibles, False si hay alguna reserva.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT 1 FROM reservations
                WHERE app_id = ? AND status = 'confirmed'
                AND (
                    (start_date <= ? AND end_date >= ?)
                    OR (start_date <= ? AND end_date >= ?)
                    OR (start_date >= ? AND end_date <= ?)
                )
                LIMIT 1
                """,
                (app_id, end_date, start_date, end_date, start_date, end_date, start_date),
            )
            return cursor.fetchone() is None

    def get_user_reservations(self, user_id: int) -> list[dict[str, Any]]:
        """
        Obtiene todas las reservas del usuario.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT r.id, r.app_id, r.start_date, r.end_date, r.status, r.created_at,
                       g.name, g.price_usd, g.discount_pct
                FROM reservations r
                JOIN games g ON r.app_id = g.app_id
                WHERE r.user_id = ?
                ORDER BY r.created_at DESC
                """,
                (user_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_reservation_by_id(self, reservation_id: int) -> dict[str, Any] | None:
        """
        Obtiene una reserva específica por su ID.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, app_id, user_id, start_date, end_date, status, created_at
                FROM reservations
                WHERE id = ?
                """,
                (reservation_id,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def cancel_reservation(self, reservation_id: int) -> bool:
        """
        Cancela una reserva (cambia el estado a 'cancelled').
        Retorna True si se canceló, False si no existía.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE reservations SET status = 'cancelled' WHERE id = ?",
                (reservation_id,),
            )
            return cursor.rowcount > 0

    def count_reservations_for_game(self, app_id: int) -> int:
        """
        Cuenta el total de reservas confirmadas para un producto.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM reservations WHERE app_id = ? AND status = 'confirmed'",
                (app_id,),
            )
            return int(cursor.fetchone()[0])

    def get_available_games(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        """
        Obtiene todos los productos disponibles en el rango de fechas especificado.
        Retorna una lista de diccionarios con información de los juegos.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            # Obtiene app_ids que NO tienen conflicto de fechas
            cursor.execute(
                """
                SELECT DISTINCT g.app_id, g.name, g.release_date, g.genre_id, 
                       g.price_usd, g.discount_pct, g.genre
                FROM games g
                WHERE g.app_id NOT IN (
                    SELECT DISTINCT app_id FROM reservations
                    WHERE status = 'confirmed'
                    AND (
                        (start_date <= ? AND end_date >= ?)
                        OR (start_date <= ? AND end_date >= ?)
                        OR (start_date >= ? AND end_date <= ?)
                    )
                )
                ORDER BY g.name
                """,
                (end_date, start_date, end_date, start_date, end_date, start_date),
            )
            return [dict(row) for row in cursor.fetchall()]
