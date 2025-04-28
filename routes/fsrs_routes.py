from flask import Blueprint, jsonify, request
from models.fsrs import update_fsrs_data
import logging

# Create a Blueprint for FSRS routes
fsrs_bp = Blueprint('fsrs_bp', __name__)

@fsrs_bp.route('/update_fsrs', methods=['POST'])
def update_fsrs():
    """
    Update FSRS data for a record.
    
    Returns:
        flask.Response: A JSON response indicating success or failure.
    """
    try:
        data = request.json
        logging.info(f"Received update_fsrs request: {data}")
        
        record_id = data.get('record_id')
        difficulty = data.get('difficulty')
        deck_id = data.get('deck_id')
        
        # 检查参数
        if not record_id:
            logging.error("Missing FSRS record ID")
            return jsonify({'error': '缺少FSRS记录ID'})
        
        if not difficulty:
            logging.error("Missing difficulty")
            return jsonify({'error': '缺少难度评级'})
        
        if not deck_id:
            logging.error("Missing deck ID")
            return jsonify({'error': '缺少词单ID'})
        
        # 更新FSRS数据
        if update_fsrs_data(record_id, difficulty, deck_id):
            logging.info(f"Successfully updated FSRS data for record {record_id} in deck {deck_id}")
            return jsonify({'success': True})
        else:
            logging.error(f"Failed to update FSRS data for record {record_id} in deck {deck_id}")
            return jsonify({'error': '更新FSRS数据失败'})
    except Exception as e:
        logging.error(f"Error in update_fsrs: {str(e)}")
        return jsonify({'error': f'更新FSRS数据时发生错误: {str(e)}'})
