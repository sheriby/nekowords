/**
 * Main application logic and initialization
 */

import { loadAndRenderDecks, handleFileUpload } from './deck.js';
import { showHomeScreen } from './ui.js';
import { resetFlashcardState, flipFlashcard, getFlashcardState, handleDifficultyRating } from './flashcard.js';
import { resetQuizState, exportWrongAnswers } from './quiz.js';

// Current mode ('input' or 'flashcard')
let currentMode = 'input';

/**
 * Initialize the application
 */
function initApp() {
    // Load decks
    loadAndRenderDecks();

    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // File input for importing decks
    const fileInput = document.getElementById('deckFile');
    if (fileInput) {
        fileInput.removeEventListener('change', handleFileUpload);
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Export wrong answers button
    const exportButton = document.getElementById('exportWrongAnswers');
    if (exportButton) {
        exportButton.removeEventListener('click', exportWrongAnswers);
        exportButton.addEventListener('click', exportWrongAnswers);
    }

    // Back to home button
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.removeEventListener('click', backToHome);
        button.addEventListener('click', backToHome);
    });

    // Mode selection radios
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.removeEventListener('change', handleModeChange);
        radio.addEventListener('change', handleModeChange);
    });

    // Keyboard events
    setupKeyboardEvents();
}

/**
 * Set up keyboard event listeners
 */
function setupKeyboardEvents() {
    // Remove existing listeners
    document.removeEventListener('keypress', handleKeyPress);

    // Add new listener
    document.addEventListener('keypress', handleKeyPress);
}

// 用于防止重复处理的标志
let isProcessingKeyPress = false;

/**
 * Handle keyboard events
 *
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyPress(e) {
    // 防止重复处理
    if (isProcessingKeyPress) {
        console.log('Already processing a key press, ignoring this one');
        return;
    }

    // 设置标志
    isProcessingKeyPress = true;

    try {
        // 获取当前可见的容器来判断模式
        const flashcardContainer = document.querySelector('.flashcard-container');
        const isFlashcardMode = flashcardContainer && flashcardContainer.style.display === 'block';

        // Flashcard mode keyboard shortcuts
        if (isFlashcardMode) {
            const flashcardState = getFlashcardState();

            if (flashcardState === 'front' && e.key === 'Enter') {
                console.log('Flipping flashcard with Enter key');
                flipFlashcard();
            } else if (flashcardState === 'back') {
                console.log(`Handling difficulty key: ${e.key}`);
                let difficultyButton = null;

                switch (e.key.toLowerCase()) {
                    case 'a':
                        difficultyButton = document.querySelector('.difficulty-btn.again');
                        break;
                    case 'b':
                        difficultyButton = document.querySelector('.difficulty-btn.hard');
                        break;
                    case 'c':
                        difficultyButton = document.querySelector('.difficulty-btn.good');
                        break;
                    case 'd':
                        difficultyButton = document.querySelector('.difficulty-btn.easy');
                        break;
                }

                if (difficultyButton) {
                    console.log('Clicking difficulty button:', difficultyButton);
                    difficultyButton.click();
                }
            }
        }

        // 输入模式的回车键处理
        const questionContainer = document.querySelector('.question-container');
        const isQuizMode = questionContainer && questionContainer.style.display === 'block';

        if (isQuizMode && e.key === 'Enter') {
            const answerInput = document.getElementById('answer');
            if (answerInput && document.activeElement === answerInput) {
                // 如果焦点在答案输入框上，触发检查答案
                const checkAnswerEvent = new Event('checkAnswer');
                document.dispatchEvent(checkAnswerEvent);
            }
        }
    } finally {
        // 重置标志
        setTimeout(() => {
            isProcessingKeyPress = false;
        }, 100); // 添加一个小延迟，防止事件触发太快
    }
}

/**
 * Handle mode change
 *
 * @param {Event} e - Change event
 */
function handleModeChange(e) {
    currentMode = e.target.value;
}

/**
 * Go back to home screen
 */
function backToHome() {
    // Reset state
    resetFlashcardState();
    resetQuizState();

    // Show home screen
    showHomeScreen();

    // Reload decks
    loadAndRenderDecks();
}

// Make functions available globally
window.backToHome = backToHome;
window.flipFlashcard = flipFlashcard; // 确保flipFlashcard可以全局访问

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // 初始化应用
    initApp();

    // 设置键盘事件监听器
    setupKeyboardEvents();

    // 设置flashcard点击事件
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.addEventListener('click', flipFlashcard);
    }
});
