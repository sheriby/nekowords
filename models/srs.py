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
    import logging

    # 记录传入的参数
    logging.info(f"Updating SRS data: record_id={srs_record_id}, deck_id={deck_id}, srs_info={srs_info}")

    # 检查 srs_record_id 是否有效
    if not srs_record_id:
        logging.error("Invalid SRS record ID")
        return False

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 检查记录是否存在
        c.execute(f"SELECT id FROM srs_records_{deck_id} WHERE id = ?", (srs_record_id,))
        if not c.fetchone():
            logging.error(f"SRS record with ID {srs_record_id} not found in deck {deck_id}")
            return False

        # 更新记录
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

        # 检查是否有行被更新
        if c.rowcount == 0:
            logging.warning(f"No rows updated for SRS record {srs_record_id} in deck {deck_id}")
        else:
            logging.info(f"Updated SRS record {srs_record_id} in deck {deck_id}")

        conn.commit()
        return True
    except Exception as e:
        logging.error(f"Error updating SRS data: {str(e)}")
        return False
    finally:
        conn.close()
