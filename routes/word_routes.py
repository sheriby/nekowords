from flask import Blueprint, jsonify, request, send_file
import tempfile
from models.word import get_deck_words

# Create a Blueprint for word routes
word_bp = Blueprint('word_bp', __name__)

@word_bp.route('/get_deck_words', methods=['POST'])
def get_deck_words_route():
    """
    Get words for a deck that need to be reviewed.

    Returns:
        flask.Response: A JSON response containing word information.
    """
    deck_id = request.json.get('deck_id')
    if not deck_id:
        return jsonify({'error': '缺少词单ID'})

    # 获取批次大小参数
    limit = request.json.get('limit', 10)

    # 获取需要复习的题目
    questions = get_deck_words(deck_id, limit)

    # 返回题目
    return jsonify(questions)

@word_bp.route('/export_wrong_answers', methods=['POST'])
def export_wrong_answers():
    """
    Export wrong answers to a CSV file.

    Returns:
        flask.Response: A file download response.
    """
    wrong_answers = request.json.get('wrong_answers', [])
    if not wrong_answers:
        return jsonify({'error': '没有错题可导出'})

    # 创建临时文件
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w', encoding='utf-8')

    # 用于去重的集合
    exported_words = set()
    temp_file.write('日文,中文,假名\n')

    # 写入错题
    for item in wrong_answers:
        # 如果是日语到中文的错题
        if item['type'] == 'japanese_to_chinese':
            # 提取日语单词（去掉括号中的假名）
            japanese = item['question'].split('(')[0]
            # 检查是否已经导出过
            word_key = f"{japanese},{item['correctAnswer']}"
            if word_key not in exported_words:
                if item['is_kana']:
                    temp_file.write(f"{japanese},{item['correctAnswer']}\n")
                else:
                    temp_file.write(f"{japanese},{item['correctAnswer']},{item['kana']}\n")
                exported_words.add(word_key)
        # 如果是中文到日语的错题
        elif item['type'] == 'chinese_to_japanese':
            # 检查是否已经导出过
            word_key = f"{item['correctAnswer']},{item['question']}"
            if word_key not in exported_words:
                if item['is_kana']:
                    temp_file.write(f"{item['correctAnswer']},{item['question']}\n")
                else:
                    temp_file.write(f"{item['correctAnswer']},{item['question']},{item['kana']}\n")
                exported_words.add(word_key)

    temp_file.close()

    return send_file(
        temp_file.name,
        as_attachment=True,
        download_name='wrong_answers.csv',
        mimetype='text/plain'
    )
