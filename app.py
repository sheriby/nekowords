from flask import Flask, render_template, jsonify, request, send_file
import random
import os
import tempfile
import pandas as pd
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)

# 初始化数据库
def init_db():
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    
    # 词单表
    c.execute('''
        CREATE TABLE IF NOT EXISTS decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            created_at INTEGER
        )
    ''')
    
    conn.commit()
    conn.close()

def create_deck_tables(deck_id):
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    
    # 为特定词单创建单词表
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS words_{deck_id} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            japanese TEXT,
            kana TEXT,
            chinese TEXT,
            is_kana BOOLEAN
        )
    ''')
    
    # 为特定词单创建SRS记录表
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS srs_records_{deck_id} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER,
            question TEXT,
            next_review INTEGER,
            interval INTEGER,
            ease REAL,
            last_review INTEGER,
            FOREIGN KEY (word_id) REFERENCES words_{deck_id} (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# 获取所有词单
def get_decks():
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    
    # 获取词单基本信息，按照创建时间升序排序（ASC）
    c.execute('SELECT id, name, created_at FROM decks ORDER BY created_at ASC')
    decks = c.fetchall()
    
    # 计算每个词单的单词总数和需要复习的单词数
    deck_stats = []
    for deck in decks:
        deck_id, name, _ = deck
        
        # 获取词单中的单词总数
        c.execute(f'SELECT COUNT(*) FROM words_{deck_id}')
        total = c.fetchone()[0]
        
        # 获取需要复习的单词数
        current_time = int(datetime.now().timestamp() * 1000)  # 转换为毫秒
        c.execute(f'''
            SELECT COUNT(DISTINCT w.id)
            FROM words_{deck_id} w
            JOIN srs_records_{deck_id} sr ON w.id = sr.word_id
            WHERE sr.next_review <= ?
        ''', (current_time,))
        to_review = c.fetchone()[0]
        
        deck_stats.append({
            'id': deck_id,
            'name': name,
            'total': total,
            'memory_cnt': total - to_review
        })
    
    conn.close()
    return deck_stats

# 添加词单
def add_deck(name):
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    try:
        c.execute('INSERT INTO decks (name, created_at) VALUES (?, ?)',
                 (name, int(datetime.now().timestamp())))
        deck_id = c.lastrowid
        conn.commit()
        
        # 为新词单创建独立的表
        create_deck_tables(deck_id)
        return deck_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

# 添加单词到词单
def add_words_to_deck(deck_id, words):
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    try:
        for word in words:
            c.execute(f'''
                INSERT INTO words_{deck_id} (japanese, kana, chinese, is_kana)
                VALUES (?, ?, ?, ?)
            ''', (word['japanese'], word['kana'], word['chinese'], word['is_kana']))
            word_id = c.lastrowid
            
            # 为每个单词创建SRS记录
            questions = []
            
            # 如果中文和日文相同，只存储一次
            if word['japanese'] == word['chinese']:
                questions.append((word_id, word['japanese']))  # 只存储一次日文/中文
            else:
                questions.append((word_id, word['japanese']))  # 日文题目
                questions.append((word_id, word['chinese']))   # 中文题目
            
            # 如果不是全假名单词，添加假名题目
            if not word['is_kana']:
                questions.append((word_id, word['kana']))      # 假名题目
            
            # 在SRS表中存储不重复的问题
            for _, question in questions:
                c.execute(f'''
                    INSERT INTO srs_records_{deck_id} (word_id, question, next_review, interval, ease, last_review)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (word_id, question, 0, 0, 1.0, 0))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Error adding words: {str(e)}")
        return False
    finally:
        conn.close()

