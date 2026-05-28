# app.py
from flask import Flask, send_file, send_from_directory, request
from flask_cors import CORS
from pathlib import Path
from routes.games import games_bp
from routes.users import users_bp
from routes.features import features_bp
from routes.genres import genres_bp
from routes.favorites import favorites_bp
from routes.reservations import reservations_bp

def create_app() -> Flask:
    app = Flask(__name__)
    
    # Permite requests desde cualquier origen (Live Server corre en otro puerto)
    CORS(app)
    
    # Registra los blueprints con prefijo /api
    app.register_blueprint(games_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(features_bp, url_prefix="/api")
    app.register_blueprint(genres_bp, url_prefix="/api")
    app.register_blueprint(favorites_bp, url_prefix="/api")
    app.register_blueprint(reservations_bp, url_prefix="/api")
    
    # ===== SIRVIENDO ARCHIVOS ESTÁTICOS DEL FRONTEND =====
    frontend_dir = Path(__file__).parent.parent / "frontend"
    
    @app.route("/")
    def serve_home():
        """Sirve index.html en la raíz"""
        return send_file(str(frontend_dir / "index.html"), mimetype="text/html")
    
    @app.route("/admin")
    def serve_admin():
        """Sirve admin.html en /admin"""
        return send_file(str(frontend_dir / "admin.html"), mimetype="text/html")
    
    
    @app.route("/<path:filename>")
    def serve_static(filename):
        """Sirve archivos estáticos (CSS, JS, HTML, etc.)"""
        file_path = frontend_dir / filename
        
        # Verificar que la ruta esté dentro del directorio frontend
        try:
            file_path.resolve().relative_to(frontend_dir.resolve())
        except ValueError:
            return {"error": "Access denied"}, 403
        
        if file_path.exists() and file_path.is_file():
            return send_file(str(file_path), mimetype=get_mimetype(filename))
        
        # Si es una ruta desconocida, servir index.html (SPA)
        return send_file(str(frontend_dir / "index.html"), mimetype="text/html")
    
    def get_mimetype(filename):
        """Retorna el MIME type basado en la extensión"""
        mimetypes = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".json": "application/json",
        }
        ext = Path(filename).suffix.lower()
        return mimetypes.get(ext, "application/octet-stream")
    
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)