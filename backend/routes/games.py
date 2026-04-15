# routes/games.py
from flask import Blueprint, jsonify, request
from sqlite3 import IntegrityError
from model.games_db import GamesDB

games_bp = Blueprint("games", __name__)
db = GamesDB()


@games_bp.route("/games", methods=["GET"])
def get_games():
    query = request.args.get("q", "").strip()  # /api/games?q=portal
    genre = request.args.get("genre")  # /api/games?genre=Action
    tag   = request.args.get("tag")    # /api/games?tag=Multiplayer

    if query:
        games = db.search(query)
    elif genre:
        games = db.get_by_genre(genre)
    elif tag:
        games = db.get_by_tag(tag)
    else:
        games = db.get_all_games()

    return jsonify(games)


# Esta ruta tiene que ir ANTES de /games/<app_id>
# porque Flask matchea en orden y "search" podria interpretarse como un app_id
@games_bp.route("/games/search", methods=["GET"])
def search_games():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "query param 'q' is required"}), 400

    return jsonify(db.search(query))


@games_bp.route("/games/<int:app_id>", methods=["GET"])
def get_game(app_id: int):
    game = db.get_game(app_id)
    if game is None:
        return jsonify({"error": "game not found"}), 404
    return jsonify(game)


@games_bp.route("/games", methods=["POST"])
def add_game():
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
        genre = body.get("genre")
        tags = body.get("tags")

        # Accept either an array or a comma-separated string from the client.
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        if tags is not None and not isinstance(tags, list):
            return jsonify({"error": "tags must be an array or a comma-separated string"}), 400

        db.add_game(
            app_id=app_id,
            name=name,
            release_date=release_date,
            genre=genre,
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
    body = request.get_json()
    if not body:
        return jsonify({"error": "missing JSON body"}), 400

    # Separa tags del resto porque update_game los maneja distinto
    tags   = body.pop("tags", None)
    fields = body

    found = db.update_game(app_id, tags=tags, **fields)
    if not found:
        return jsonify({"error": "game not found"}), 404

    return jsonify({"message": "game updated"})


@games_bp.route("/games/<int:app_id>", methods=["DELETE"])
def delete_game(app_id: int):
    found = db.delete_game(app_id)
    if not found:
        return jsonify({"error": "game not found"}), 404

    return jsonify({"message": "game deleted"})