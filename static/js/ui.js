/**
 * UI manipulation functions
 */

/**
 * Update statistics display
 *
 * @param {number} correctCount - Number of correct answers
 * @param {number} wrongCount - Number of wrong answers
 */
export function updateStats(correctCount, wrongCount) {
    const correctCountElement = document.getElementById('correct-count');
    const wrongCountElement = document.getElementById('wrong-count');

    if (correctCountElement) correctCountElement.textContent = correctCount;
    if (wrongCountElement) wrongCountElement.textContent = wrongCount;
}

/**
 * Add a history item to the history container
 *
 * @param {Object} currentQuestion - Current question object
 * @param {string} userAnswer - User's answer
 * @param {string} correctAnswer - Correct answer
 * @param {boolean} isCorrect - Whether the answer is correct
 */
export function addHistoryItem(currentQuestion, userAnswer, correctAnswer, isCorrect) {
    const historyContainer = document.getElementById('history');
    historyContainer.innerHTML = ''; // 清空历史记录，只保留最新的一条

    const historyItem = document.createElement('div');
    historyItem.className = `history-item`; // 先不添加correct/incorrect类

    // 如果是中文到日语的题目，在正确答案后面添加假名（如果不是全假名单词）
    let displayAnswer = correctAnswer;
    if (currentQuestion.type === 'chinese_to_japanese' && currentQuestion.kana && !currentQuestion.is_kana) {
        displayAnswer = `${correctAnswer}（${currentQuestion.kana}）`;
    }

    historyItem.innerHTML = `
        <div class="history-question">${currentQuestion.question}</div>
        <div class="history-answer">
            ${isCorrect
            ? `<span>答案: ${displayAnswer}</span>`
            : `<span>你的答案: ${userAnswer}</span>
               <span>正确答案: ${displayAnswer}</span>`
        }
        </div>
    `;

    historyContainer.appendChild(historyItem);

    // 使用 requestAnimationFrame 确保动画重置
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            historyItem.classList.add(isCorrect ? 'correct' : 'incorrect');
        });
    });
}

/**
 * Show wrong answers in the history container
 *
 * @param {Array} wrongAnswers - Array of wrong answer objects
 */
export function showWrongAnswers(wrongAnswers) {
    const historyContainer = document.getElementById('history');
    const questionContainer = document.querySelector('.question-container');
    const exportContainer = document.querySelector('.export-container');

    // 隐藏答题框
    if (questionContainer) questionContainer.style.display = 'none';
    if (exportContainer) exportContainer.style.display = 'block';

    if (!historyContainer) return;
    historyContainer.innerHTML = '<div class="wrong-answers-title">答错的题目：</div>';

    wrongAnswers.forEach(item => {
        const wrongItem = document.createElement('div');
        wrongItem.className = 'wrong-answer-item';

        // 如果是中文到日语的题目，在正确答案后面添加假名（如果不是全假名单词）
        let displayAnswer = item.correctAnswer;
        if (item.type === 'chinese_to_japanese' && item.kana && !item.is_kana) {
            displayAnswer = `${item.correctAnswer}（${item.kana}）`;
        }

        wrongItem.innerHTML = `
            <div class="wrong-question">${item.question}</div>
            <div class="wrong-answer">你的答案: ${item.userAnswer}</div>
            <div class="wrong-answer">正确答案: ${displayAnswer}</div>
        `;
        historyContainer.appendChild(wrongItem);
    });
}

/**
 * Get question type text based on question type
 *
 * @param {string} type - Question type
 * @returns {string} - Question type text
 */
export function getQuestionTypeText(type) {
    switch (type) {
        case 'japanese_to_chinese':
            return 'JP  ➡️  CN';
        case 'chinese_to_japanese':
            return 'CN  ➡️  JP';
        default:
            return '';
    }
}

/**
 * Show home screen and hide other containers
 */
export function showHomeScreen() {
    // 获取所有容器元素
    const questionContainer = document.querySelector('.question-container');
    const flashcardContainer = document.querySelector('.flashcard-container');
    const exportContainer = document.querySelector('.export-container');
    const importButton = document.querySelector('.import-button');
    const deckList = document.querySelector('.deck-list');
    const header = document.querySelector('.header');

    // 隐藏所有学习相关的容器
    if (questionContainer) questionContainer.style.display = 'none';
    if (flashcardContainer) flashcardContainer.style.display = 'none';
    if (exportContainer) exportContainer.style.display = 'none';

    // 显示词单管理区域
    if (importButton) importButton.style.display = 'flex';
    if (deckList) deckList.style.display = 'block';
    if (header) header.style.display = 'block';
}

/**
 * Show flashcard screen and hide other containers
 */
export function showFlashcardScreen() {
    const questionContainer = document.querySelector('.question-container');
    const flashcardContainer = document.querySelector('.flashcard-container');
    const statsElement = document.querySelector('.stats');
    const deckList = document.querySelector('.deck-list');
    const header = document.querySelector('.header');
    const importButton = document.querySelector('.import-button');

    // 隐藏问题容器
    if (questionContainer) questionContainer.style.display = 'none';

    // 显示记忆卡容器
    if (flashcardContainer) flashcardContainer.style.display = 'block';

    // 隐藏统计信息（如果存在）
    if (statsElement) statsElement.style.display = 'none';

    // 隐藏词单管理区域
    if (deckList) deckList.style.display = 'none';
    if (header) header.style.display = 'none';
    if (importButton) importButton.style.display = 'none';
}

/**
 * Show quiz screen and hide other containers
 */
export function showQuizScreen() {
    const flashcardContainer = document.querySelector('.flashcard-container');
    const questionContainer = document.querySelector('.question-container');
    const deckList = document.querySelector('.deck-list');
    const header = document.querySelector('.header');
    const importButton = document.querySelector('.import-button');

    // 隐藏记忆卡容器
    if (flashcardContainer) flashcardContainer.style.display = 'none';

    // 显示问题容器
    if (questionContainer) questionContainer.style.display = 'block';

    // 隐藏词单管理区域
    if (deckList) deckList.style.display = 'none';
    if (header) header.style.display = 'none';
    if (importButton) importButton.style.display = 'none';
}
