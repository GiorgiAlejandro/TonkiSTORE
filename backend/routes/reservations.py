from datetime import date, datetime, timedelta
import sqlite3

from flask import Blueprint, jsonify, request
from auth import get_authenticated_user
from model.reservations_db import ReservationsDB
from model.games_db import GamesDB
from model.purchases_db import PurchasesDB

reservations_bp = Blueprint("reservations", __name__)
db = ReservationsDB()
games_db = GamesDB()
purchases_db = PurchasesDB()
STEAM_IMAGE_URL = "https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/header.jpg"


def _extract_int_field(body: dict, *field_names: str) -> int | None:
    for field_name in field_names:
        if field_name in body:
            try:
                return int(body[field_name])
            except (TypeError, ValueError):
                return None
    return None


@reservations_bp.route("/reservations", methods=["POST"])
def create_reservation():
    """
    Crea una nueva reserva para un producto.
    Body JSON requerido: {app_id, start_date, end_date}
    Las fechas deben estar en formato ISO (YYYY-MM-DD).
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "missing JSON body"}), 400

    required = {"app_id", "start_date", "end_date"}
    missing = required - body.keys()
    if missing:
        return jsonify({"error": f"missing fields: {missing}"}), 400

    try:
        app_id = int(body["app_id"])
        start_date = str(body["start_date"]).strip()
        end_date = str(body["end_date"]).strip()

        # Valida formato de fechas
        from datetime import datetime
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")

        if start_date > end_date:
            return jsonify({
                "error": "start_date must be before or equal to end_date"
            }), 400

        # Verifica que el juego exista
        game = games_db.get_game(app_id)
        if game is None:
            return jsonify({"error": "game not found"}), 404

        release_date_raw = str(game.get("release_date") or "").strip()
        if release_date_raw and release_date_raw.lower() != "fecha no disponible":
            try:
                release_date = datetime.strptime(release_date_raw, "%Y-%m-%d").date()
                if datetime.strptime(start_date, "%Y-%m-%d").date() < release_date:
                    return jsonify({
                        "error": "start_date cannot be earlier than the release date",
                        "release_date": release_date.isoformat(),
                    }), 400
            except ValueError:
                pass

        # Crea la reserva
        success = db.add_reservation(app_id, user["id"], start_date, end_date)

        if success:
            return jsonify({
                "message": "Reservation created successfully",
                "app_id": app_id,
                "start_date": start_date,
                "end_date": end_date,
                "user_id": user["id"],
                "status": "confirmed"
            }), 201
        else:
            return jsonify({
                "error": "Cannot create reservation: dates are not available",
                "app_id": app_id,
                "start_date": start_date,
                "end_date": end_date
            }), 409  # Conflict

    except ValueError as e:
        return jsonify({
            "error": "Invalid input format. Dates must be in YYYY-MM-DD format",
            "details": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "error": "Error creating reservation",
            "details": str(e)
        }), 500


@reservations_bp.route("/rentals", methods=["POST"])
def create_rental():
    """
    Registra un alquiler a partir de un usuario, un juego y un paquete de tiempo.
    Body JSON requerido: {user_id, game_id, package_days}
    La fecha de inicio se toma como la fecha actual del servidor y la fecha de fin
    se calcula sumando el paquete solicitado.
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "missing JSON body"}), 400

    user_id = _extract_int_field(body, "user_id")
    game_id = _extract_int_field(body, "game_id", "app_id")
    package_days = _extract_int_field(body, "package_days", "days")

    if user_id is None or game_id is None or package_days is None:
        return jsonify({"error": "missing or invalid fields: user_id, game_id and package_days are required"}), 400

    if user_id != user["id"]:
        return jsonify({"error": "The user_id does not match the authenticated user"}), 403

    if package_days < 1:
        return jsonify({"error": "package_days must be greater than 0"}), 400

    if package_days > 30:
        return jsonify({"error": "package_days cannot exceed 30 days"}), 400

    try:
        game = games_db.get_game(game_id)
        if game is None:
            return jsonify({"error": "game not found"}), 404

        today = date.today()
        start_date = today
        end_date = today + timedelta(days=package_days - 1)

        release_date_raw = str(game.get("release_date") or "").strip()
        if release_date_raw and release_date_raw.lower() != "fecha no disponible":
            try:
                release_date = datetime.strptime(release_date_raw, "%Y-%m-%d").date()
                if start_date < release_date:
                    return jsonify({
                        "error": "start_date cannot be earlier than the release date",
                        "release_date": release_date.isoformat(),
                    }), 400
            except ValueError:
                pass

        success = db.add_reservation(game_id, user_id, start_date.isoformat(), end_date.isoformat())

        if not success:
            return jsonify({
                "error": "Cannot create rental: the requested dates are not available",
                "game_id": game_id,
                "user_id": user_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            }), 409

        return jsonify({
            "message": "Rental created successfully",
            "game_id": game_id,
            "user_id": user_id,
            "package_days": package_days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "confirmed",
            "library_access": True,
        }), 201

    except Exception as e:
        return jsonify({
            "error": "Error creating rental",
            "details": str(e)
        }), 500


