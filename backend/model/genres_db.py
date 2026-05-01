import sqlite3
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"


class GenresDB:
    def __init__(self, db_path: str | Path = DB_PATH) -> None:
        self.db_path = str(db_path)
        self.ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    def ensure_schema(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()
            cursor.executescript(
                """
                CREATE TABLE IF NOT EXISTS genres (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT NOT NULL UNIQUE,
                    icon        TEXT,
                    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.commit()

    def create_genre(self, name: str, icon: str | None = None) -> dict[str, Any] | None:
        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO genres (name, icon) VALUES (?, ?)",
                    (name, icon or ""),
                )
                genre_id = cursor.lastrowid
                cursor.execute("SELECT id, name, icon, created_at FROM genres WHERE id = ?", (genre_id,))
                row = cursor.fetchone()
                return dict(row) if row else None
        except sqlite3.IntegrityError:
            return None

    def get_all_genres(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, icon, created_at FROM genres ORDER BY name")
            return [dict(row) for row in cursor.fetchall()]

    def get_genre(self, genre_id: int) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, icon, created_at FROM genres WHERE id = ?", (genre_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def delete_genre(self, genre_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM genres WHERE id = ?", (genre_id,))
            return cursor.rowcount > 0
