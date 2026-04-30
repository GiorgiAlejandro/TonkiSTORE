from flask import jsonify, request
from model.users_db import UsersDB

db = UsersDB()


def get_request_token() -> str | None:
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:].strip()
    return token or None


def get_authenticated_user(require_admin: bool = False):
    token = get_request_token()
    if token is None:
        return None, (jsonify({"error": "Debes iniciar sesion para continuar."}), 401)

    user = db.get_user_by_session(token)
    if user is None:
        return None, (jsonify({"error": "La sesion no es valida o ya expiro."}), 401)

    if require_admin and not user.get("is_admin"):
        return None, (jsonify({"error": "No tienes permisos para realizar esta accion."}), 403)

    return user, None