@reservations_bp.route("/purchases", methods=["POST"])
def create_purchase():
    """
    Registra una compra permanente de un juego.
    Body JSON requerido: {user_id, game_id}
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "missing JSON body"}), 400

    user_id = _extract_int_field(body, "user_id")
    game_id = _extract_int_field(body, "game_id", "app_id")

    if user_id is None or game_id is None:
        return jsonify({"error": "missing or invalid fields: user_id and game_id are required"}), 400

    if user_id != user["id"]:
        return jsonify({"error": "The user_id does not match the authenticated user"}), 403

    try:
        game = games_db.get_game(game_id)
        if game is None:
            return jsonify({"error": "game not found"}), 404

        if purchases_db.has_purchase(user_id, game_id):
            return jsonify({
                "error": "The game is already purchased",
                "game_id": game_id,
                "user_id": user_id,
            }), 409

        purchase_price = float(game.get("price_usd") or 0)
        success = purchases_db.add_purchase(game_id, user_id, purchase_price)

        if not success:
            return jsonify({
                "error": "Cannot create purchase",
                "game_id": game_id,
                "user_id": user_id,
            }), 409

        return jsonify({
            "message": "Purchase created successfully",
            "game_id": game_id,
            "user_id": user_id,
            "purchase_price": purchase_price,
            "status": "completed",
            "library_access": True,
            "ownership": "permanent",
        }), 201

    except Exception as e:
        return jsonify({
            "error": "Error creating purchase",
            "details": str(e)
        }), 500


@reservations_bp.route("/cart/checkout", methods=["POST"])
def checkout_cart():
    """
    Procesa un carrito con compras y alquileres en una sola operación.
    Body JSON requerido: {user_id, items: [...]}.
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "missing JSON body"}), 400

    user_id = _extract_int_field(body, "user_id")
    items = body.get("items") if isinstance(body, dict) else None

    if user_id is None or not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "missing or invalid fields: user_id and items are required"}), 400

    if user_id != user["id"]:
        return jsonify({"error": "The user_id does not match the authenticated user"}), 403

    class CheckoutError(Exception):
        def __init__(self, message: str, status_code: int = 400, payload: dict | None = None) -> None:
            super().__init__(message)
            self.message = message
            self.status_code = status_code
            self.payload = payload or {}

    def _parse_date(value: object) -> date | None:
        text = str(value or "").strip()
        if not text:
            return None
        try:
            return datetime.strptime(text, "%Y-%m-%d").date()
        except ValueError:
            return None

    try:
        with sqlite3.connect(db.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            processed_purchases: list[dict] = []
            processed_rentals: list[dict] = []
            total = 0.0

            for raw_item in items:
                if not isinstance(raw_item, dict):
                    raise CheckoutError("Invalid item format", 400)

                item_type = str(raw_item.get("type") or "purchase").strip().lower()
                game_id = _extract_int_field(raw_item, "game_id", "app_id", "id")
                if game_id is None:
                    raise CheckoutError("Each item must include a valid game_id", 400)

                cursor.execute("SELECT * FROM games WHERE app_id = ?", (game_id,))
                game_row = cursor.fetchone()
                if game_row is None:
                    raise CheckoutError(f"game not found: {game_id}", 404)

                game = dict(game_row)
                release_date_raw = str(game.get("release_date") or "").strip()
                release_date = _parse_date(release_date_raw)

                if item_type == "purchase":
                    cursor.execute(
                        "SELECT 1 FROM purchases WHERE user_id = ? AND app_id = ? LIMIT 1",
                        (user_id, game_id),
                    )
                    if cursor.fetchone() is not None:
                        raise CheckoutError("The game is already purchased", 409, {"game_id": game_id})

                    purchase_price = float(raw_item.get("total") or raw_item.get("price") or game.get("price_usd") or 0)
                    cursor.execute(
                        """
                        INSERT INTO purchases (app_id, user_id, purchase_price, status)
                        VALUES (?, ?, ?, 'completed')
                        """,
                        (game_id, user_id, purchase_price),
                    )
                    processed_purchases.append({
                        "game_id": game_id,
                        "title": game.get("name"),
                        "purchase_price": purchase_price,
                        "status": "completed",
                    })
                    total += purchase_price
                    continue

                if item_type == "rental":
                    start_date = _parse_date(raw_item.get("startDate") or raw_item.get("start_date"))
                    end_date = _parse_date(raw_item.get("endDate") or raw_item.get("end_date"))

                    if start_date is None or end_date is None:
                        raise CheckoutError("Each rental item requires valid startDate and endDate", 400)

                    if start_date > end_date:
                        raise CheckoutError("rental start_date must be before or equal to end_date", 400)

                    today = date.today()
                    if start_date < today:
                        raise CheckoutError("rental start_date cannot be earlier than today", 400)

                    if release_date and start_date < release_date:
                        raise CheckoutError("rental start_date cannot be earlier than the release date", 400, {"release_date": release_date.isoformat()})

                    cursor.execute(
                        """
                        SELECT 1 FROM reservations
                        WHERE app_id = ? AND status = 'confirmed'
                        AND (
                            (start_date <= ? AND end_date >= ?)
                            OR (start_date <= ? AND end_date >= ?)
                            OR (start_date >= ? AND end_date <= ?)
                        )
                        LIMIT 1
                        """,
                        (
                            game_id,
                            end_date.isoformat(),
                            start_date.isoformat(),
                            end_date.isoformat(),
                            start_date.isoformat(),
                            end_date.isoformat(),
                            start_date.isoformat(),
                        ),
                    )
                    if cursor.fetchone() is not None:
                        raise CheckoutError("Cannot create rental: dates are not available", 409, {"game_id": game_id})

                    cursor.execute(
                        """
                        INSERT INTO reservations (app_id, user_id, start_date, end_date, status)
                        VALUES (?, ?, ?, ?, 'confirmed')
                        """,
                        (game_id, user_id, start_date.isoformat(), end_date.isoformat()),
                    )
                    days = _extract_int_field(raw_item, "days") or 0
                    processed_rentals.append({
                        "game_id": game_id,
                        "title": game.get("name"),
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "days": days,
                        "status": "confirmed",
                    })
                    total += float(raw_item.get("total") or 0)
                    continue

                raise CheckoutError(f"Unsupported item type: {item_type}", 400)

            return jsonify({
                "message": "Cart processed successfully",
                "user_id": user_id,
                "count": len(processed_purchases) + len(processed_rentals),
                "total": total,
                "purchases": processed_purchases,
                "rentals": processed_rentals,
            }), 201

    except CheckoutError as exc:
        return jsonify({"error": exc.message, **exc.payload}), exc.status_code
    except Exception as e:
        return jsonify({
            "error": "Error processing cart",
            "details": str(e),
        }), 500


@reservations_bp.route("/reservations", methods=["GET"])
def get_user_reservations():
    """
    Obtiene todas las reservas del usuario autenticado.
    Requiere autenticación.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        reservations = db.get_user_reservations(user["id"])
        return jsonify(reservations), 200
    except Exception as e:
        return jsonify({
            "error": "Error retrieving reservations",
            "details": str(e)
        }), 500


@reservations_bp.route("/reservations/<int:reservation_id>", methods=["GET"])
def get_reservation(reservation_id: int):
    """
    Obtiene los detalles de una reserva específica.
    Requiere autenticación y que la reserva pertenezca al usuario.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        reservation = db.get_reservation_by_id(reservation_id)

        if reservation is None:
            return jsonify({"error": "reservation not found"}), 404

        # Verifica que la reserva pertenezca al usuario
        if reservation["user_id"] != user["id"]:
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify(reservation), 200

    except Exception as e:
        return jsonify({
            "error": "Error retrieving reservation",
            "details": str(e)
        }), 500


@reservations_bp.route("/reservations/<int:reservation_id>", methods=["DELETE"])
def cancel_reservation(reservation_id: int):
    """
    Cancela una reserva.
    Requiere autenticación y que la reserva pertenezca al usuario.
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        reservation = db.get_reservation_by_id(reservation_id)

        if reservation is None:
            return jsonify({"error": "reservation not found"}), 404

        # Verifica que la reserva pertenezca al usuario
        if reservation["user_id"] != user["id"]:
            return jsonify({"error": "Unauthorized"}), 403

        success = db.cancel_reservation(reservation_id)

        if success:
            return jsonify({
                "message": "Reservation cancelled successfully",
                "reservation_id": reservation_id,
                "status": "cancelled"
            }), 200
        else:
            return jsonify({"error": "Could not cancel reservation"}), 500

    except Exception as e:
        return jsonify({
            "error": "Error cancelling reservation",
            "details": str(e)
        }), 500


@reservations_bp.route("/games/<int:app_id>/occupied-dates", methods=["GET"])
def get_occupied_dates(app_id: int):
    """
    Obtiene las fechas ocupadas (reservadas) para un producto.
    No requiere autenticación.
    """
    try:
        # Verifica que el juego exista
        game = games_db.get_game(app_id)
        if game is None:
            return jsonify({"error": "game not found"}), 404

        occupied_dates = db.get_occupied_dates(app_id)
        return jsonify({
            "app_id": app_id,
            "game_name": game.get("name"),
            "occupied_dates": occupied_dates,
            "total_reservations": len(occupied_dates)
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Error retrieving occupied dates",
            "details": str(e)
        }), 500


@reservations_bp.route("/games/<int:app_id>/check-availability", methods=["GET"])
def check_availability(app_id: int):
    """
    Verifica si un producto está disponible en un rango de fechas.
    Parámetros: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
    No requiere autenticación.
    """
    try:
        start_date = request.args.get("start_date", "").strip()
        end_date = request.args.get("end_date", "").strip()

        if not start_date or not end_date:
            return jsonify({
                "error": "Missing parameters: start_date and end_date are required"
            }), 400

        # Valida formato de fechas
        from datetime import datetime
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")

        # Verifica que el juego exista
        game = games_db.get_game(app_id)
        if game is None:
            return jsonify({"error": "game not found"}), 404

        # Verifica disponibilidad
        is_available = db.get_available_dates(app_id, start_date, end_date)

        return jsonify({
            "app_id": app_id,
            "start_date": start_date,
            "end_date": end_date,
            "is_available": is_available
        }), 200

    except ValueError:
        return jsonify({
            "error": "Invalid date format. Use YYYY-MM-DD"
        }), 400
    except Exception as e:
        return jsonify({
            "error": "Error checking availability",
            "details": str(e)
        }), 500


@reservations_bp.route("/library", methods=["GET"])
def get_user_library():
    """
    Devuelve la biblioteca del usuario autenticado separada en:
    - purchases: juegos comprados (permanentes)
    - rentals: juegos alquilados activos (end_date >= hoy)
    """
    user, error = get_authenticated_user()
    if error:
        return error

    try:
        today_iso = date.today().isoformat()

        purchases_raw = purchases_db.get_user_purchases(user["id"])
        reservations_raw = db.get_user_reservations(user["id"])

        purchases = [
            {
                "game_id": int(item.get("app_id") or 0),
                "title": item.get("name") or "Juego",
                "price": float(item.get("purchase_price") or 0),
                "purchase_date": item.get("created_at"),
                "image": STEAM_IMAGE_URL.format(app_id=int(item.get("app_id") or 0)),
                "type": "purchase",
            }
            for item in purchases_raw
            if int(item.get("app_id") or 0) > 0
        ]

        rentals = [
            {
                "game_id": int(item.get("app_id") or 0),
                "title": item.get("name") or "Juego",
                "start_date": item.get("start_date"),
                "end_date": item.get("end_date"),
                "image": STEAM_IMAGE_URL.format(app_id=int(item.get("app_id") or 0)),
                "type": "rental",
            }
            for item in reservations_raw
            if (item.get("status") == "confirmed")
            and bool(item.get("end_date"))
            and str(item.get("end_date")) >= today_iso
            and int(item.get("app_id") or 0) > 0
        ]

        return jsonify(
            {
                "user_id": user["id"],
                "purchases": purchases,
                "rentals": rentals,
                "counts": {
                    "purchases": len(purchases),
                    "rentals": len(rentals),
                    "total": len(purchases) + len(rentals),
                },
            }
        ), 200
    except Exception as e:
        return jsonify({"error": "Error retrieving library", "details": str(e)}), 500
