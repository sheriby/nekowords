from flask import Blueprint, jsonify, request
import os
import time
import logging
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
    import logging

    try:
        if 'files' not in request.files:
            return jsonify({'error': '没有选择文件'})

        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'error': '没有选择文件'})

        success_count = 0
        total_words = 0
        failed_files = []

        for file in files:
            # 获取词单名称（使用文件名，去掉扩展名）
            deck_name = os.path.splitext(file.filename)[0]
            logging.info(f"Importing deck: {deck_name}")

            # 保存上传的文件到临时目录
            temp_dir = os.path.join(os.getcwd(), 'temp')
            file_path = os.path.join(temp_dir, f"{int(time.time())}_{file.filename}")
            file.save(file_path)
            logging.info(f"Saved file to {file_path}")

            try:
                # 读取单词
                words = load_words_from_file(file_path)

                if not words:
                    logging.warning(f"No words found in file: {file.filename}")
                    failed_files.append(f"{file.filename} (没有找到单词)")
                    continue

                logging.info(f"Found {len(words)} words in file: {file.filename}")

                # 添加词单
                deck_id = add_deck(deck_name)
                if not deck_id:
                    logging.error(f"Failed to create deck: {deck_name}")
                    failed_files.append(f"{file.filename} (创建词单失败)")
                    continue

                logging.info(f"Created deck: {deck_name}, ID: {deck_id}")

                # 添加单词到词单
                if add_words_to_deck(deck_id, words):
                    success_count += 1
                    total_words += len(words)
                    logging.info(f"Successfully added {len(words)} words to deck: {deck_name}")
                else:
                    logging.error(f"Failed to add words to deck: {deck_name}")
                    failed_files.append(f"{file.filename} (添加单词失败)")
            except Exception as e:
                logging.error(f"Error importing deck {deck_name}: {str(e)}")
                failed_files.append(f"{file.filename} (导入错误: {str(e)})")
            finally:
                # 清理临时文件
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logging.info(f"Removed temporary file: {file_path}")
                except Exception as e:
                    logging.error(f"Error cleaning up temporary file: {str(e)}")

        if success_count == 0:
            error_message = '所有词单导入失败'
            if failed_files:
                error_message += f": {', '.join(failed_files)}"
            return jsonify({'error': error_message})

        response = {
            'success_count': success_count,
            'total_words': total_words
        }

        if failed_files:
            response['failed_files'] = failed_files

        return jsonify(response)

    except Exception as e:
        logging.error(f"Unexpected error in import_decks: {str(e)}")
        return jsonify({'error': f'导入词单时发生错误: {str(e)}'})

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
