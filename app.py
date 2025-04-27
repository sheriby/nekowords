from flask import Flask, render_template, jsonify, request, send_file
import random
import os
import tempfile
import pandas as pd

app = Flask(__name__)

def load_words_from_file(file_path):
    words = []
    head = True 
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if head:
                    head = False
                    continue
                parts = line.strip().split(',')
                if len(parts) == 3:
                    japanese, chinese, kana = parts
                    words.append({
                        'japanese': japanese,
                        'kana': kana,
                        'chinese': chinese,
                        'is_kana': False  # 标记是否为全假名单词
                    })
                elif len(parts) == 2:
                    japanese, chinese = parts
                    words.append({
                        'japanese': japanese,
                        'kana': japanese,
                        'chinese': chinese,
                        'is_kana': True  # 标记为全假名单词
                    })
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
    return words

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_all_questions', methods=['POST'])
def get_all_questions():
    if 'files[]' not in request.files:
        return jsonify({'error': '没有选择文件'})
    
    files = request.files.getlist('files[]')
    all_words = []
    
    for file in files:
        if file.filename == '':
            continue
            
        # 保存上传的文件到临时目录
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        file.save(file_path)
        
        # 读取单词
        words = load_words_from_file(file_path)
        all_words.extend(words)
        
        # 删除临时文件
        os.remove(file_path)
        os.rmdir(temp_dir)
    
    if not all_words:
        return jsonify({'error': '没有找到单词'})

    questions = []
    for word in all_words:
        # 1. 日文 -> 假名和中文
        questions.append({
            'question': word['japanese'],
            'answer': word['japanese'],
            'type': 'japanese_to_others',
            'japanese': word['japanese'],
            'kana': word['kana'],
            'chinese': word['chinese'],
            'is_kana': word['is_kana']
        })

        # 2. 假名 -> 日文和中文（如果不是全假名单词）
        if not word['is_kana']:
            questions.append({
                'question': word['kana'],
                'answer': word['kana'],
                'type': 'kana_to_others',
                'japanese': word['japanese'],
                'kana': word['kana'],
                'chinese': word['chinese'],
                'is_kana': word['is_kana']
            })

        # 3. 中文 -> 日文和假名
        questions.append({
            'question': word['chinese'],
            'answer': word['chinese'],
            'type': 'chinese_to_others',
            'japanese': word['japanese'],
            'kana': word['kana'],
            'chinese': word['chinese'],
            'is_kana': word['is_kana']
        })

    return jsonify(questions)

@app.route('/export_wrong_answers', methods=['POST'])
def export_wrong_answers():
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

if __name__ == '__main__':
    app.run(debug=True) 