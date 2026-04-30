import sqlite3
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"
STEAM_IMAGE_URL = "https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/header.jpg"


class GamesDB:
    def __init__(self, db_path: str | Path = DB_PATH) -> None:
        self.db_path = str(db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        # row_factory permite acceder a las columnas por nombre en vez de por indice
        conn.row_factory = sqlite3.Row
        return conn

    # --- Helpers internos ---

    def _insert_tags(self, cursor: sqlite3.Cursor, app_id: int, tags: list[str]) -> None:
        for tag in tags:
            cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag,))
            cursor.execute("SELECT tag_id FROM tags WHERE name = ?", (tag,))
            tag_id = cursor.fetchone()[0]
            cursor.execute(
                "INSERT OR IGNORE INTO game_tags (app_id, tag_id) VALUES (?, ?)",
                (app_id, tag_id)
            )

    def _get_tags_for_game(self, cursor: sqlite3.Cursor, app_id: int) -> list[str]:
        cursor.execute("""
            SELECT t.name FROM tags t
            JOIN game_tags gt ON t.tag_id = gt.tag_id
            WHERE gt.app_id = ?
        """, (app_id,))
        return [row["name"] for row in cursor.fetchall()]

    def _row_to_dict(self, cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict[str, Any]:
        game = dict(row)
        game["tags"] = self._get_tags_for_game(cursor, game["app_id"])
        game["image_url"] = STEAM_IMAGE_URL.format(app_id=game["app_id"])
        # Attach genre object when possible
        try:
            genre_id = game.get("genre_id")
            if genre_id:
                cursor.execute("SELECT id, name, icon FROM genres WHERE id = ?", (genre_id,))
                g = cursor.fetchone()
                game["genre"] = dict(g) if g else None
            else:
                # fallback to existing genre text
                game["genre"] = {"id": None, "name": game.get("genre") or ""}
        except Exception:
            game["genre"] = {"id": None, "name": game.get("genre") or ""}
        return game

    def add_game(
        self,
        app_id: int,
        name: str,
        release_date: str | None,
        genre_id: int | None,
        price_usd: float,
        discount_pct: int,
        tags: list[str] | None = None,
    ) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO games (app_id, name, release_date, genre_id, price_usd, discount_pct)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (app_id, name, release_date, genre_id, price_usd, discount_pct))

            if tags:
                self._insert_tags(cursor, app_id, tags)

    def get_game(self, app_id: int) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM games WHERE app_id = ?", (app_id,))
            row = cursor.fetchone()
            if row is None:
                return None
            return self._row_to_dict(cursor, row)

    def get_all_games(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM games ORDER BY RANDOM()")
            return [self._row_to_dict(cursor, row) for row in cursor.fetchall()]

    def get_by_genre(self, genre: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            # genre can be either an id (int) or a text name
            try:
                gid = int(genre)
                cursor.execute("SELECT * FROM games WHERE genre_id = ? ORDER BY RANDOM()", (gid,))
            except Exception:
                cursor.execute("SELECT * FROM games WHERE genre = ? ORDER BY RANDOM()", (genre,))

            return [self._row_to_dict(cursor, row) for row in cursor.fetchall()]

    def get_by_tag(self, tag: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            # Busca todos los juegos que tengan ese tag via JOIN
            cursor.execute("""
                SELECT g.* FROM games g
                JOIN game_tags gt ON g.app_id = gt.app_id
                JOIN tags t ON gt.tag_id = t.tag_id
                WHERE t.name = ?
                ORDER BY RANDOM()
            """, (tag,))
            return [self._row_to_dict(cursor, row) for row in cursor.fetchall()]

    def search(self, query: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            # Busca por nombre, genero o tags asociados al juego.
            like_query = f"%{query}%"
            cursor.execute(
                """
                SELECT DISTINCT g.*
                FROM games g
                LEFT JOIN game_tags gt ON g.app_id = gt.app_id
                LEFT JOIN tags t ON gt.tag_id = t.tag_id
                WHERE g.name LIKE ?
                   OR IFNULL(g.genre, '') LIKE ?
                   OR IFNULL(t.name, '') LIKE ?
                ORDER BY g.name COLLATE NOCASE
                """,
                (like_query, like_query, like_query),
            )
            return [self._row_to_dict(cursor, row) for row in cursor.fetchall()]

    def update_game(self, app_id: int, tags: list[str] | None = None, **fields: Any) -> bool:
        """
        Actualiza los campos que se pasen como kwargs. Ejemplo:
            db.update_game(123, price_usd=19.99, discount_pct=10)

        Si se pasa 'tags', reemplaza todos los tags del juego.
        Devuelve True si encontro el juego, False si no existe.
        """
        valid_fields = {"name", "release_date", "genre", "price_usd", "discount_pct"}
        filtered = {k: v for k, v in fields.items() if k in valid_fields}

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()

            if filtered:
                # Construye el SET dinamicamente segun los campos recibidos
                set_clause = ", ".join(f"{k} = ?" for k in filtered)
                values = list(filtered.values()) + [app_id]
                cursor.execute(
                    f"UPDATE games SET {set_clause} WHERE app_id = ?", values
                )
                if cursor.rowcount == 0:
                    return False

            if tags is not None:
                # Borra los tags actuales y los reinserta
                cursor.execute("DELETE FROM game_tags WHERE app_id = ?", (app_id,))
                self._insert_tags(cursor, app_id, tags)

            return True

    def delete_game(self, app_id: int) -> bool:
        """
        Elimina el juego y sus entradas en game_tags.
        Los tags en la tabla 'tags' se conservan (pueden pertenecer a otros juegos).
        Devuelve True si existia, False si no.
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()
            # game_tags se limpia primero para no violar la FK
            cursor.execute("DELETE FROM game_tags WHERE app_id = ?", (app_id,))
            cursor.execute("DELETE FROM games WHERE app_id = ?", (app_id,))
            return cursor.rowcount > 0

    def get_all_tags(self) -> list[dict[str, Any]]:
        """Obtiene todos los tags de la tabla tags."""
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT tag_id as id, name FROM tags ORDER BY name")
            return [dict(row) for row in cursor.fetchall()]