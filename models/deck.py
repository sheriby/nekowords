from datetime import datetime
import sqlite3
from db import get_db_connection
from db.schema import create_deck_tables

def get_decks():
    """
    Get all decks with statistics.

    Returns:
        list: A list of dictionaries containing deck information.
    """
    conn = get_db_connection()
    c = conn.cursor()

    # 获取词单基本信息，按照创建时间升序排序（ASC）
    c.execute('SELECT id, name, created_at FROM decks ORDER BY created_at ASC')
    decks = c.fetchall()

    # 计算每个词单的单词总数和已记忆好的单词数
    deck_stats = []
    for deck in decks:
        deck_id, name, _ = deck

        # 获取词单中的单词总数
        c.execute(f'SELECT COUNT(*) FROM words_{deck_id}')
        total = c.fetchone()[0]

        # 获取当前时间
        current_time = int(datetime.now().timestamp() * 1000)  # 转换为毫秒

        # 获取需要复习的单词数（一个单词的任何一个问题需要复习，该单词就需要复习）
        c.execute(f'''
            SELECT COUNT(DISTINCT w.id)
            FROM words_{deck_id} w
            JOIN srs_records_{deck_id} sr ON w.id = sr.word_id
            WHERE sr.next_review <= ?
        ''', (current_time,))
        words_to_review = c.fetchone()[0]

        # 计算已记忆好的单词数（所有问题都不需要复习的单词）
        memory_cnt = total - words_to_review

        deck_stats.append({
            'id': deck_id,
            'name': name,
            'total': total,
            'memory_cnt': memory_cnt
        })

    conn.close()
    return deck_stats

def add_deck(name):
    """
    Add a new deck.

    Args:
        name (str): The name of the deck.

    Returns:
        int or None: The ID of the new deck, or None if the deck already exists.
    """
    import time
    import logging

    max_retries = 5
    retry_delay = 0.1  # 初始延迟时间（秒）

    for attempt in range(max_retries):
        conn = None
        try:
            conn = get_db_connection()
            c = conn.cursor()

            # 检查词单是否已存在
            c.execute('SELECT id FROM decks WHERE name = ?', (name,))
            existing_deck = c.fetchone()
            if existing_deck:
                logging.info(f"Deck with name '{name}' already exists")
                return existing_deck[0]

            c.execute('INSERT INTO decks (name, created_at) VALUES (?, ?)',
                     (name, int(datetime.now().timestamp())))
            deck_id = c.lastrowid
            conn.commit()

            # 为新词单创建独立的表
            create_deck_tables(deck_id)

            logging.info(f"Successfully created deck: id={deck_id}, name={name}")
            return deck_id

        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                # 数据库锁定，等待一段时间后重试
                wait_time = retry_delay * (2 ** attempt)  # 指数退避策略
                logging.warning(f"Database is locked, retrying in {wait_time:.2f} seconds (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logging.error(f"Error creating deck after {attempt+1} attempts: {str(e)}")
                return None

        except sqlite3.IntegrityError:
            logging.warning(f"Deck with name '{name}' already exists (integrity error)")
            return None

        except Exception as e:
            logging.error(f"Error creating deck: {str(e)}")
            return None

        finally:
            if conn:
                conn.close()

def delete_deck(deck_id):
    """
    Delete a deck and its associated tables.

    Args:
        deck_id (int): The ID of the deck to delete.

    Returns:
        bool: True if the deck was deleted successfully, False otherwise.
    """
    conn = get_db_connection()
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
