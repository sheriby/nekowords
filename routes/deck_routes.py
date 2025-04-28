from flask import Blueprint, jsonify, request
import os
import tempfile
from models.deck import get_decks, add_deck, delete_deck
from models.word import add_words_to_deck
from utils.file_utils import load_words_from_file

# Create a Blueprint for deck routes
deck_bp = Blueprint('deck_bp', __name__)

@deck_bp.route('/get_decks', methods=['GET'])
def get_decks_route():
    """
    Get all decks.
    
    Returns:
        flask.Response: A JSON response containing deck information.
    """
    decks = get_decks()
    return jsonify(decks)

@deck_bp.route('/import_decks', methods=['POST'])
def import_decks():
    """
    Import decks from files.
    
    Returns:
        flask.Response: A JSON response containing import results.
    """
    if 'files' not in request.files:
        return jsonify({'error': '没有选择文件'})
    
    files = request.files.getlist('files')
    if not files or all(file.filename == '' for file in files):
        return jsonify({'error': '没有选择文件'})
    
    success_count = 0
    total_words = 0
    
    for file in files:
        # 获取词单名称（使用文件名，去掉扩展名）
        deck_name = os.path.splitext(file.filename)[0]
        
        # 保存上传的文件到临时目录
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        file.save(file_path)
        
        try:
            # 读取单词
            words = load_words_from_file(file_path)
            
            if words:
                # 添加词单
                deck_id = add_deck(deck_name)
                if deck_id:
                    # 添加单词到词单
                    if add_words_to_deck(deck_id, words):
                        success_count += 1
                        total_words += len(words)
        finally:
            # 清理临时文件
            os.remove(file_path)
            os.rmdir(temp_dir)
    
    if success_count == 0:
        return jsonify({'error': '所有词单导入失败'})
    
    return jsonify({
        'success_count': success_count,
        'total_words': total_words
    })

@deck_bp.route('/delete_deck', methods=['POST'])
def delete_deck_route():
    """
    Delete a deck.
    
    Returns:
        flask.Response: A JSON response indicating success or failure.
    """
    deck_id = request.json.get('deck_id')
    if not deck_id:
        return jsonify({'error': '缺少词单ID'})
    
    if delete_deck(deck_id):
        return jsonify({'success': True})
    else:
        return jsonify({'error': '删除词单失败'})
