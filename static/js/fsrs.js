/**
 * FSRS (Free Spaced Repetition Scheduler) implementation
 * Based on the algorithm described in https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

// FSRS 参数
const FSRS_PARAMETERS = {
    request_retention: 0.9,  // 目标记忆保留率
    maximum_interval: 36500, // 最大间隔（天）
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
};

// 难度评级映射
const RATING_MAP = {
    '重来': 1,
    '困难': 2,
    '良好': 3,
    '简单': 4
};

// 状态转换矩阵
const STATES = {
    NEW: 0,
    LEARNING: 1,
    REVIEW: 2,
    RELEARNING: 3
};

/**
 * 计算稳定性
 * 
 * @param {number} stability - 当前稳定性
 * @param {number} difficulty - 难度
 * @param {number} rating - 评分
 * @param {number} reps - 复习次数
 * @returns {number} - 新的稳定性
 */
function calculateStability(stability, difficulty, rating, reps) {
    const w = FSRS_PARAMETERS.w;
    
    // 提取参数
    const [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14, w15, w16] = w;
    
    let new_stability;
    
    if (rating === 1) {
        // 忘记
        new_stability = w0 * Math.pow(stability, w1);
    } else {
        // 记住
        const retrievability = Math.exp(Math.log(0.9) * stability);
        const difficulty_factor = Math.exp(w2 * (difficulty - 3));
        
        if (rating === 2) {
            // 困难
            new_stability = stability * (1 + Math.exp(w3) * Math.pow(retrievability, w4) * Math.pow(difficulty_factor, w5) * (reps > 1 ? w6 : 1));
        } else if (rating === 3) {
            // 良好
            new_stability = stability * (1 + Math.exp(w7) * Math.pow(retrievability, w8) * Math.pow(difficulty_factor, w9) * (reps > 1 ? w10 : 1));
        } else if (rating === 4) {
            // 简单
            new_stability = stability * (1 + Math.exp(w11) * Math.pow(retrievability, w12) * Math.pow(difficulty_factor, w13) * (reps > 1 ? w14 : 1));
        }
    }
    
    return new_stability;
}

/**
 * 计算难度
 * 
 * @param {number} difficulty - 当前难度
 * @param {number} rating - 评分
 * @returns {number} - 新的难度
 */
function calculateDifficulty(difficulty, rating) {
    const w = FSRS_PARAMETERS.w;
    
    // 提取参数
    const [_, __, ___, ____, _____, ______, _______, ________, _________, __________, ___________, ____________, _____________, ______________, _______________, w15, w16] = w;
    
    // 根据评分调整难度
    let next_difficulty;
    if (rating === 1) {
        // 忘记
        next_difficulty = difficulty + w15;
    } else if (rating === 2) {
        // 困难
        next_difficulty = difficulty + w15 / 2;
    } else if (rating === 3) {
        // 良好
        next_difficulty = difficulty;
    } else if (rating === 4) {
        // 简单
        next_difficulty = difficulty - w16;
    }
    
    // 确保难度在合理范围内
    return Math.min(Math.max(next_difficulty, 1), 5);
}

/**
 * 计算下一次复习的间隔（天）
 * 
 * @param {number} stability - 稳定性
 * @returns {number} - 间隔（天）
 */
function calculateInterval(stability) {
    const request_retention = FSRS_PARAMETERS.request_retention;
    const maximum_interval = FSRS_PARAMETERS.maximum_interval;
    
    // 计算间隔
    const interval = Math.ceil(stability * Math.log(request_retention) / Math.log(0.9));
    
    // 确保间隔在合理范围内
    return Math.min(Math.max(interval, 1), maximum_interval);
}

/**
 * 初始化 FSRS 信息
 * 
 * @returns {Object} - FSRS 信息对象
 */
export function initializeFSRSInfo() {
    return {
        state: STATES.NEW,
        difficulty: 3,  // 中等难度
        stability: 0,
        retrievability: 1,
        reps: 0,
        lapses: 0,
        last_review: 0,
        next_review: 0,
        scheduled_days: 0
    };
}

/**
 * 更新 FSRS 信息
 * 
 * @param {Object} fsrsInfo - FSRS 信息对象
 * @param {string} difficulty - 难度级别（'重来', '困难', '良好', or '简单'）
 * @returns {Object} - 更新后的 FSRS 信息对象
 */
