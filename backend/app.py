# app.py
from flask import Flask
from flask_cors import CORS
from routes.games import games_bp

def create_app() -> Flask:
    app = Flask(__name__)
    
    # Permite requests desde cualquier origen (Live Server corre en otro puerto)
    CORS(app)
    
    # Registra el blueprint con prefijo /api
    app.register_blueprint(games_bp, url_prefix="/api")
    
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)