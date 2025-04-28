/**
 * Flashcard mode functionality
 */

import { loadDeckWords, updateSRSData } from './api.js';
import { updateSRSInfo } from './srs.js';
import { showFlashcardScreen, showHomeScreen } from './ui.js';

// State variables
let currentQuestion = null;
let allQuestions = [];
let srsData = new Map();
let currentDeckId = null;
let flashcardState = 'front';
let currentQuestionIndex = 0;
let isLoadingQuestions = false;

/**
 * Start flashcard mode with a specific deck
 *
 * @param {number} deckId - Deck ID
 */
export async function startFlashcardMode(deckId) {
    currentDeckId = deckId;

    try {
        // 重置状态
        allQuestions = [];
        srsData.clear();
        isLoadingQuestions = false;
        currentQuestionIndex = 0; // 重置当前题目索引

        // Show flashcard screen
        showFlashcardScreen();

        // Add event listeners
        setupEventListeners();

        // 加载题目
        await loadQuestions();

        // Show first flashcard
        nextFlashcard();
    } catch (error) {
        console.error('Error starting flashcard mode:', error);
        throw error;
    }
}

/**
 * 随机打乱数组顺序（Fisher-Yates 洗牌算法）
 *
 * @param {Array} array - 要打乱的数组
 * @returns {Array} - 打乱后的数组
 */
function shuffleArray(array) {
    const shuffled = [...array]; // 创建数组的副本
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // 交换元素
    }
    return shuffled;
}

/**
 * Load questions from the server
 */
async function loadQuestions() {
    if (isLoadingQuestions) return;

    isLoadingQuestions = true;

    try {
        console.log('Loading questions...');
        const questions = await loadDeckWords(currentDeckId, 20); // 一次加载20个题目

        console.log(`Loaded ${questions.length} questions`);

        // 重置题目列表和索引
        allQuestions = [];
        currentQuestionIndex = 0;

        if (questions.length === 0) {
            console.log('No questions to review');
            isLoadingQuestions = false;
            return;
        }

        // 处理每个题目的SRS数据
        questions.forEach(q => {
            // 确保SRS信息存在且有效
            if (!q.srs_info || typeof q.srs_info !== 'object') {
                console.warn('Invalid SRS info for question:', q.question);
                q.srs_info = {
                    srs_record_id: null,
                    nextReview: 0,
                    interval: 0,
                    ease: 2.5,
                    lastReview: 0
                };
            }

            // 确保nextReview是一个有效的数字
            if (isNaN(q.srs_info.nextReview)) {
                console.warn('Invalid nextReview for question:', q.question);
                q.srs_info.nextReview = 0;
            }

            // 确保interval是一个有效的数字
            if (isNaN(q.srs_info.interval)) {
                console.warn('Invalid interval for question:', q.question);
                q.srs_info.interval = 0;
            }

            // 添加到SRS数据映射
            srsData.set(q.question, q.srs_info);
        });

        // 随机打乱题目顺序
        const shuffledQuestions = shuffleArray(questions);
        console.log('Questions shuffled');

        // 将打乱后的题目添加到全局题目列表
        allQuestions = shuffledQuestions;
    } catch (error) {
        console.error('Error loading questions:', error);
    } finally {
        isLoadingQuestions = false;
    }
}

/**
 * Set up event listeners for flashcard mode
 */
function setupEventListeners() {
    // Flashcard click event
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.removeEventListener('click', flipFlashcard);
        flashcard.addEventListener('click', flipFlashcard);
    }

    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.removeEventListener('click', handleDifficultyRating);
        btn.addEventListener('click', handleDifficultyRating);
    });

    // 确保全局可以访问flipFlashcard函数
    if (typeof window !== 'undefined') {
        window.flipFlashcard = flipFlashcard;
    }

    // 注意：键盘事件监听器已移至app.js中统一处理
}

/**
 * Show the next flashcard
 */
