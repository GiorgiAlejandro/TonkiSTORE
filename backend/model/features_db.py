import sqlite3
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"


class FeaturesDB:
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
                CREATE TABLE IF NOT EXISTS features (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT NOT NULL UNIQUE,
                    icon        TEXT NOT NULL,
                    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS game_features (
                    app_id      INTEGER NOT NULL REFERENCES games(app_id) ON DELETE CASCADE,
                    feature_id  INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
                    PRIMARY KEY (app_id, feature_id)
                );
                """
            )
            conn.commit()

    def create_feature(self, name: str, icon: str) -> dict[str, Any] | None:
        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO features (name, icon)
                    VALUES (?, ?)
                    """,
                    (name, icon),
                )

                feature_id = cursor.lastrowid
                cursor.execute("SELECT id, name, icon, created_at FROM features WHERE id = ?", (feature_id,))
                row = cursor.fetchone()
                return dict(row) if row else None
        except sqlite3.IntegrityError:
            return None

    def get_all_features(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, icon, created_at FROM features ORDER BY name")
            return [dict(row) for row in cursor.fetchall()]

    def get_feature(self, feature_id: int) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, icon, created_at FROM features WHERE id = ?", (feature_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_feature(self, feature_id: int, name: str | None = None, icon: str | None = None) -> bool:
        updates = {}
        if name is not None:
            updates["name"] = name
        if icon is not None:
            updates["icon"] = icon

        if not updates:
            return False

        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                set_clause = ", ".join(f"{column} = ?" for column in updates)
                values = list(updates.values()) + [feature_id]
                cursor.execute(f"UPDATE features SET {set_clause} WHERE id = ?", values)
                return cursor.rowcount > 0
        except sqlite3.IntegrityError:
            return False

    def delete_feature(self, feature_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM game_features WHERE feature_id = ?", (feature_id,))
            cursor.execute("DELETE FROM features WHERE id = ?", (feature_id,))
            return cursor.rowcount > 0

    def get_features_for_game(self, app_id: int) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT f.id, f.name, f.icon, f.created_at
                FROM features f
                JOIN game_features gf ON f.id = gf.feature_id
                WHERE gf.app_id = ?
                ORDER BY f.name
                """,
                (app_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def add_feature_to_game(self, app_id: int, feature_id: int) -> bool:
        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO game_features (app_id, feature_id)
                    VALUES (?, ?)
                    """,
                    (app_id, feature_id),
                )
                return cursor.rowcount > 0
        except sqlite3.IntegrityError:
            return False

    def remove_feature_from_game(self, app_id: int, feature_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                DELETE FROM game_features
                WHERE app_id = ? AND feature_id = ?
                """,
                (app_id, feature_id),
            )
            return cursor.rowcount > 0

    def set_features_for_game(self, app_id: int, feature_ids: list[int]) -> bool:
        normalized_feature_ids: list[int] = []
        seen: set[int] = set()

        try:
            for raw_id in feature_ids:
                feature_id = int(raw_id)
                if feature_id in seen:
                    continue
                seen.add(feature_id)
                normalized_feature_ids.append(feature_id)
        except (TypeError, ValueError):
            return False

        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM game_features WHERE app_id = ?", (app_id,))

                for feature_id in normalized_feature_ids:
                    cursor.execute(
                        """
                        INSERT INTO game_features (app_id, feature_id)
                        VALUES (?, ?)
                        """,
                        (app_id, feature_id),
                    )

                return True
        except sqlite3.IntegrityError:
            return False
