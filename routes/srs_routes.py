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
    import logging

    try:
        data = request.json
        logging.info(f"Received update_srs request: {data}")

        srs_record_id = data.get('srs_record_id')
        srs_info = data.get('srs_info')
        deck_id = data.get('deck_id')

        # 检查参数
        if not srs_record_id:
            logging.error("Missing SRS record ID")
            return jsonify({'error': '缺少SRS记录ID'})

        if not srs_info:
            logging.error("Missing SRS info")
            return jsonify({'error': '缺少SRS信息'})

        if not deck_id:
            logging.error("Missing deck ID")
            return jsonify({'error': '缺少词单ID'})

        # 检查 srs_info 中的必要字段
        required_fields = ['nextReview', 'interval', 'ease', 'lastReview']
        missing_fields = [field for field in required_fields if field not in srs_info]

        if missing_fields:
            logging.error(f"Missing fields in SRS info: {missing_fields}")
            return jsonify({'error': f'SRS信息中缺少字段: {", ".join(missing_fields)}'})

        # 更新SRS数据
        if update_srs_data(srs_record_id, srs_info, deck_id):
            logging.info(f"Successfully updated SRS data for record {srs_record_id} in deck {deck_id}")
            return jsonify({'success': True})
        else:
            logging.error(f"Failed to update SRS data for record {srs_record_id} in deck {deck_id}")
            return jsonify({'error': '更新SRS数据失败'})
    except Exception as e:
        logging.error(f"Error in update_srs: {str(e)}")
        return jsonify({'error': f'更新SRS数据时发生错误: {str(e)}'})
