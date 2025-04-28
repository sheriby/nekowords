from db import get_db_connection
from models.fsrs import initialize_fsrs_record, get_fsrs_records_for_review

def add_words_to_deck(deck_id, words):
    """
    Add words to a deck.

    Args:
        deck_id (int): The ID of the deck.
        words (list): A list of dictionaries containing word information.

    Returns:
        bool: True if the words were added successfully, False otherwise.
    """
    import time
    import logging
    import sqlite3

    # 批量处理的大小
    BATCH_SIZE = 50

    max_retries = 5
    retry_delay = 0.1  # 初始延迟时间（秒）

    for attempt in range(max_retries):
        conn = None
        try:
            conn = get_db_connection()
            c = conn.cursor()

            # 将单词列表分成多个批次
            total_words = len(words)
            processed_count = 0
            batch_count = 0

            logging.info(f"Processing {total_words} words in batches of {BATCH_SIZE}")

            for i, word in enumerate(words):
                # 检查单词是否已存在
                c.execute(f'''
                    SELECT id FROM words_{deck_id}
                    WHERE japanese = ? AND kana = ? AND chinese = ?
                ''', (word['japanese'], word['kana'], word['chinese']))

                existing_word = c.fetchone()
                if existing_word:
                    word_id = existing_word[0]
                    logging.debug(f"Word already exists: {word['japanese']}, using existing ID: {word_id}")
                else:
                    # 插入新单词
                    c.execute(f'''
                        INSERT INTO words_{deck_id} (japanese, kana, chinese, is_kana)
                        VALUES (?, ?, ?, ?)
                    ''', (word['japanese'], word['kana'], word['chinese'], word['is_kana']))
                    word_id = c.lastrowid
                    logging.debug(f"Added new word: {word['japanese']}, ID: {word_id}")

                # 为每个单词创建FSRS记录
                questions = []

                # 如果中文和日文相同，只存储一次
                if word['japanese'] == word['chinese']:
                    questions.append(word['japanese'])  # 只存储一次日文/中文
                else:
                    questions.append(word['japanese'])  # 日文题目
                    questions.append(word['chinese'])   # 中文题目

                # 如果不是全假名单词，添加假名题目
                if not word['is_kana']:
                    questions.append(word['kana'])      # 假名题目

                # 在FSRS表中存储不重复的问题
                for question in questions:
                    record_id = initialize_fsrs_record(word_id, question, deck_id, conn)
                    if not record_id:
                        logging.warning(f"Failed to initialize FSRS record for word {word_id}, question: {question}")

                processed_count += 1

                # 每处理一批数据就提交一次事务
                if (i + 1) % BATCH_SIZE == 0 or i == total_words - 1:
                    conn.commit()
                    batch_count += 1
                    logging.info(f"Committed batch {batch_count}, processed {processed_count}/{total_words} words")

                    # 短暂暂停，让其他连接有机会访问数据库
                    time.sleep(0.01)

            logging.info(f"Successfully added {processed_count} words to deck {deck_id} in {batch_count} batches")
            return True

        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                # 数据库锁定，等待一段时间后重试
                wait_time = retry_delay * (2 ** attempt)  # 指数退避策略
                logging.warning(f"Database is locked, retrying in {wait_time:.2f} seconds (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logging.error(f"Error adding words after {attempt+1} attempts: {str(e)}")
                return False

        except Exception as e:
            logging.error(f"Error adding words: {str(e)}")
            return False

        finally:
            if conn:
                conn.close()

def get_deck_words(deck_id, limit=20):
    """
    Get words and FSRS data for a deck that need to be reviewed.

    Args:
        deck_id (int): The ID of the deck.
        limit (int, optional): Maximum number of questions to return. Defaults to 20.

    Returns:
        list: A list of dictionaries containing word and FSRS information.
    """
    # 使用FSRS获取需要复习的记录
    fsrs_records = get_fsrs_records_for_review(deck_id, limit)

    # 如果没有需要复习的记录，返回空列表
    if not fsrs_records:
        return []

    # 组织数据
    questions = []
    for record in fsrs_records:
        # 根据问题类型确定题目类型
        question_type = None
        if record['question'] == record['japanese']:
            question_type = 'japanese_to_others'
        elif record['question'] == record['kana'] and not record['is_kana']:
            question_type = 'kana_to_others'
        elif record['question'] == record['chinese'] and record['japanese'] != record['chinese']:
            question_type = 'chinese_to_others'
        else:
            # 如果无法确定题目类型，跳过
            continue

        # 添加题目
        questions.append({
            'question': record['question'],
            'answer': record['question'],
            'type': question_type,
            'japanese': record['japanese'],
            'kana': record['kana'],
            'chinese': record['chinese'],
            'is_kana': record['is_kana'],
            'fsrs_info': {
                'record_id': record['id'],
                'state': record['state'],
                'difficulty': record['difficulty'],
                'stability': record['stability'],
                'retrievability': record['retrievability'],
                'reps': record['reps'],
                'lapses': record['lapses'],
                'scheduled_days': record['scheduled_days'],
                'next_review': record['next_review'],
                'last_review': record['last_review']
            }
        })

    return questions