export function updateFSRSInfo(fsrsInfo, difficulty) {
    const now = Date.now();
    const today = Math.floor(now / (24 * 60 * 60 * 1000));
    
    // 去除难度级别中的键盘快捷键提示，例如 "简单(D)" -> "简单"
    const cleanDifficulty = difficulty.replace(/\([A-Z]\)$/, '');
    
    // 获取评分
    const rating = RATING_MAP[cleanDifficulty];
    if (!rating) {
        console.error('Unknown difficulty level:', cleanDifficulty);
        return fsrsInfo;
    }
    
    // 复制 FSRS 信息
    const newFsrsInfo = { ...fsrsInfo };
    
    // 更新复习次数
    newFsrsInfo.reps += 1;
    
    // 根据当前状态和评分更新 FSRS 信息
    if (newFsrsInfo.state === STATES.NEW) {
        // 新卡片
        if (rating === 1) {
            // 忘记
            newFsrsInfo.state = STATES.LEARNING;
            newFsrsInfo.stability = 0;
            newFsrsInfo.difficulty = calculateDifficulty(newFsrsInfo.difficulty, rating);
            newFsrsInfo.scheduled_days = 0;  // 立即复习
        } else {
            // 记住
            newFsrsInfo.state = STATES.REVIEW;
            newFsrsInfo.stability = rating === 2 ? 0.5 : (rating === 3 ? 1 : 2);  // 根据评分设置初始稳定性
            newFsrsInfo.difficulty = calculateDifficulty(newFsrsInfo.difficulty, rating);
            newFsrsInfo.scheduled_days = calculateInterval(newFsrsInfo.stability);
        }
    } else if (newFsrsInfo.state === STATES.LEARNING || newFsrsInfo.state === STATES.RELEARNING) {
        // 学习中或重新学习中
        if (rating === 1) {
            // 忘记
            newFsrsInfo.scheduled_days = 0;  // 立即复习
        } else {
            // 记住
            if (newFsrsInfo.state === STATES.LEARNING) {
                newFsrsInfo.state = STATES.REVIEW;
            } else {
                newFsrsInfo.state = STATES.REVIEW;
            }
            newFsrsInfo.stability = rating === 2 ? 0.5 : (rating === 3 ? 1 : 2);  // 根据评分设置初始稳定性
            newFsrsInfo.difficulty = calculateDifficulty(newFsrsInfo.difficulty, rating);
            newFsrsInfo.scheduled_days = calculateInterval(newFsrsInfo.stability);
        }
    } else if (newFsrsInfo.state === STATES.REVIEW) {
        // 复习中
        if (rating === 1) {
            // 忘记
            newFsrsInfo.state = STATES.RELEARNING;
            newFsrsInfo.stability = calculateStability(newFsrsInfo.stability, newFsrsInfo.difficulty, rating, newFsrsInfo.reps);
            newFsrsInfo.difficulty = calculateDifficulty(newFsrsInfo.difficulty, rating);
            newFsrsInfo.lapses += 1;
            newFsrsInfo.scheduled_days = 0;  // 立即复习
        } else {
            // 记住
            newFsrsInfo.stability = calculateStability(newFsrsInfo.stability, newFsrsInfo.difficulty, rating, newFsrsInfo.reps);
            newFsrsInfo.difficulty = calculateDifficulty(newFsrsInfo.difficulty, rating);
            newFsrsInfo.scheduled_days = calculateInterval(newFsrsInfo.stability);
        }
    }
    
    // 更新复习时间
    newFsrsInfo.last_review = now;
    newFsrsInfo.next_review = now + (newFsrsInfo.scheduled_days * 24 * 60 * 60 * 1000);
    
    // 计算可提取性
    newFsrsInfo.retrievability = Math.exp(Math.log(0.9) * newFsrsInfo.stability);
    
    console.log('Updated FSRS info:', {
        difficulty: cleanDifficulty,
        rating,
        state: newFsrsInfo.state,
        difficulty_value: newFsrsInfo.difficulty,
        stability: newFsrsInfo.stability,
        retrievability: newFsrsInfo.retrievability,
        scheduled_days: newFsrsInfo.scheduled_days,
        next_review: new Date(newFsrsInfo.next_review).toLocaleString()
    });
    
    return newFsrsInfo;
}

/**
 * 将 FSRS 信息转换为与旧 SRS 系统兼容的格式
 * 
 * @param {Object} fsrsInfo - FSRS 信息对象
 * @returns {Object} - SRS 兼容的信息对象
 */
export function convertFSRSToSRSFormat(fsrsInfo) {
    return {
        nextReview: fsrsInfo.next_review,
        interval: fsrsInfo.scheduled_days * 24 * 60,  // 转换为分钟
        ease: fsrsInfo.difficulty,
        lastReview: fsrsInfo.last_review,
        reviewCount: fsrsInfo.reps
    };
}

/**
 * 将旧 SRS 系统的信息转换为 FSRS 格式
 * 
 * @param {Object} srsInfo - SRS 信息对象
 * @returns {Object} - FSRS 信息对象
 */
export function convertSRSToFSRSFormat(srsInfo) {
    const fsrsInfo = initializeFSRSInfo();
    
    // 如果有复习记录，则设置为 REVIEW 状态
    if (srsInfo.reviewCount > 0) {
        fsrsInfo.state = STATES.REVIEW;
    }
    
    fsrsInfo.difficulty = srsInfo.ease || 3;
    fsrsInfo.stability = srsInfo.interval / (24 * 60) || 0;  // 转换为天
    fsrsInfo.reps = srsInfo.reviewCount || 0;
    fsrsInfo.last_review = srsInfo.lastReview || 0;
    fsrsInfo.next_review = srsInfo.nextReview || 0;
    fsrsInfo.scheduled_days = srsInfo.interval / (24 * 60) || 0;  // 转换为天
    
    // 计算可提取性
    fsrsInfo.retrievability = Math.exp(Math.log(0.9) * fsrsInfo.stability);
    
    return fsrsInfo;
}
