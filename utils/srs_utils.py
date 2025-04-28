# SRS intervals (in minutes)
SRS_INTERVALS = {
    'again': 1,          # 重来：1分钟后
    'hard': {
        'initial': 5,    # 初始：5分钟
        'min': 5,        # 最小：5分钟
        'max': 4320      # 最大：3天
    },
    'good': {
        'initial': 10,   # 初始：10分钟
        'min': 10,       # 最小：10分钟
        'max': 10080     # 最大：7天
    },
    'easy': {
        'initial': 240,  # 初始：4小时
        'min': 240,      # 最小：4小时
        'max': 43200     # 最大：30天
    }
}

def calculate_next_interval(current_interval, ease, difficulty):
    """
    Calculate the next interval for SRS.
    
    Args:
        current_interval (int): The current interval in minutes.
        ease (float): The ease factor.
        difficulty (str): The difficulty level ('again', 'hard', 'good', or 'easy').
        
    Returns:
        int: The next interval in minutes.
    """
    intervals = SRS_INTERVALS[difficulty]

    # 如果是"重来"，直接返回固定间隔
    if difficulty == 'again':
        return SRS_INTERVALS['again']

    # 如果是首次学习或重新学习
    if current_interval == 0:
        return intervals['initial']

    # 计算新间隔
    if difficulty == 'hard':
        new_interval = int(current_interval * ease * 0.8)
    elif difficulty == 'good':
        new_interval = int(current_interval * ease)
    elif difficulty == 'easy':
        new_interval = int(current_interval * ease * 1.3)
    else:
        new_interval = current_interval

    # 确保间隔在合理范围内
    return min(max(new_interval, intervals['min']), intervals['max'])
