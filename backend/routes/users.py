import re
from flask import Blueprint, jsonify, request
from auth import get_authenticated_user, get_request_token
from model.users_db import UsersDB

users_bp = Blueprint("users", __name__)
db = UsersDB()


def _validate_email(email: str) -> bool:
    pattern = r"^[^@]+@[^@]+\.[^@]+$"
    return re.match(pattern, email) is not None


def _validate_name(name: str) -> bool:
    return name and name.replace(" ", "").isalpha() and len(name) >= 2


def _validate_password(password: str) -> bool:
    return password and len(password) >= 6


@users_bp.route("/users/register", methods=["POST"])
def register():
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "El cuerpo de la solicitud debe ser JSON"}), 400

    nombre = (body.get("nombre") or "").strip()
    apellido = (body.get("apellido") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not nombre:
        return jsonify({"error": "El nombre es requerido"}), 400
    if not _validate_name(nombre):
        return jsonify({"error": "El nombre debe contener solo letras y tener minimo 2 caracteres"}), 400

    if not apellido:
        return jsonify({"error": "El apellido es requerido"}), 400
    if not _validate_name(apellido):
        return jsonify({"error": "El apellido debe contener solo letras y tener minimo 2 caracteres"}), 400

    if not email:
        return jsonify({"error": "El email es requerido"}), 400
    if not _validate_email(email):
        return jsonify({"error": "El email debe contener @ y . (ej: usuario@dominio.com)"}), 400

    if not password:
        return jsonify({"error": "La contrasena es requerida"}), 400
    if not _validate_password(password):
        return jsonify({"error": "La contrasena debe tener minimo 6 caracteres"}), 400

    user = db.create_user(nombre, apellido, email, password)
    if user is None:
        return jsonify({"error": "El email ya esta registrado"}), 409

    return jsonify({"message": "Usuario registrado exitosamente", "user": user}), 201


@users_bp.route("/users/login", methods=["POST"])
def login():
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "El cuerpo de la solicitud debe ser JSON"}), 400

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email y contrasena son requeridos"}), 400

    if not db.verify_password(email, password):
        return jsonify({"error": "Email o contrasena incorrectos"}), 401

    user = db.get_user_by_email(email)
    token = db.create_session(user["id"])
    return jsonify({"message": "Sesion iniciada exitosamente", "token": token, "user": user}), 200


@users_bp.route("/users/logout", methods=["POST"])
def logout():
    token = get_request_token()
    if token is not None:
        db.delete_session(token)

    return jsonify({"message": "Sesion cerrada exitosamente"}), 200


@users_bp.route("/users/me", methods=["GET"])
def get_me():
    user, error = get_authenticated_user()
    if error:
        return error

    return jsonify({"user": user}), 200


@users_bp.route("/users", methods=["GET"])
def list_users():
    current_user, error = get_authenticated_user(require_admin=True)
    if error:
        return error

    return jsonify({"users": db.list_users(), "current_user": current_user}), 200


@users_bp.route("/users/<int:user_id>/admin", methods=["PATCH"])
def update_user_admin(user_id: int):
    _, error = get_authenticated_user(require_admin=True)
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None or "is_admin" not in body:
        return jsonify({"error": "Debes enviar el campo is_admin en el cuerpo JSON"}), 400

    is_admin = body.get("is_admin")
    if not isinstance(is_admin, bool):
        return jsonify({"error": "El campo is_admin debe ser booleano"}), 400

    try:
        user = db.set_admin_status(user_id, is_admin)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if user is None:
        return jsonify({"error": "Usuario no encontrado"}), 404

    action = "otorgado" if is_admin else "quitado"
    return jsonify({"message": f"Permiso de administrador {action} correctamente", "user": user}), 200
