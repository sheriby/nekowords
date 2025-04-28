import sqlite3

def get_db_connection():
    """
    Get a connection to the SQLite database.
    
    Returns:
        sqlite3.Connection: A connection to the database.
    """
    conn = sqlite3.connect('srs_data.db')
    conn.row_factory = sqlite3.Row
    return conn
