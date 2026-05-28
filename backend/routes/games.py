from sqlite3 import IntegrityError
import sqlite3
from flask import Blueprint, jsonify, request
from auth import get_authenticated_user
from model.games_db import GamesDB
from model.reservations_db import ReservationsDB

games_bp = Blueprint("games", __name__)
db = GamesDB()
reservations_db = ReservationsDB()


def _get_popular_games(limit: int = 6) -> list[dict]:
    limit = max(1, int(limit))

    with sqlite3.connect(db.db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            """
            WITH purchase_counts AS (
                SELECT app_id, COUNT(*) AS purchase_count
                FROM purchases
                WHERE status = 'completed'
                GROUP BY app_id
            ),
            reservation_counts AS (
                SELECT app_id, COUNT(*) AS reservation_count
                FROM reservations
                WHERE status = 'confirmed'
                GROUP BY app_id
            )
            SELECT g.app_id,
                   g.name,
                   g.release_date,
                   g.genre_id,
                   g.price_usd,
                   g.discount_pct,
                   g.genre,
                   COALESCE(pc.purchase_count, 0) AS purchase_count,
                   COALESCE(rc.reservation_count, 0) AS reservation_count,
                   COALESCE(pc.purchase_count, 0) + COALESCE(rc.reservation_count, 0) AS popularity_score
            FROM games g
            LEFT JOIN purchase_counts pc ON pc.app_id = g.app_id
            LEFT JOIN reservation_counts rc ON rc.app_id = g.app_id
            WHERE COALESCE(pc.purchase_count, 0) + COALESCE(rc.reservation_count, 0) > 0
            ORDER BY popularity_score DESC, g.name COLLATE NOCASE ASC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()

    popular_games: list[dict] = []
    for row in rows:
        game = db.get_game(int(row["app_id"]))
        if not game:
            continue
        game["purchase_count"] = int(row["purchase_count"] or 0)
        game["reservation_count"] = int(row["reservation_count"] or 0)
        game["popularity_score"] = int(row["popularity_score"] or 0)
        popular_games.append(game)

    return popular_games


@games_bp.route("/games", methods=["GET"])
def get_games():
    query = request.args.get("q", "").strip()
    genre = request.args.get("genre")
    genre_id = request.args.get("genre_id")
    tag = request.args.get("tag")

    if query:
        games = db.search(query)
    elif genre_id:
        try:
            gid = int(genre_id)
            games = db.get_by_genre(gid)
        except Exception:
            games = []
    elif genre:
        games = db.get_by_genre(genre)
    elif tag:
        games = db.get_by_tag(tag)
    else:
        games = db.get_all_games()

    return jsonify(games)


@games_bp.route("/games/search", methods=["GET"])
def search_games():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "query param 'q' is required"}), 400
    return jsonify(db.search(query))


@games_bp.route("/tags", methods=["GET"])
def get_all_tags():
    """Obtiene todos los tags disponibles."""
    tags = db.get_all_tags()
    return jsonify(tags)


@games_bp.route("/games/<int:app_id>", methods=["GET"])
def get_game(app_id: int):
    game = db.get_game(app_id)
    if game is None:
        return jsonify({"error": "game not found"}), 404
    return jsonify(game)


@games_bp.route("/games/<int:app_id>/availability", methods=["GET"])
def get_game_availability(app_id: int):
    """
    Obtiene la disponibilidad (fechas ocupadas) de un producto.
    Incluye información del producto y lista de fechas reservadas.
    """
    try:
        game = db.get_game_with_availability(app_id)
        if game is None:
            return jsonify({"error": "game not found"}), 404
        return jsonify(game)
    except Exception as e:
        return jsonify({
            "error": "No se puede obtener la información de disponibilidad en este momento",
            "details": str(e)
        }), 500


@games_bp.route("/games/search/by-date", methods=["GET"])
def search_games_by_date():
    """
    Busca productos disponibles en un rango de fechas.
    Parámetros: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), q (búsqueda opcional)
    """
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()
    query = request.args.get("q", "").strip()

    if not start_date or not end_date:
        return jsonify({
            "error": "Missing parameters: start_date and end_date are required (YYYY-MM-DD format)"
        }), 400

    try:
        # Valida formato de fechas
        from datetime import datetime
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")
        
        if start_date > end_date:
            return jsonify({"error": "start_date must be before end_date"}), 400

        # Obtiene productos disponibles en el rango
        games = reservations_db.get_available_games(start_date, end_date)
        
        # Si hay búsqueda adicional, filtra por query
        if query:
            games = [g for g in games if query.lower() in g.get("name", "").lower()]

        return jsonify(games)
    except ValueError as e:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        return jsonify({
            "error": "Error searching games by date",
            "details": str(e)
        }), 500


@games_bp.route("/games/popular", methods=["GET"])
def get_popular_games():
    limit = request.args.get("limit", "6").strip()
    try:
        popular = _get_popular_games(int(limit))
        return jsonify(popular)
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400
    except Exception as e:
        return jsonify({"error": "Error retrieving popular games", "details": str(e)}), 500


@games_bp.route("/games", methods=["POST"])
def add_game():
    _, error = get_authenticated_user(require_admin=True)
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "missing JSON body"}), 400

    required = {"app_id", "name", "price_usd", "discount_pct"}
    missing = required - body.keys()
    if missing:
        return jsonify({"error": f"missing fields: {missing}"}), 400

    try:
        app_id = int(body["app_id"])
        name = str(body["name"]).strip()
        if not name:
            return jsonify({"error": "name cannot be empty"}), 400

        price_usd = float(body["price_usd"])
        discount_pct = int(body["discount_pct"])
        release_date = body.get("release_date")

        # Acepta genre_id (singular) O genre_ids (array); el primero tiene prioridad
        genre_id = body.get("genre_id")
        genre_ids = body.get("genre_ids")
        if genre_id is None and genre_ids and isinstance(genre_ids, list):
            genre_id = genre_ids[0] if genre_ids else None

        tags = body.get("tags")
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        if tags is not None and not isinstance(tags, list):
            return jsonify({"error": "tags must be an array or a comma-separated string"}), 400

        db.add_game(
            app_id=app_id,
            name=name,
            release_date=release_date,
            genre_id=int(genre_id) if genre_id is not None else None,
            price_usd=price_usd,
            discount_pct=discount_pct,
            tags=tags,
        )
    except (TypeError, ValueError):
        return jsonify({"error": "invalid field types in JSON body"}), 400
    except IntegrityError:
        return jsonify({"error": "app_id already exists"}), 409

    game = db.get_game(app_id)
    return jsonify({"message": "game added", "game": game}), 201


@games_bp.route("/games/<int:app_id>", methods=["PUT"])
def update_game(app_id: int):
    _, error = get_authenticated_user(require_admin=True)
    if error:
        return error

    body = request.get_json()
    if not body:
        return jsonify({"error": "missing JSON body"}), 400

    # Normalizar genre_ids → genre_id
    genre_ids = body.pop("genre_ids", None)
    if "genre_id" not in body and genre_ids and isinstance(genre_ids, list):
        body["genre_id"] = genre_ids[0] if genre_ids else None

    tags = body.pop("tags", None)
    fields = body

    found = db.update_game(app_id, tags=tags, **fields)
    if not found:
        return jsonify({"error": "game not found"}), 404

    return jsonify({"message": "game updated"})


@games_bp.route("/games/<int:app_id>", methods=["DELETE"])
def delete_game(app_id: int):
    _, error = get_authenticated_user(require_admin=True)
    if error:
        return error

    found = db.delete_game(app_id)
    if not found:
        return jsonify({"error": "game not found"}), 404

    return jsonify({"message": "game deleted"})