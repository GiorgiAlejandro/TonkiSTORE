import sqlite3
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"


class FavoritesDB:
    def __init__(self, db_path: str | Path = DB_PATH) -> None:
        self.db_path = str(db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    def add_favorite(self, user_id: int, app_id: int) -> bool:
        """
        Agrega un producto a los favoritos del usuario.
        Retorna True si se agregó correctamente, False si ya existía.
        """
        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO favorites (user_id, app_id)
                    VALUES (?, ?)
                    """,
                    (user_id, app_id),
                )
                return cursor.rowcount > 0
        except sqlite3.IntegrityError:
            # Ya existe el favorito
            return False

    def remove_favorite(self, user_id: int, app_id: int) -> bool:
        """
        Elimina un producto de los favoritos del usuario.
        Retorna True si se eliminó, False si no existía.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM favorites WHERE user_id = ? AND app_id = ?",
                (user_id, app_id),
            )
            return cursor.rowcount > 0

    def is_favorite(self, user_id: int, app_id: int) -> bool:
        """Verifica si un producto es favorito del usuario."""
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM favorites WHERE user_id = ? AND app_id = ? LIMIT 1",
                (user_id, app_id),
            )
            return cursor.fetchone() is not None

    def get_user_favorites(self, user_id: int) -> list[dict[str, Any]]:
        """
        Obtiene todos los productos favoritos del usuario.
        Retorna la información del producto incluyendo detalles completos.
        """
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT g.app_id, g.name, g.release_date, g.genre_id, 
                       g.price_usd, g.discount_pct, g.genre, f.created_at
                FROM favorites f
                JOIN games g ON f.app_id = g.app_id
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
                """,
                (user_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def count_user_favorites(self, user_id: int) -> int:
        """Cuenta el total de favoritos del usuario."""
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM favorites WHERE user_id = ?",
                (user_id,),
            )
            return int(cursor.fetchone()[0])
