"""
Script para inicializar datos de prueba en la base de datos
Ejecutar: python init_test_data.py (desde la carpeta backend)
"""

import sqlite3
import hashlib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "model" / "data" / "games.db"


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def init_test_data():
    """Inicializa datos de prueba en la BD."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()
    
    print("Inicializando datos de prueba...")
    
    # Crear usuario admin
    admin_password_hash = hash_password("1234")
    try:
        cursor.execute("""
            INSERT INTO users (nombre, apellido, email, password_hash, is_admin)
            VALUES (?, ?, ?, ?, 1)
        """, ("Admin", "User", "admin@example.com", admin_password_hash))
        print("✓ Usuario admin creado: admin@example.com / 1234")
    except sqlite3.IntegrityError:
        print("! Usuario admin ya existe")

    # Crear cuenta de prueba solicitada por el equipo
    prueba_password_hash = hash_password("password")
    try:
        cursor.execute("""
            INSERT INTO users (nombre, apellido, email, password_hash, is_admin)
            VALUES (?, ?, ?, ?, 1)
        """, ("Prueba", "Admin", "prueba@gmail.com", prueba_password_hash))
        print("✓ Usuario de prueba creado: prueba@gmail.com / password")
    except sqlite3.IntegrityError:
        print("! Usuario de prueba ya existe")
    
    # Crear características de ejemplo
    features = [
        ("WiFi Gratis", "wifi"),
        ("Estacionamiento Gratuito", "car"),
        ("Aire Acondicionado", "air-conditioner"),
        ("Piscina", "pool"),
        ("Gym", "dumbbells"),
        ("Mascotas Permitidas", "pet"),
    ]
    
    for name, icon in features:
        try:
            cursor.execute("INSERT INTO features (name, icon) VALUES (?, ?)", (name, icon))
            print(f"✓ Característica creada: {name}")
        except sqlite3.IntegrityError:
            print(f"! Característica ya existe: {name}")
    
    # Crear géneros como features también
    genres = [
        ("Action", "🎮"),
        ("RPG", "⚔️"),
        ("Adventure", "🗺️"),
        ("Strategy", "♟️"),
        ("Puzzle", "🧩"),
        ("Sports", "⚽"),
        ("Shooter", "🔫"),
        ("Simulation", "🎛️"),
        ("Indie", "🎨"),
    ]
    
    for name, icon in genres:
        try:
            cursor.execute("INSERT INTO features (name, icon) VALUES (?, ?)", (name, icon))
            print(f"✓ Género creado: {name}")
        except sqlite3.IntegrityError:
            print(f"! Género ya existe: {name}")
    
    conn.commit()
    conn.close()
    print("\n✓ Datos de prueba inicializados!")


if __name__ == "__main__":
    init_test_data()
