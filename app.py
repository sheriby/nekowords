from flask import Flask, render_template, jsonify, request, send_file
import random
import os
import tempfile

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
        # 生成日语到中文的题目
        japanese_question = word['japanese']
        if not word['is_kana']:  # 如果不是全假名单词，添加假名
            japanese_question = f"{word['japanese']}({word['kana']})"
            
        questions.append({
            'type': 'japanese_to_chinese',
            'question': japanese_question,
            'answer': word['chinese']
        })
        
        # 生成中文到日语的题目
        questions.append({
            'type': 'chinese_to_japanese',
            'question': word['chinese'],
            'answer': word['japanese'],
            'kana': word['kana'],
            'is_kana': word['is_kana']  # 传递是否为全假名单词的信息
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
            ans = item['question'].split('(')
            japanese = ans[0]
            kana = None
            if len(ans) > 1:
                kana = ans[1].split(')')[0]
            # 检查是否已经导出过
            word_key = f"{japanese},{item['correctAnswer']}"
            if word_key not in exported_words:
                if kana is None:
                    temp_file.write(f"{japanese},{item['correctAnswer']}\n")
                else:
                    temp_file.write(f"{japanese},{item['correctAnswer']},{kana}\n")
                exported_words.add(word_key)
        # 如果是中文到日语的错题
        elif item['type'] == 'chinese_to_japanese':
            # 检查是否已经导出过
            word_key = f"{item['correctAnswer']},{item['question']}"
            if word_key not in exported_words:
                # 如果单词不是全假名，添加假名信息
                if not item['is_kana'] and item['kana']:
                    temp_file.write(f"{item['correctAnswer']},{item['question']},{item['kana']}\n")
                else:
                    temp_file.write(f"{item['correctAnswer']},{item['question']}\n")
                exported_words.add(word_key)
    
    temp_file.close()
    
    return send_file(
        temp_file.name,
        as_attachment=True,
        download_name='wrong_answers.csv',
        mimetype='text/plain'
    )

if __name__ == '__main__':
    app.run(debug=False) 