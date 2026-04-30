from flask import Blueprint, jsonify, request

from auth import get_authenticated_user
from model.genres_db import GenresDB

genres_bp = Blueprint("genres", __name__)
db = GenresDB()


def require_admin():
    _, error = get_authenticated_user(require_admin=True)
    return error


@genres_bp.route("/genres", methods=["GET"])
def get_genres():
    genres = db.get_all_genres()
    return jsonify(genres), 200


@genres_bp.route("/genres", methods=["POST"])
def create_genre():
    error = require_admin()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "El cuerpo de la solicitud debe ser JSON"}), 400

    name = (body.get("name") or "").strip()
    icon = (body.get("icon") or "").strip()

    if not name:
        return jsonify({"error": "El nombre es requerido"}), 400

    genre = db.create_genre(name, icon)
    if genre is None:
        return jsonify({"error": "El género ya existe"}), 409

    return (
        jsonify(
            {
                "message": "Género creado exitosamente",
                "genre": genre,
            }
        ),
        201,
    )


@genres_bp.route("/genres/<int:genre_id>", methods=["GET"])
def get_genre(genre_id: int):
    genre = db.get_genre(genre_id)
    if genre is None:
        return jsonify({"error": "Género no encontrado"}), 404

    return jsonify(genre), 200


@genres_bp.route("/genres/<int:genre_id>", methods=["DELETE"])
def delete_genre(genre_id: int):
    error = require_admin()
    if error:
        return error

    success = db.delete_genre(genre_id)
    if not success:
        return jsonify({"error": "Género no encontrado"}), 404

    return jsonify({"message": "Género eliminado exitosamente"}), 200
