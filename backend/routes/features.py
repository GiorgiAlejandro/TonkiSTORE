from flask import Blueprint, jsonify, request

from auth import get_authenticated_user
from model.features_db import FeaturesDB

features_bp = Blueprint("features", __name__)
db = FeaturesDB()


def require_admin():
    _, error = get_authenticated_user(require_admin=True)
    return error


@features_bp.route("/features", methods=["GET"])
def get_features():
    features = db.get_all_features()
    return jsonify(features), 200


@features_bp.route("/features", methods=["POST"])
def create_feature():
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
    if not icon:
        return jsonify({"error": "El icono es requerido"}), 400

    feature = db.create_feature(name, icon)
    if feature is None:
        return jsonify({"error": "La caracteristica ya existe"}), 409

    return (
        jsonify(
            {
                "message": "Caracteristica creada exitosamente",
                "feature": feature,
            }
        ),
        201,
    )


@features_bp.route("/features/<int:feature_id>", methods=["GET"])
def get_feature(feature_id: int):
    feature = db.get_feature(feature_id)
    if feature is None:
        return jsonify({"error": "Caracteristica no encontrada"}), 404

    return jsonify(feature), 200


@features_bp.route("/features/<int:feature_id>", methods=["PUT"])
def update_feature(feature_id: int):
    error = require_admin()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "El cuerpo de la solicitud debe ser JSON"}), 400

    name = body.get("name")
    icon = body.get("icon")

    if name is not None:
        name = str(name).strip()
    if icon is not None:
        icon = str(icon).strip()

    if not name and not icon:
        return jsonify({"error": "Al menos un campo es requerido"}), 400

    success = db.update_feature(feature_id, name, icon)
    if not success:
        return jsonify({"error": "No se pudo actualizar o la caracteristica no existe"}), 404

    feature = db.get_feature(feature_id)
    return (
        jsonify(
            {
                "message": "Caracteristica actualizada exitosamente",
                "feature": feature,
            }
        ),
        200,
    )


@features_bp.route("/features/<int:feature_id>", methods=["DELETE"])
def delete_feature(feature_id: int):
    error = require_admin()
    if error:
        return error

    success = db.delete_feature(feature_id)
    if not success:
        return jsonify({"error": "Caracteristica no encontrada"}), 404

    return jsonify({"message": "Caracteristica eliminada exitosamente"}), 200


@features_bp.route("/games/<int:app_id>/features", methods=["GET"])
def get_game_features(app_id: int):
    features = db.get_features_for_game(app_id)
    return jsonify(features), 200


@features_bp.route("/games/<int:app_id>/features", methods=["POST"])
def set_game_features(app_id: int):
    error = require_admin()
    if error:
        return error

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "El cuerpo de la solicitud debe ser JSON"}), 400

    feature_ids = body.get("feature_ids", [])
    if not isinstance(feature_ids, list):
        return jsonify({"error": "feature_ids debe ser una lista"}), 400

    try:
        normalized_feature_ids = list(dict.fromkeys(int(feature_id) for feature_id in feature_ids))
    except (TypeError, ValueError):
        return jsonify({"error": "feature_ids debe contener solo numeros enteros"}), 400

    success = db.set_features_for_game(app_id, normalized_feature_ids)
    if not success:
        return jsonify({"error": "No se pudieron asignar las caracteristicas"}), 400

    features = db.get_features_for_game(app_id)
    return (
        jsonify(
            {
                "message": "Caracteristicas asignadas exitosamente",
                "features": features,
            }
        ),
        200,
    )
