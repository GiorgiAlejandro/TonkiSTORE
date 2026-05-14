from flask import Blueprint, jsonify, request
from auth import get_authenticated_user
from model.reservations_db import ReservationsDB
from model.games_db import GamesDB

reservations_bp = Blueprint("reservations", __name__)
db = ReservationsDB()
games_db = GamesDB()


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
