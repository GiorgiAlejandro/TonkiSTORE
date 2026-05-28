import csv
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CSV_PATH = DATA_DIR / "steam_games_2026.csv"
DB_PATH = DATA_DIR / "games.db"

def create_tables(cursor: sqlite3.Cursor) -> None:
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS games (
            app_id       INTEGER PRIMARY KEY,
            name         TEXT    NOT NULL,
            release_date TEXT,
            genre        TEXT,
            genre_id     INTEGER,
            price_usd    REAL,
            discount_pct INTEGER
        );

        CREATE TABLE IF NOT EXISTS tags (
            tag_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            name    TEXT    NOT NULL UNIQUE
        );

        -- Tabla de union N:M entre games y tags
        CREATE TABLE IF NOT EXISTS game_tags (
            app_id  INTEGER NOT NULL REFERENCES games(app_id),
            tag_id  INTEGER NOT NULL REFERENCES tags(tag_id),
            PRIMARY KEY (app_id, tag_id)
        );

        -- Tabla de usuarios
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre          TEXT    NOT NULL,
            apellido        TEXT    NOT NULL,
            email           TEXT    NOT NULL UNIQUE,
            password_hash   TEXT    NOT NULL,
            is_admin        INTEGER NOT NULL DEFAULT 0,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token       TEXT PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de características (features/media)
        CREATE TABLE IF NOT EXISTS features (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            icon        TEXT    NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de relación N:M entre games y features
        CREATE TABLE IF NOT EXISTS game_features (
            app_id      INTEGER NOT NULL REFERENCES games(app_id) ON DELETE CASCADE,
            feature_id  INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            PRIMARY KEY (app_id, feature_id)
        );
        -- Tabla de géneros (para normalizar géneros como catálogo)
        CREATE TABLE IF NOT EXISTS genres (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            icon        TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de reservas/disponibilidad (Sprint 3)
        CREATE TABLE IF NOT EXISTS reservations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id      INTEGER NOT NULL REFERENCES games(app_id) ON DELETE CASCADE,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            start_date  DATE    NOT NULL,
            end_date    DATE    NOT NULL,
            status      TEXT    DEFAULT 'confirmed',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(app_id, start_date, end_date)
        );

        -- Tabla de favoritos (Sprint 3)
        CREATE TABLE IF NOT EXISTS favorites (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            app_id      INTEGER NOT NULL REFERENCES games(app_id) ON DELETE CASCADE,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, app_id)
        );

        -- Tabla de compras permanentes
        CREATE TABLE IF NOT EXISTS purchases (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id          INTEGER NOT NULL REFERENCES games(app_id) ON DELETE CASCADE,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            purchase_price  REAL    NOT NULL,
            status          TEXT    DEFAULT 'completed',
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, app_id)
        );
    """)


def insert_game(cursor: sqlite3.Cursor, row: dict) -> None:
    cursor.execute("""
        INSERT OR IGNORE INTO games (app_id, name, release_date, genre, price_usd, discount_pct)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        int(row["AppID"]),
        row["Name"],
        row["Release_Date"] or None,
        row["Primary_Genre"] or None,
        float(row["Price_USD"]),
        int(row["Discount_Pct"]),
    ))


def insert_tags(cursor: sqlite3.Cursor, app_id: int, raw_tags: str) -> None:
    if not raw_tags.strip():
        return

    tags = [t.strip() for t in raw_tags.split(";") if t.strip()]

    for tag in tags:
        # Inserta el tag si no existe, si ya existe lo ignora
        cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag,))

        # Recupera el tag_id (sea nuevo o ya existente)
        cursor.execute("SELECT tag_id FROM tags WHERE name = ?", (tag,))
        tag_id = cursor.fetchone()[0]

        cursor.execute(
            "INSERT OR IGNORE INTO game_tags (app_id, tag_id) VALUES (?, ?)",
            (app_id, tag_id)
        )


def load_csv(cursor: sqlite3.Cursor, path: str | Path) -> None:
    # utf-8-sig strips BOM if present so DictReader keys are clean.
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            insert_game(cursor, row)
            insert_tags(cursor, int(row["AppID"]), row["All_Tags"])


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")  # SQLite no activa FK por defecto

    with conn:  # el 'with' hace commit automatico, o rollback si hay excepcion
        cursor = conn.cursor()
        create_tables(cursor)
        load_csv(cursor, CSV_PATH)

    conn.close()
    print("Base de datos creada correctamente.")


if __name__ == "__main__":
    main()
    # -- Migration step: ensure existing genre text is normalized into genres table
    db_path = DB_PATH
    import sqlite3

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    # Add genre_id column if missing
    cursor.execute("PRAGMA table_info(games)")
    cols = [r[1] for r in cursor.fetchall()]
    if "genre_id" not in cols:
        try:
            cursor.execute("ALTER TABLE games ADD COLUMN genre_id INTEGER")
            conn.commit()
            print("Added 'genre_id' column to games table.")
        except Exception:
            pass

    # Ensure genres table exists
    cursor.execute("CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, icon TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    conn.commit()

    # Migrate distinct genre text values into genres table and set games.genre_id
    cursor.execute("SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL AND TRIM(genre) <> ''")
    rows = [r[0] for r in cursor.fetchall()]
    for g in rows:
        try:
            cursor.execute("INSERT OR IGNORE INTO genres (name) VALUES (?)", (g,))
            conn.commit()
        except Exception:
            pass

    # Update games.genre_id from genres
    cursor.execute("SELECT id, name FROM genres")
    genres = cursor.fetchall()
    for gid, name in genres:
        cursor.execute("UPDATE games SET genre_id = ? WHERE genre = ?", (gid, name))
    conn.commit()
    conn.close()
    print("Migration: genre text values migrated into genres table (genre_id set).")
