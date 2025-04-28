from db import get_db_connection

def add_words_to_deck(deck_id, words):
    """
    Add words to a deck.

    Args:
        deck_id (int): The ID of the deck.
        words (list): A list of dictionaries containing word information.

    Returns:
        bool: True if the words were added successfully, False otherwise.
    """
    conn = get_db_connection()
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

def get_deck_words(deck_id, limit=10, current_time=None):
    """
    Get words and SRS data for a deck that need to be reviewed.

    Args:
        deck_id (int): The ID of the deck.
        limit (int, optional): Maximum number of questions to return. Defaults to 10.
        current_time (int, optional): Current time in milliseconds. If None, uses current time.

    Returns:
        list: A list of dictionaries containing word and SRS information.
    """
    from datetime import datetime

    conn = get_db_connection()
    c = conn.cursor()

    # 如果没有提供当前时间，使用当前时间
    if current_time is None:
        current_time = int(datetime.now().timestamp() * 1000)

    # 获取需要复习的SRS记录
    c.execute(f'''
        SELECT sr.id, sr.word_id, sr.question, sr.next_review, sr.interval, sr.ease, sr.last_review
        FROM srs_records_{deck_id} sr
        WHERE sr.next_review <= ?
        ORDER BY sr.next_review ASC
        LIMIT ?
    ''', (current_time, limit))
    srs_records = c.fetchall()

    # 如果没有需要复习的记录，返回空列表
    if not srs_records:
        conn.close()
        return []

    # 获取相关单词的ID
    word_ids = set(record[1] for record in srs_records)

    # 获取单词信息
    word_data = {}
    for word_id in word_ids:
        c.execute(f'''
            SELECT id, japanese, kana, chinese, is_kana
            FROM words_{deck_id}
            WHERE id = ?
        ''', (word_id,))
        word = c.fetchone()
        if word:
            word_data[word[0]] = {
                'id': word[0],
                'japanese': word[1],
                'kana': word[2],
                'chinese': word[3],
                'is_kana': word[4]
            }

    # 组织数据
    questions = []
    for record in srs_records:
        srs_id, word_id, question, next_review, interval, ease, last_review = record

        # 如果找不到对应的单词，跳过
        if word_id not in word_data:
            continue

        word = word_data[word_id]

        # 根据问题类型确定题目类型
        question_type = None
        if question == word['japanese']:
            question_type = 'japanese_to_others'
        elif question == word['kana'] and not word['is_kana']:
            question_type = 'kana_to_others'
        elif question == word['chinese'] and word['japanese'] != word['chinese']:
            question_type = 'chinese_to_others'
        else:
            # 如果无法确定题目类型，跳过
            continue

        # 添加题目
        questions.append({
            'question': question,
            'answer': question,
            'type': question_type,
            'japanese': word['japanese'],
            'kana': word['kana'],
            'chinese': word['chinese'],
            'is_kana': word['is_kana'],
            'srs_info': {
                'srs_record_id': srs_id,
                'nextReview': next_review,
                'interval': interval,
                'ease': ease,
                'lastReview': last_review
            }
        })

    conn.close()
    return questions
