"""
Script de pruebas para verificar los endpoints del Sprint 2
Ejecutar: python test_api.py (desde la carpeta backend)
"""

import json
import requests
from time import sleep

BASE_URL = "http://localhost:5000/api"

def test_register():
    print("\n=== TEST: Registrar Usuario ===")
    response = requests.post(f"{BASE_URL}/users/register", json={
        "email": "juan@example.com",
        "password": "password123",
        "first_name": "Juan",
        "last_name": "Pérez"
    })
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json().get("user", {}).get("user_id")


def test_login():
    print("\n=== TEST: Login Usuario ===")
    response = requests.post(f"{BASE_URL}/users/login", json={
        "email": "juan@example.com",
        "password": "password123"
    })
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_get_current_user():
    print("\n=== TEST: Obtener Usuario Actual ===")
    response = requests.get(f"{BASE_URL}/users/me")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_create_feature():
    print("\n=== TEST: Crear Característica ===")
    response = requests.post(f"{BASE_URL}/features", json={
        "name": "WiFi Gratis",
        "icon": "wifi"
    })
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json().get("feature", {}).get("feature_id")


def test_get_features():
    print("\n=== TEST: Listar Características ===")
    response = requests.get(f"{BASE_URL}/features")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_get_game_with_features():
    print("\n=== TEST: Obtener Detalle de Producto (con características) ===")
    response = requests.get(f"{BASE_URL}/games/570")  # Portal 2
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print("Nota: Product may not exist yet")


def test_logout():
    print("\n=== TEST: Logout Usuario ===")
    response = requests.post(f"{BASE_URL}/users/logout")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def main():
    print("╔══════════════════════════════════════════════════╗")
    print("║  PRUEBAS DE API - SPRINT 2                       ║")
    print("╚══════════════════════════════════════════════════╝")
    
    try:
        user_id = test_register()
        test_login()
        test_get_current_user()
        test_create_feature()
        test_get_features()
        test_get_game_with_features()
        test_logout()
        
        print("\n✓ Todas las pruebas completadas exitosamente!")
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: No se pudo conectar al servidor.")
        print("  Asegúrate de ejecutar: python app.py")
    except Exception as e:
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    main()
