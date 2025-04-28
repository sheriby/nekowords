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