# 获取词单的单词和SRS数据
def get_deck_words(deck_id):
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    
    # 获取单词
    c.execute(f'''
        SELECT id, japanese, kana, chinese, is_kana
        FROM words_{deck_id}
    ''')
    words = c.fetchall()
    
    # 获取SRS数据
    c.execute(f'''
        SELECT id, question, next_review, interval, ease, last_review
        FROM srs_records_{deck_id}
    ''')
    srs_records = c.fetchall()
    
    # 组织数据
    srs_data = {}
    for record in srs_records:
        srs_data[record[1]] = {
            'srs_record_id': record[0],
            'nextReview': record[2],
            'interval': record[3],
            'ease': record[4],
            'lastReview': record[5]
        }
    
    questions = []
    for word in words:
        word_id, japanese, kana, chinese, is_kana = word
        
        # 添加日文题目
        questions.append({
            'question': japanese,
            'answer': japanese,
            'type': 'japanese_to_others',
            'japanese': japanese,
            'kana': kana,
            'chinese': chinese,
            'is_kana': is_kana,
            'srs_info': srs_data.get(japanese, {
                'srs_record_id': None,
                'nextReview': 0,
                'interval': 0,
                'ease': 1.0,
                'lastReview': 0
            })
        })
        
        # 如果不是全假名单词，添加假名题目
        if not is_kana:
            questions.append({
                'question': kana,
                'answer': kana,
                'type': 'kana_to_others',
                'japanese': japanese,
                'kana': kana,
                'chinese': chinese,
                'is_kana': is_kana,
                'srs_info': srs_data.get(kana, {
                    'srs_record_id': None,
                    'nextReview': 0,
                    'interval': 0,
                    'ease': 1.0,
                    'lastReview': 0
                })
            })
        
        # 如果中文和日文不同，添加中文题目
        if japanese != chinese:
            questions.append({
                'question': chinese,
                'answer': chinese,
                'type': 'chinese_to_others',
                'japanese': japanese,
                'kana': kana,
                'chinese': chinese,
                'is_kana': is_kana,
                'srs_info': srs_data.get(chinese, {
                    'srs_record_id': None,
                    'nextReview': 0,
                    'interval': 0,
                    'ease': 1.0,
                    'lastReview': 0
                })
            })
    
    return questions

# 更新SRS数据
def update_srs_data(srs_record_id, srs_info, deck_id):
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    c.execute(f'''
        UPDATE srs_records_{deck_id}
        SET next_review = ?, interval = ?, ease = ?, last_review = ?
        WHERE id = ?
    ''', (
        srs_info['nextReview'],
        srs_info['interval'],
        srs_info['ease'],
        srs_info['lastReview'],
        srs_record_id
    ))
    conn.commit()
    conn.close()

# 删除词单
def delete_deck(deck_id):
    conn = sqlite3.connect('srs_data.db')
    c = conn.cursor()
    try:
        # 删除词单特定的表
        c.execute(f'DROP TABLE IF EXISTS srs_records_{deck_id}')
        c.execute(f'DROP TABLE IF EXISTS words_{deck_id}')
        # 删除词单记录
        c.execute('DELETE FROM decks WHERE id = ?', (deck_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting deck: {str(e)}")
        return False
    finally:
        conn.close()

# 初始化数据库
init_db()

def load_words_from_file(file_path):
    words = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # 跳过第一行（表头）
            next(f)
            
            for line in f:
                line = line.strip()
                if not line:  # 跳过空行
                    continue
                
                # 尝试不同的分隔符
                for sep in [',', '\t', ';', '|']:
                    parts = line.split(sep)
                    if len(parts) >= 2:  # 至少需要日文和中文
                        japanese = parts[0].strip()
                        chinese = parts[1].strip()
                        
                        # 检查是否为全假名单词
                        is_kana = all(0x3040 <= ord(c) <= 0x309F or 0x30A0 <= ord(c) <= 0x30FF for c in japanese)
                        
                        # 如果有第三列，则认为是假名
                        kana = parts[2].strip() if len(parts) >= 3 else japanese
                        
                        words.append({
                            'japanese': japanese,
                            'kana': kana,
                            'chinese': chinese,
                            'is_kana': is_kana
                        })
                        break
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
    return words

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_decks', methods=['GET'])
def get_decks_route():
    decks = get_decks()
    return jsonify(decks)

@app.route('/import_decks', methods=['POST'])
def import_decks():
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

@app.route('/get_deck_words', methods=['POST'])
def get_deck_words_route():
    deck_id = request.json.get('deck_id')
    if not deck_id:
        return jsonify({'error': '缺少词单ID'})
    
    questions = get_deck_words(deck_id)
    return jsonify(questions)

@app.route('/update_srs', methods=['POST'])
def update_srs():
    data = request.json
    srs_record_id = data.get('srs_record_id')
    srs_info = data.get('srs_info')
    deck_id = data.get('deck_id')
    
    if not all([srs_record_id, srs_info, deck_id]):
        return jsonify({'error': '缺少必要参数'})
    
    update_srs_data(srs_record_id, srs_info, deck_id)
    return jsonify({'success': True})

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

@app.route('/delete_deck', methods=['POST'])
def delete_deck_route():
    deck_id = request.json.get('deck_id')
    if not deck_id:
        return jsonify({'error': '缺少词单ID'})
    
    if delete_deck(deck_id):
        return jsonify({'success': True})
    else:
        return jsonify({'error': '删除词单失败'})

if __name__ == '__main__':
    app.run(debug=True) 
