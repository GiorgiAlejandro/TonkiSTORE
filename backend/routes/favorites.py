from flask import Blueprint, jsonify, request
from auth import get_authenticated_user
from model.favorites_db import FavoritesDB
from model.games_db import GamesDB

favorites_bp = Blueprint("favorites", __name__)
db = FavoritesDB()
games_db = GamesDB()


@favorites_bp.route("/favorites", methods=["GET"])
def get_user_favorites():
    """
    Obtiene todos los productos favoritos del usuario autenticado.
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        favorites = db.get_user_favorites(user["id"])
        # Enriquece con información adicional de juegos
        result = []
        for fav in favorites:
            game = games_db.get_game(fav["app_id"])
            if game:
                fav["game_details"] = game
            result.append(fav)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "error": "Error retrieving favorites",
            "details": str(e)
        }), 500


@favorites_bp.route("/favorites/<int:app_id>", methods=["POST"])
def add_favorite(app_id: int):
    """
    Marca un producto como favorito para el usuario autenticado.
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    # Verifica que el juego exista
    game = games_db.get_game(app_id)
    if game is None:
        return jsonify({"error": "game not found"}), 404

    try:
        success = db.add_favorite(user["id"], app_id)
        
        if success:
            return jsonify({
                "message": "Product added to favorites",
                "app_id": app_id,
                "user_id": user["id"]
            }), 201
        else:
            return jsonify({
                "message": "Product is already in favorites",
                "app_id": app_id
            }), 409  # Conflict
    except Exception as e:
        return jsonify({
            "error": "Error adding favorite",
            "details": str(e)
        }), 500


@favorites_bp.route("/favorites/<int:app_id>", methods=["DELETE"])
def remove_favorite(app_id: int):
    """
    Elimina un producto de los favoritos del usuario autenticado.
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        success = db.remove_favorite(user["id"], app_id)
        
        if success:
            return jsonify({
                "message": "Product removed from favorites",
                "app_id": app_id,
                "user_id": user["id"]
            }), 200
        else:
            return jsonify({
                "error": "Product not found in favorites",
                "app_id": app_id
            }), 404
    except Exception as e:
        return jsonify({
            "error": "Error removing favorite",
            "details": str(e)
        }), 500


@favorites_bp.route("/favorites/<int:app_id>/check", methods=["GET"])
def check_is_favorite(app_id: int):
    """
    Verifica si un producto es favorito del usuario autenticado.
    Requiere autenticación.
    Retorna {is_favorite: true/false}
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        is_fav = db.is_favorite(user["id"], app_id)
        return jsonify({
            "app_id": app_id,
            "is_favorite": is_fav
        }), 200
    except Exception as e:
        return jsonify({
            "error": "Error checking favorite status",
            "details": str(e)
        }), 500
