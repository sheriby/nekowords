import sqlite3
import os
import logging
import time

# 确保数据库目录存在
DB_PATH = 'srs_data.db'

def check_db_file():
    """
    Check if the database file exists and is writable.
    If not, create a new database file.
    """
    try:
        # 检查数据库文件是否存在
        if not os.path.exists(DB_PATH):
            logging.warning(f"Database file {DB_PATH} does not exist, creating a new one")
            # 创建一个新的数据库文件
            conn = sqlite3.connect(DB_PATH)
            conn.close()

        # 检查数据库文件是否可写
        if not os.access(DB_PATH, os.W_OK):
            logging.error(f"Database file {DB_PATH} is not writable")
            # 尝试修改权限
            try:
                os.chmod(DB_PATH, 0o666)  # 设置为可读写
                logging.info(f"Changed permissions of {DB_PATH} to make it writable")
            except Exception as e:
                logging.error(f"Failed to change permissions of {DB_PATH}: {str(e)}")

        # 检查数据库文件是否被锁定
        try:
            conn = sqlite3.connect(DB_PATH, timeout=1.0)
            conn.execute('PRAGMA quick_check')
            conn.close()
            logging.info(f"Database file {DB_PATH} is accessible and not locked")
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                logging.error(f"Database file {DB_PATH} is locked")
                # 尝试等待一段时间
                time.sleep(2.0)
                try:
                    conn = sqlite3.connect(DB_PATH, timeout=1.0)
                    conn.execute('PRAGMA quick_check')
                    conn.close()
                    logging.info(f"Database file {DB_PATH} is now accessible")
                except Exception as e2:
                    logging.error(f"Database file {DB_PATH} is still locked after waiting: {str(e2)}")
            else:
                logging.error(f"Error checking database file {DB_PATH}: {str(e)}")
    except Exception as e:
        logging.error(f"Error checking database file: {str(e)}")

def get_db_connection():
    """
    Get a connection to the SQLite database.

    Returns:
        sqlite3.Connection: A connection to the database.
    """
    try:
        # 使用超时参数，避免长时间等待锁
        conn = sqlite3.connect(DB_PATH, timeout=20.0)

        # 设置数据库为 WAL 模式，减少锁定问题
        conn.execute('PRAGMA journal_mode=WAL')

        # 设置同步模式为 NORMAL，提高性能
        conn.execute('PRAGMA synchronous=NORMAL')

        # 启用外键约束
        conn.execute('PRAGMA foreign_keys=ON')

        # 设置行工厂
        conn.row_factory = sqlite3.Row

        return conn
    except Exception as e:
        logging.error(f"Error connecting to database: {str(e)}")
        raise
