from flask import Flask, render_template
import logging
import os
from db.schema import init_db
from db import check_db_file
from routes.deck_routes import deck_bp
from routes.word_routes import word_bp
from routes.fsrs_routes import fsrs_bp

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

# 检查数据库文件
check_db_file()

# Create Flask app
app = Flask(__name__)

# 启用详细日志
app.logger.setLevel(logging.INFO)

# 检查临时目录
temp_dir = os.path.join(os.getcwd(), 'temp')
if not os.path.exists(temp_dir):
    os.makedirs(temp_dir)
    logging.info(f"Created temporary directory: {temp_dir}")
else:
    logging.info(f"Temporary directory already exists: {temp_dir}")

# Register blueprints
app.register_blueprint(deck_bp)
app.register_blueprint(word_bp)
app.register_blueprint(fsrs_bp)

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
