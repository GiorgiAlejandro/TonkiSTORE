import hashlib
import secrets
import sqlite3
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "games.db"


class UsersDB:
    def __init__(self, db_path: str | Path = DB_PATH) -> None:
        self.db_path = str(db_path)
        self.ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def _hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def _public_user(row: sqlite3.Row | None) -> dict[str, Any] | None:
        if row is None:
            return None

        user = dict(row)
        user["is_admin"] = bool(user.get("is_admin", 0))
        return user

    def ensure_schema(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre          TEXT    NOT NULL,
                    apellido        TEXT    NOT NULL,
                    email           TEXT    NOT NULL UNIQUE,
                    password_hash   TEXT    NOT NULL,
                    is_admin        INTEGER NOT NULL DEFAULT 0,
                    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cursor.execute("PRAGMA table_info(users)")
            columns = {row[1] for row in cursor.fetchall()}

            if "is_admin" not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token       TEXT PRIMARY KEY,
                    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1")
            admin_count = cursor.fetchone()[0]

            if admin_count == 0:
                cursor.execute("SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1")
                row = cursor.fetchone()
                if row is not None:
                    cursor.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (row[0],))

            conn.commit()

    def user_exists(self, email: str) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM users WHERE email = ?", (email,))
            return cursor.fetchone() is not None

    def count_users(self) -> int:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            return int(cursor.fetchone()[0])

    def count_admins(self) -> int:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1")
            return int(cursor.fetchone()[0])

    def create_user(self, nombre: str, apellido: str, email: str, password: str) -> dict[str, Any] | None:
        if self.user_exists(email):
            return None

        password_hash = self._hash_password(password)
        should_be_admin = 1 if self.count_users() == 0 and self.count_admins() == 0 else 0

        try:
            with self._connect() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO users (nombre, apellido, email, password_hash, is_admin)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (nombre, apellido, email, password_hash, should_be_admin),
                )

                user_id = cursor.lastrowid
                cursor.execute(
                    """
                    SELECT id, nombre, apellido, email, is_admin, created_at
                    FROM users
                    WHERE id = ?
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
                return self._public_user(row)
        except sqlite3.IntegrityError:
            return None

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, nombre, apellido, email, is_admin, created_at
                FROM users
                WHERE email = ?
                """,
                (email,),
            )
            return self._public_user(cursor.fetchone())

    def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, nombre, apellido, email, is_admin, created_at
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            )
            return self._public_user(cursor.fetchone())

    def list_users(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, nombre, apellido, email, is_admin, created_at
                FROM users
                ORDER BY is_admin DESC, created_at ASC, id ASC
                """
            )
            return [self._public_user(row) for row in cursor.fetchall()]

    def verify_password(self, email: str, password: str) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row is None:
                return False

            stored_hash = row["password_hash"]
            provided_hash = self._hash_password(password)
            return stored_hash == provided_hash

    def create_session(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)

        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO sessions (token, user_id)
                VALUES (?, ?)
                """,
                (token, user_id),
            )

        return token

    def get_user_by_session(self, token: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id, u.nombre, u.apellido, u.email, u.is_admin, u.created_at
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token = ?
                """,
                (token,),
            )
            return self._public_user(cursor.fetchone())

    def delete_session(self, token: str) -> bool:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return cursor.rowcount > 0

    def set_admin_status(self, user_id: int, is_admin: bool) -> dict[str, Any] | None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row is None:
                return None

            current_is_admin = bool(row["is_admin"])

            if current_is_admin and not is_admin:
                cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1")
                admin_count = int(cursor.fetchone()[0])
                if admin_count <= 1:
                    raise ValueError("No se puede quitar el permiso al ultimo administrador.")

            cursor.execute(
                """
                UPDATE users
                SET is_admin = ?
                WHERE id = ?
                """,
                (1 if is_admin else 0, user_id),
            )

            cursor.execute(
                """
                SELECT id, nombre, apellido, email, is_admin, created_at
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            )
            return self._public_user(cursor.fetchone())
