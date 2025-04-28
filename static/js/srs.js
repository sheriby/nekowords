/**
 * SRS (Spaced Repetition System) related functionality
 */

import { SRS_INTERVALS } from './config.js';

/**
 * Calculate the next interval for SRS based on current interval, ease factor, and difficulty
 *
 * @param {number} currentInterval - Current interval in minutes
 * @param {number} ease - Ease factor
 * @param {string} difficulty - Difficulty level ('again', 'hard', 'good', or 'easy')
 * @returns {number} - Next interval in minutes
 */
export function calculateNextInterval(currentInterval, ease, difficulty) {
    const intervals = SRS_INTERVALS[difficulty];

    // 如果是"重来"，直接返回固定间隔
    if (difficulty === 'again') {
        return SRS_INTERVALS.again;
    }

    // 如果是首次学习或重新学习
    if (currentInterval === 0) {
        return intervals.initial;
    }

    // 计算新间隔
    let newInterval;
    switch (difficulty) {
        case 'hard':
            newInterval = Math.floor(currentInterval * ease * 0.8);
            break;
        case 'good':
            newInterval = Math.floor(currentInterval * ease);
            break;
        case 'easy':
            newInterval = Math.floor(currentInterval * ease * 1.3);
            break;
    }

    // 确保间隔在合理范围内
    return Math.min(Math.max(newInterval, intervals.min), intervals.max);
}

/**
 * Initialize SRS information for a new word
 *
 * @returns {Object} - SRS information object
 */
export function initializeSRSInfo() {
    return {
        nextReview: 0,
        interval: 0,
        ease: 2.5,  // 初始难度系数
        lastReview: 0,
        reviewCount: 0  // 添加复习次数计数
    };
}

/**
 * Update SRS information based on difficulty rating
 *
 * @param {Object} srsInfo - SRS information object
 * @param {string} difficulty - Difficulty level ('重来', '困难', '良好', or '简单')
 * @returns {Object} - Updated SRS information object
 */
export function updateSRSInfo(srsInfo, difficulty) {
    const now = Date.now();

    // 去除难度级别中的键盘快捷键提示，例如 "简单(D)" -> "简单"
    const cleanDifficulty = difficulty.replace(/\([A-Z]\)$/, '');

    console.log('Original difficulty:', difficulty);
    console.log('Cleaned difficulty:', cleanDifficulty);

    // 将中文难度级别映射到英文
    let difficultyKey;
    switch (cleanDifficulty) {
        case '重来':
            difficultyKey = 'again';
            break;
        case '困难':
            difficultyKey = 'hard';
            break;
        case '良好':
            difficultyKey = 'good';
            break;
        case '简单':
            difficultyKey = 'easy';
            break;
        default:
            console.error('Unknown difficulty level:', cleanDifficulty);
            difficultyKey = 'good'; // 默认为良好
    }

    // 更新SRS数据
    switch (cleanDifficulty) {
        case '重来':
            srsInfo.interval = SRS_INTERVALS.again;
            srsInfo.ease = Math.max(1.3, srsInfo.ease - 0.3);
            break;
        case '困难':
            srsInfo.interval = calculateNextInterval(srsInfo.interval, srsInfo.ease, difficultyKey);
            srsInfo.ease = Math.max(1.3, srsInfo.ease - 0.15);
            break;
        case '良好':
            srsInfo.interval = calculateNextInterval(srsInfo.interval, srsInfo.ease, difficultyKey);
            // 良好不改变ease
            break;
        case '简单':
            srsInfo.interval = calculateNextInterval(srsInfo.interval, srsInfo.ease, difficultyKey);
            srsInfo.ease = Math.min(2.5, srsInfo.ease + 0.15);
            break;
    }

    // 计算下次复习时间（转换为毫秒）
    srsInfo.nextReview = now + (srsInfo.interval * 60 * 1000);
    srsInfo.lastReview = now;
    srsInfo.reviewCount = (srsInfo.reviewCount || 0) + 1;

    console.log('Updated SRS info:', {
        difficulty,
        difficultyKey,
        interval: srsInfo.interval,
        nextReview: new Date(srsInfo.nextReview).toLocaleString(),
        ease: srsInfo.ease
    });

    return srsInfo;
}