export async function nextFlashcard() {
    console.log('Next flashcard, current index:', currentQuestionIndex);

    // 如果已经显示完当前批次的所有题目，重新加载题目
    if (currentQuestionIndex >= allQuestions.length) {
        console.log('All current questions shown, loading new questions...');
        await loadQuestions();

        // 如果加载后仍然没有题目，则结束学习
        if (allQuestions.length === 0) {
            alert('所有单词都已复习完成！');
            showHomeScreen();
            return;
        }
    }

    // 再次检查是否有题目可以显示
    if (allQuestions.length === 0 || currentQuestionIndex >= allQuestions.length) {
        console.log('No questions to show');
        alert('所有单词都已复习完成！');
        showHomeScreen();
        return;
    }

    // 按顺序获取下一个题目
    currentQuestion = allQuestions[currentQuestionIndex];
    currentQuestionIndex++;
    flashcardState = 'front';

    console.log('Showing question:', currentQuestion.question);

    const flashcard = document.getElementById('flashcard');
    if (!flashcard) {
        console.error('Flashcard element not found');
        return;
    }
    flashcard.textContent = currentQuestion.question;

    const answerContainer = document.getElementById('flashcard-answer');
    if (!answerContainer) {
        console.error('Answer container element not found');
        return;
    }

    const answerDiv = answerContainer.querySelector('.history-answer');
    if (!answerDiv) {
        console.error('Answer div element not found');
        return;
    }

    // 根据题目类型设置答案
    let answerContent = '';
    switch (currentQuestion.type) {
        case 'japanese_to_others':
            if (!currentQuestion.is_kana) {
                answerContent += `${currentQuestion.kana}<br>`;
            }
            answerContent += `${currentQuestion.chinese}`;
            break;
        case 'kana_to_others':
            answerContent = `${currentQuestion.japanese}<br>${currentQuestion.chinese}`;
            break;
        case 'chinese_to_others':
            answerContent = `${currentQuestion.japanese}`;
            if (!currentQuestion.is_kana) {
                answerContent += `<br>${currentQuestion.kana}`;
            }
            break;
    }

    answerDiv.innerHTML = answerContent;
    answerContainer.style.visibility = 'hidden';

    const difficultyButtons = document.getElementById('difficultyButtons');
    if (difficultyButtons) {
        difficultyButtons.style.visibility = 'hidden';
    }
}

/**
 * Flip the flashcard to show the answer
 */
export function flipFlashcard() {
    if (flashcardState === 'front') {
        const answerContainer = document.getElementById('flashcard-answer');
        if (answerContainer) {
            answerContainer.style.visibility = 'visible';
        }

        const difficultyButtons = document.getElementById('difficultyButtons');
        if (difficultyButtons) {
            difficultyButtons.style.visibility = 'visible';
        }

        flashcardState = 'back';
    }
}

// 用于防止重复处理的标志
let isProcessingDifficulty = false;

/**
 * Handle difficulty rating button click
 *
 * @param {Event} e - Click event
 */
export async function handleDifficultyRating(e) {
    // 防止重复处理
    if (isProcessingDifficulty) {
        console.log('Already processing a difficulty rating, ignoring this one');
        return;
    }

    // 设置标志
    isProcessingDifficulty = true;

    try {
        console.log('Processing difficulty rating:', e.target.textContent);
        const difficulty = e.target.textContent;
        const srsInfo = srsData.get(currentQuestion.question);

        // Update SRS data
        updateSRSInfo(srsInfo, difficulty);

        // Save SRS data to server
        try {
            await updateSRSData(srsInfo.srs_record_id, srsInfo, currentDeckId);
            await nextFlashcard(); // 使用await等待nextFlashcard完成
        } catch (error) {
            alert(error.message);
        }
    } finally {
        // 重置标志，添加一个小延迟，防止事件触发太快
        setTimeout(() => {
            isProcessingDifficulty = false;
        }, 500);
    }
}

/**
 * Get the current flashcard state
 *
 * @returns {string} - Current flashcard state ('front' or 'back')
 */
export function getFlashcardState() {
    return flashcardState;
}

/**
 * Reset flashcard mode state
 */
export function resetFlashcardState() {
    currentQuestion = null;
    allQuestions = [];
    srsData.clear();
    currentDeckId = null;
    flashcardState = 'front';
    currentQuestionIndex = 0;
    isLoadingQuestions = false;
}
