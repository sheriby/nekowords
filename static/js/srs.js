/**
 * SRS (Spaced Repetition System) related functionality
 * Now using FSRS (Free Spaced Repetition Scheduler) algorithm
 */

import {
    initializeFSRSInfo,
    updateFSRSInfo,
    convertFSRSToSRSFormat,
    convertSRSToFSRSFormat
} from './fsrs.js';

/**
 * Initialize SRS information for a new word
 *
 * @returns {Object} - SRS information object
 */
export function initializeSRSInfo() {
    // 使用 FSRS 初始化，但转换为兼容的格式
    const fsrsInfo = initializeFSRSInfo();
    return convertFSRSToSRSFormat(fsrsInfo);
}

/**
 * Update SRS information based on difficulty rating
 *
 * @param {Object} srsInfo - SRS information object
 * @param {string} difficulty - Difficulty level ('重来', '困难', '良好', or '简单')
 * @returns {Object} - Updated SRS information object
 */
export function updateSRSInfo(srsInfo, difficulty) {
    // 去除难度级别中的键盘快捷键提示，例如 "简单(D)" -> "简单"
    const cleanDifficulty = difficulty.replace(/\([A-Z]\)$/, '');

    console.log('Original difficulty:', difficulty);
    console.log('Cleaned difficulty:', cleanDifficulty);

    // 将 SRS 信息转换为 FSRS 格式
    const fsrsInfo = convertSRSToFSRSFormat(srsInfo);

    // 使用 FSRS 算法更新信息
    const updatedFsrsInfo = updateFSRSInfo(fsrsInfo, cleanDifficulty);

    // 将更新后的 FSRS 信息转换回兼容的 SRS 格式
    const updatedSrsInfo = convertFSRSToSRSFormat(updatedFsrsInfo);

    console.log('Updated SRS info:', {
        difficulty: cleanDifficulty,
        interval: updatedSrsInfo.interval,
        nextReview: new Date(updatedSrsInfo.nextReview).toLocaleString(),
        ease: updatedSrsInfo.ease
    });

    return updatedSrsInfo;
}
