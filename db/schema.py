import sqlite3
from db import get_db_connection

def init_db():
    """
    Initialize the database by creating the necessary tables.
    """
    conn = get_db_connection()
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
    """
    Create tables specific to a deck.

    Args:
        deck_id (int): The ID of the deck.
    """
    import time
    import logging
    import sqlite3

    max_retries = 5
    retry_delay = 0.1  # 初始延迟时间（秒）

    for attempt in range(max_retries):
        conn = None
        try:
            conn = get_db_connection()
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

            # 为特定词单创建FSRS记录表
            c.execute(f'''
                CREATE TABLE IF NOT EXISTS srs_records_{deck_id} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    word_id INTEGER,
                    question TEXT,
                    state INTEGER,              -- 状态: 0=新卡片, 1=学习中, 2=复习中, 3=重新学习中
                    difficulty REAL,            -- 难度: 1-5
                    stability REAL,             -- 稳定性
                    retrievability REAL,        -- 可提取性
                    reps INTEGER,               -- 复习次数
                    lapses INTEGER,             -- 遗忘次数
                    scheduled_days INTEGER,     -- 计划天数
                    next_review INTEGER,        -- 下次复习时间（毫秒时间戳）
                    last_review INTEGER,        -- 上次复习时间（毫秒时间戳）
                    FOREIGN KEY (word_id) REFERENCES words_{deck_id} (id)
                )
            ''')

            conn.commit()
            logging.info(f"Successfully created tables for deck {deck_id}")
            return True

        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                # 数据库锁定，等待一段时间后重试
                wait_time = retry_delay * (2 ** attempt)  # 指数退避策略
                logging.warning(f"Database is locked, retrying in {wait_time:.2f} seconds (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logging.error(f"Error creating tables after {attempt+1} attempts: {str(e)}")
                return False

        except Exception as e:
            logging.error(f"Error creating tables: {str(e)}")
            return False

        finally:
            if conn:
                conn.close()
