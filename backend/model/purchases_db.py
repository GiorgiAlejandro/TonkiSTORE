import sqlite3
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"


class PurchasesDB:
    def __init__(self, db_path: str | Path = DB_PATH) -> None:
        self.db_path = str(db_path)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS purchases (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    app_id          INTEGER NOT NULL REFERENCES games(app_id) ON DELETE CASCADE,
                    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    purchase_price  REAL    NOT NULL,
                    status          TEXT    DEFAULT 'completed',
                    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, app_id)
                )
                """
            )

    def has_purchase(self, user_id: int, app_id: int) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM purchases WHERE user_id = ? AND app_id = ? LIMIT 1",
                (user_id, app_id),
            )
            return cursor.fetchone() is not None

    def add_purchase(self, app_id: int, user_id: int, purchase_price: float) -> bool:
        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO purchases (app_id, user_id, purchase_price, status)
                    VALUES (?, ?, ?, 'completed')
                    """,
                    (app_id, user_id, purchase_price),
                )
                return cursor.rowcount > 0
        except sqlite3.IntegrityError:
            return False

    def get_user_purchases(self, user_id: int) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT p.id, p.app_id, p.user_id, p.purchase_price, p.status, p.created_at,
                       g.name, g.release_date, g.genre, g.price_usd, g.discount_pct
                FROM purchases p
                JOIN games g ON p.app_id = g.app_id
                WHERE p.user_id = ?
                ORDER BY p.created_at DESC
                """,
                (user_id,),
            )
            return [dict(row) for row in cursor.fetchall()]