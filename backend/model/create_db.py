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