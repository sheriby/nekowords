from flask import Blueprint, jsonify, request
from models.srs import update_srs_data

# Create a Blueprint for SRS routes
srs_bp = Blueprint('srs_bp', __name__)

@srs_bp.route('/update_srs', methods=['POST'])
def update_srs():
    """
    Update SRS data for a record.
    
    Returns:
        flask.Response: A JSON response indicating success or failure.
    """
    data = request.json
    srs_record_id = data.get('srs_record_id')
    srs_info = data.get('srs_info')
    deck_id = data.get('deck_id')
    
    if not all([srs_record_id, srs_info, deck_id]):
        return jsonify({'error': '缺少必要参数'})
    
    if update_srs_data(srs_record_id, srs_info, deck_id):
        return jsonify({'success': True})
    else:
        return jsonify({'error': '更新SRS数据失败'})
