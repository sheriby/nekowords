from db import get_db_connection

def update_srs_data(srs_record_id, srs_info, deck_id):
    """
    Update SRS data for a record.
    
    Args:
        srs_record_id (int): The ID of the SRS record.
        srs_info (dict): A dictionary containing SRS information.
        deck_id (int): The ID of the deck.
        
    Returns:
        bool: True if the SRS data was updated successfully.
    """
    conn = get_db_connection()
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
    return True
