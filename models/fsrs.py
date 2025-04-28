from db import get_db_connection
import math
import logging
import re
from datetime import datetime

# FSRS 状态常量
STATES = {
    'NEW': 0,
    'LEARNING': 1,
    'REVIEW': 2,
    'RELEARNING': 3
}

# FSRS 参数
FSRS_PARAMETERS = {
    'request_retention': 0.9,  # 目标记忆保留率
    'maximum_interval': 36500, # 最大间隔（天）
    'w': [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
}

# 难度评级映射
RATING_MAP = {
    '重来': 1,
    '困难': 2,
    '良好': 3,
    '简单': 4
}

def initialize_fsrs_record(word_id, question, deck_id, conn=None):
    """
    Initialize a new FSRS record.

    Args:
        word_id (int): The ID of the word.
        question (str): The question text.
        deck_id (int): The ID of the deck.
        conn (sqlite3.Connection, optional): An existing database connection. If provided, this function
                                            will not commit the transaction or close the connection.

    Returns:
        int: The ID of the new FSRS record.
    """
    import time
    import sqlite3

    # 确定是否需要自己管理连接
    manage_connection = conn is None

    max_retries = 5
    retry_delay = 0.1  # 初始延迟时间（秒）

    for attempt in range(max_retries):
        local_conn = None
        try:
            if manage_connection:
                local_conn = get_db_connection()
                c = local_conn.cursor()
            else:
                c = conn.cursor()

            # 检查记录是否已存在
            c.execute(f'''
                SELECT id FROM srs_records_{deck_id}
                WHERE word_id = ? AND question = ?
            ''', (word_id, question))

            existing_record = c.fetchone()
            if existing_record:
                logging.debug(f"FSRS record already exists for word_id={word_id}, question={question}")
                return existing_record[0]

            # 初始化FSRS记录
            c.execute(f'''
                INSERT INTO srs_records_{deck_id} (
                    word_id, question, state, difficulty, stability,
                    retrievability, reps, lapses, scheduled_days,
                    next_review, last_review
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                word_id,
                question,
                STATES['NEW'],  # 新卡片
                3.0,            # 中等难度
                0.0,            # 初始稳定性
                1.0,            # 初始可提取性
                0,              # 复习次数
                0,              # 遗忘次数
                0,              # 计划天数
                0,              # 下次复习时间
                0               # 上次复习时间
            ))

            record_id = c.lastrowid

            # 只有当我们自己管理连接时才提交事务
            if manage_connection:
                local_conn.commit()

            logging.debug(f"Successfully initialized FSRS record: id={record_id}, word_id={word_id}, question={question}")
            return record_id

        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                # 数据库锁定，等待一段时间后重试
                wait_time = retry_delay * (2 ** attempt)  # 指数退避策略
                logging.warning(f"Database is locked, retrying in {wait_time:.2f} seconds (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logging.error(f"Error initializing FSRS record after {attempt+1} attempts: {str(e)}")
                return None

        except Exception as e:
            logging.error(f"Error initializing FSRS record: {str(e)}")
            return None

        finally:
            # 只有当我们自己管理连接时才关闭连接
            if manage_connection and local_conn:
                local_conn.close()

def calculate_stability(stability, difficulty, rating, reps):
    """
    Calculate stability based on FSRS algorithm.

    Args:
        stability (float): Current stability.
        difficulty (float): Difficulty factor.
        rating (int): Rating (1-4).
        reps (int): Number of repetitions.

    Returns:
        float: New stability.
    """
    w = FSRS_PARAMETERS['w']

    if rating == 1:
        # 忘记
        return w[0] * math.pow(stability, w[1])
    else:
        # 记住
        retrievability = math.exp(math.log(0.9) * stability)
        difficulty_factor = math.exp(w[2] * (difficulty - 3))

        if rating == 2:
            # 困难
            return stability * (1 + math.exp(w[3]) * math.pow(retrievability, w[4]) * math.pow(difficulty_factor, w[5]) * (1 if reps <= 1 else w[6]))
        elif rating == 3:
            # 良好
            return stability * (1 + math.exp(w[7]) * math.pow(retrievability, w[8]) * math.pow(difficulty_factor, w[9]) * (1 if reps <= 1 else w[10]))
        elif rating == 4:
            # 简单
            return stability * (1 + math.exp(w[11]) * math.pow(retrievability, w[12]) * math.pow(difficulty_factor, w[13]) * (1 if reps <= 1 else w[14]))

    return stability

def calculate_difficulty(difficulty, rating):
    """
    Calculate difficulty based on FSRS algorithm.

    Args:
        difficulty (float): Current difficulty.
        rating (int): Rating (1-4).

    Returns:
        float: New difficulty.
    """
    w = FSRS_PARAMETERS['w']

    if rating == 1:
        # 忘记
        new_difficulty = difficulty + w[15]
    elif rating == 2:
        # 困难
        new_difficulty = difficulty + w[15] / 2
    elif rating == 3:
        # 良好
        new_difficulty = difficulty
    elif rating == 4:
        # 简单
        new_difficulty = difficulty - w[16]
    else:
        return difficulty

    # 确保难度在合理范围内
    return min(max(new_difficulty, 1), 5)

def calculate_interval(stability):
    """
    Calculate interval based on FSRS algorithm.

    Args:
        stability (float): Stability factor.

    Returns:
        int: Interval in days.
    """
    request_retention = FSRS_PARAMETERS['request_retention']
    maximum_interval = FSRS_PARAMETERS['maximum_interval']

    # 计算间隔
    interval = math.ceil(stability * math.log(request_retention) / math.log(0.9))

    # 确保间隔在合理范围内
    return min(max(interval, 1), maximum_interval)

def update_fsrs_data(record_id, difficulty_level, deck_id):
    """
    Update FSRS data for a record.

    Args:
        record_id (int): The ID of the FSRS record.
        difficulty_level (str): The difficulty level ('重来', '困难', '良好', or '简单').
        deck_id (int): The ID of the deck.

    Returns:
        bool: True if the FSRS data was updated successfully.
    """
    import time
    import sqlite3

    logging.info(f"Updating FSRS data: record_id={record_id}, deck_id={deck_id}, difficulty={difficulty_level}")

    # 检查 record_id 是否有效
    if not record_id:
        logging.error("Invalid FSRS record ID")
        return False

    # 去除难度级别中的键盘快捷键提示，例如 "简单(D)" -> "简单"
    clean_difficulty = re.sub(r'\([A-Z]\)$', '', difficulty_level)

    # 获取评分
    rating = RATING_MAP.get(clean_difficulty)
    if not rating:
        logging.error(f"Unknown difficulty level: {clean_difficulty}")
        return False

    max_retries = 5
    retry_delay = 0.1  # 初始延迟时间（秒）

    for attempt in range(max_retries):
        conn = None
        try:
            conn = get_db_connection()
            c = conn.cursor()

            # 获取当前记录
            c.execute(f'''
                SELECT state, difficulty, stability, retrievability, reps, lapses, scheduled_days
                FROM srs_records_{deck_id}
                WHERE id = ?
            ''', (record_id,))

            record = c.fetchone()
            if not record:
                logging.error(f"FSRS record with ID {record_id} not found in deck {deck_id}")
                return False

            state, difficulty, stability, retrievability, reps, lapses, scheduled_days = record

            # 当前时间
            now = int(datetime.now().timestamp() * 1000)  # 毫秒时间戳

            # 更新复习次数
            reps += 1

            # 根据当前状态和评分更新 FSRS 信息
            if state == STATES['NEW']:
                # 新卡片
                if rating == 1:
                    # 忘记
                    state = STATES['LEARNING']
                    stability = 0
                    difficulty = calculate_difficulty(difficulty, rating)
                    scheduled_days = 0  # 立即复习
                else:
                    # 记住
                    state = STATES['REVIEW']
                    stability = 1 if rating == 2 else (2 if rating == 3 else 4)  # 根据评分设置初始稳定性
                    difficulty = calculate_difficulty(difficulty, rating)
                    scheduled_days = calculate_interval(stability)
            elif state == STATES['LEARNING'] or state == STATES['RELEARNING']:
                # 学习中或重新学习中
                if rating == 1:
                    # 忘记
                    scheduled_days = 0  # 立即复习
                else:
                    # 记住
                    state = STATES['REVIEW']
                    stability = 1 if rating == 2 else (2 if rating == 3 else 4)  # 根据评分设置初始稳定性
                    difficulty = calculate_difficulty(difficulty, rating)
                    scheduled_days = calculate_interval(stability)
            elif state == STATES['REVIEW']:
                # 复习中
                if rating == 1:
                    # 忘记
                    state = STATES['RELEARNING']
                    stability = calculate_stability(stability, difficulty, rating, reps)
                    difficulty = calculate_difficulty(difficulty, rating)
                    lapses += 1
                    scheduled_days = 0  # 立即复习
                else:
                    # 记住
                    stability = calculate_stability(stability, difficulty, rating, reps)
                    difficulty = calculate_difficulty(difficulty, rating)
                    scheduled_days = calculate_interval(stability)

            # 计算下次复习时间
            next_review = now + (scheduled_days * 24 * 60 * 60 * 1000)  # 转换为毫秒

            # 计算可提取性
            retrievability = math.exp(math.log(0.9) * stability)

            # 更新记录
            c.execute(f'''
                UPDATE srs_records_{deck_id}
                SET state = ?, difficulty = ?, stability = ?, retrievability = ?,
                    reps = ?, lapses = ?, scheduled_days = ?, next_review = ?, last_review = ?
                WHERE id = ?
            ''', (
                state,
                difficulty,
                stability,
                retrievability,
                reps,
                lapses,
                scheduled_days,
                next_review,
                now,
                record_id
            ))

            # 检查是否有行被更新
            if c.rowcount == 0:
                logging.warning(f"No rows updated for FSRS record {record_id} in deck {deck_id}")
            else:
                logging.info(f"Updated FSRS record {record_id} in deck {deck_id}")

            conn.commit()
            return True

        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                # 数据库锁定，等待一段时间后重试
                wait_time = retry_delay * (2 ** attempt)  # 指数退避策略
                logging.warning(f"Database is locked, retrying in {wait_time:.2f} seconds (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logging.error(f"Error updating FSRS data after {attempt+1} attempts: {str(e)}")
                return False

        except Exception as e:
            logging.error(f"Error updating FSRS data: {str(e)}")
            return False

        finally:
            if conn:
                conn.close()

def get_fsrs_records_for_review(deck_id, limit=20):
    """
    Get FSRS records that need review.

    Args:
        deck_id (int): The ID of the deck.
        limit (int, optional): Maximum number of records to return. Defaults to 20.

    Returns:
        list: A list of records that need review.
    """
    import time
    import sqlite3

    max_retries = 5
    retry_delay = 0.1  # 初始延迟时间（秒）

    for attempt in range(max_retries):
        conn = None
        try:
            conn = get_db_connection()
            c = conn.cursor()

            # 获取当前时间
            now = int(datetime.now().timestamp() * 1000)  # 毫秒时间戳

            # 获取需要复习的记录
            c.execute(f'''
                SELECT sr.id, sr.word_id, sr.question, sr.state, sr.difficulty,
                       sr.stability, sr.retrievability, sr.reps, sr.lapses,
                       sr.scheduled_days, sr.next_review, sr.last_review,
                       w.japanese, w.kana, w.chinese, w.is_kana
                FROM srs_records_{deck_id} sr
                JOIN words_{deck_id} w ON sr.word_id = w.id
                WHERE sr.next_review <= ? OR sr.state = ?
                ORDER BY sr.next_review ASC
                LIMIT ?
            ''', (now, STATES['NEW'], limit))

            records = c.fetchall()

            # 转换为字典列表
            result = []
            for record in records:
                result.append({
                    'id': record[0],
                    'word_id': record[1],
                    'question': record[2],
                    'state': record[3],
                    'difficulty': record[4],
                    'stability': record[5],
                    'retrievability': record[6],
                    'reps': record[7],
                    'lapses': record[8],
                    'scheduled_days': record[9],
                    'next_review': record[10],
                    'last_review': record[11],
                    'japanese': record[12],
                    'kana': record[13],
                    'chinese': record[14],
                    'is_kana': record[15]
                })

            logging.info(f"Found {len(result)} FSRS records for review in deck {deck_id}")
            return result

        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                # 数据库锁定，等待一段时间后重试
                wait_time = retry_delay * (2 ** attempt)  # 指数退避策略
                logging.warning(f"Database is locked, retrying in {wait_time:.2f} seconds (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logging.error(f"Error getting FSRS records after {attempt+1} attempts: {str(e)}")
                return []

        except Exception as e:
            logging.error(f"Error getting FSRS records for review: {str(e)}")
            return []

        finally:
            if conn:
                conn.close()
