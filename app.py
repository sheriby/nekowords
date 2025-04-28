from flask import Flask, render_template
from db.schema import init_db
from routes.deck_routes import deck_bp
from routes.word_routes import word_bp
from routes.srs_routes import srs_bp

# Create Flask app
app = Flask(__name__)

# Register blueprints
app.register_blueprint(deck_bp)
app.register_blueprint(word_bp)
app.register_blueprint(srs_bp)

# Initialize database
init_db()

@app.route('/')
def index():
    """
    Render the index page.

    Returns:
        flask.Response: The rendered index page.
    """
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
