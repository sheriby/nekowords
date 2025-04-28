/**
 * Configuration constants for the application
 */

// SRS intervals in minutes
export const SRS_INTERVALS = {
    again: 1,          // 重来：1分钟后
    hard: {
        initial: 5,    // 初始：5分钟
        min: 5,        // 最小：5分钟
        max: 4320      // 最大：3天
    },
    good: {
        initial: 10,   // 初始：10分钟
        min: 10,       // 最小：10分钟
        max: 10080     // 最大：7天
    },
    easy: {
        initial: 240,  // 初始：4小时
        min: 240,      // 最小：4小时
        max: 43200     // 最大：30天
    }
};
