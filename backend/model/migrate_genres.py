import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "games.db"


def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # Ensure genres table
    cur.execute(
        "CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, icon TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.commit()

    # Add genre_id column if missing
    cur.execute("PRAGMA table_info(games)")
    cols = [r[1] for r in cur.fetchall()]
    if "genre_id" not in cols:
        cur.execute("ALTER TABLE games ADD COLUMN genre_id INTEGER")
        conn.commit()
        print("Added genre_id column")

    # Migrate text genres to genres table
    cur.execute("SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL AND TRIM(genre) <> ''")
    rows = [r[0] for r in cur.fetchall()]
    for g in rows:
        try:
            cur.execute("INSERT OR IGNORE INTO genres (name) VALUES (?)", (g,))
        except Exception:
            pass
    conn.commit()

    # Update games.genre_id
    cur.execute("SELECT id, name FROM genres")
    for gid, name in cur.fetchall():
        cur.execute("UPDATE games SET genre_id = ? WHERE genre = ?", (gid, name))
    conn.commit()
    conn.close()
    print("Migration complete")


if __name__ == '__main__':
    migrate()
