let currentQuestion = null;
let correctCount = 0;
let wrongCount = 0;
let answeredQuestions = new Set(); // 用于记录已正确回答的题目
let allQuestions = []; // 存储所有题目
let wrongAnswers = []; // 存储答错的题目
let currentMode = 'input'; // 默认为输入模式
let flashcardState = 'front'; // 记忆卡状态：front或back
let srsData = new Map(); // 存储SRS数据
let currentDeckId = null;

// SRS间隔设置（单位：分钟）
const SRS_INTERVALS = {
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

function calculateNextInterval(currentInterval, ease, difficulty) {
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

function getQuestionTypeText(type) {
    switch (type) {
        case 'japanese_to_chinese':
            return 'JP  ➡️  CN';
        case 'chinese_to_japanese':
            return 'CN  ➡️  JP';
        default:
            return '';
    }
}

function updateStats() {
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('wrong-count').textContent = wrongCount;
}

function addHistoryItem(question, userAnswer, correctAnswer, isCorrect) {
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
        <div class="history-question">${question}</div>
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

function showWrongAnswers() {
    const historyContainer = document.getElementById('history');
    const questionContainer = document.querySelector('.question-container');
    const exportContainer = document.querySelector('.export-container');
    const fileUpload = document.querySelector('.file-upload');

    // 隐藏答题框
    questionContainer.style.display = 'none';
    fileUpload.style.display = 'none';
    exportContainer.style.display = 'block';

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

async function loadQuestionsFromFiles(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('files[]', file);
    }
    formData.append('mode', currentMode);

    try {
        const response = await fetch('/get_all_questions', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        allQuestions = data;

        // 初始化SRS数据
        allQuestions.forEach(q => {
            if (currentMode === 'flashcard') {
                srsData.set(q.question, q.srs_info);
            }
        });

        // 隐藏文件上传区域和模式选择，显示答题区域
        document.querySelector('.file-upload').style.display = 'none';
        document.getElementById('modeSelection').style.display = 'none';
        document.querySelector('.question-container').style.display = 'block';

        if (currentMode === 'flashcard') {
            setupFlashcardMode();
        } else {
            nextQuestion();
        }
    } catch (error) {
        console.error('加载题目失败:', error);
        alert('加载题目失败，请重试');
    }
}

function setupFlashcardMode() {
    document.querySelector('.question-container').style.display = 'none';
    document.querySelector('.flashcard-container').style.display = 'block';
    document.querySelector('.stats').style.display = 'none';

    // 添加事件监听器
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', handleDifficultyRating);
    });

    nextFlashcard();
}

function nextFlashcard() {
    const now = Date.now();
    const availableQuestions = allQuestions.filter(q => {
        const srsInfo = srsData.get(q.question);
        return srsInfo.nextReview <= now;
    });

    if (availableQuestions.length === 0) {
        alert('所有单词都已复习完成！');
        backToHome();
        return;
    }

    // 随机选择题目
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestion = availableQuestions[randomIndex];
    flashcardState = 'front';

    const flashcard = document.getElementById('flashcard');
    flashcard.textContent = currentQuestion.question;

    const answerContainer = document.getElementById('flashcard-answer');
    const answerDiv = answerContainer.querySelector('.history-answer');

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
    document.getElementById('difficultyButtons').style.visibility = 'hidden';
}

function flipFlashcard() {
    if (flashcardState === 'front') {
        const answerContainer = document.getElementById('flashcard-answer');
        answerContainer.style.visibility = 'visible';
        document.getElementById('difficultyButtons').style.visibility = 'visible';
        flashcardState = 'back';
    }
}

function handleDifficultyRating(e) {
    const difficulty = e.target.textContent;
    const srsInfo = srsData.get(currentQuestion.question);
    const now = Date.now();

    // 更新SRS数据
    switch (difficulty) {
        case '重来':
            srsInfo.interval = SRS_INTERVALS.again;
            srsInfo.ease = Math.max(1.3, srsInfo.ease - 0.3);
            break;
        case '困难':
            srsInfo.interval = calculateNextInterval(srsInfo.interval, srsInfo.ease, 'hard');
            srsInfo.ease = Math.max(1.3, srsInfo.ease - 0.15);
            break;
        case '良好':
            srsInfo.interval = calculateNextInterval(srsInfo.interval, srsInfo.ease, 'good');
            // 良好不改变ease
            break;
        case '简单':
            srsInfo.interval = calculateNextInterval(srsInfo.interval, srsInfo.ease, 'easy');
            srsInfo.ease = Math.min(2.5, srsInfo.ease + 0.15);
            break;
    }

    // 计算下次复习时间（转换为毫秒）
    srsInfo.nextReview = now + (srsInfo.interval * 60 * 1000);
    srsInfo.lastReview = now;

    // 保存SRS数据到后端
    fetch('/update_srs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            srs_record_id: srsInfo.srs_record_id,
            srs_info: srsInfo,
            deck_id: currentDeckId
        })
    });

    nextFlashcard();
}

function nextQuestion() {
    if (allQuestions.length === 0) return;

    // 如果所有题目都已正确回答，显示错题
    if (answeredQuestions.size === allQuestions.length) {
        showWrongAnswers();
        return;
    }

    // 从未正确回答的题目中随机选择
    const availableQuestions = allQuestions.filter(q => !answeredQuestions.has(q.question));
    if (availableQuestions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestion = availableQuestions[randomIndex];

    document.getElementById('question-type').textContent = getQuestionTypeText(currentQuestion.type);
    document.getElementById('question').textContent = currentQuestion.question;
    document.getElementById('answer').value = '';
    document.getElementById('answer').focus();
}

function checkAnswer() {
    if (!currentQuestion) return;

    const userAnswer = document.getElementById('answer').value.trim();
    const isCorrect = userAnswer === 'skip' || userAnswer === currentQuestion.answer;

    if (isCorrect) {
        correctCount++;
        answeredQuestions.add(currentQuestion.question);
    } else {
        wrongCount++;
        wrongAnswers.push({
            question: currentQuestion.question,
            userAnswer: userAnswer,
            correctAnswer: currentQuestion.answer,
            type: currentQuestion.type,
            kana: currentQuestion.kana,
            is_kana: currentQuestion.is_kana
        });
    }

    updateStats();
    addHistoryItem(currentQuestion.question, userAnswer, currentQuestion.answer, isCorrect);
    nextQuestion();
}

async function exportWrongAnswers() {
    try {
        const response = await fetch('/export_wrong_answers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ wrong_answers: wrongAnswers })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wrong_answers.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            const data = await response.json();
            alert(data.error || '导出失败');
        }
    } catch (error) {
        console.error('导出错题失败:', error);
        alert('导出错题失败，请重试');
    }
}

// 监听模式切换
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if (allQuestions.length > 0) {
            if (currentMode === 'flashcard') {
                setupFlashcardMode();
            } else {
                setupInputMode();
            }
        }
    });
});

// 全局监听回车键
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && currentMode === 'flashcard' && flashcardState === 'front') {
        flipFlashcard();
    }
});

// 监听键盘事件
document.addEventListener('keypress', function (e) {
    if (currentMode === 'flashcard' && flashcardState === 'back') {
        switch (e.key.toLowerCase()) {
            case 'a':
                document.querySelector('.difficulty-btn.again').click();
                break;
            case 'b':
                document.querySelector('.difficulty-btn.hard').click();
                break;
            case 'c':
                document.querySelector('.difficulty-btn.good').click();
                break;
            case 'd':
                document.querySelector('.difficulty-btn.easy').click();
                break;
        }
    }
});

function setupInputMode() {
    const questionContainer = document.querySelector('.question-container');
    questionContainer.innerHTML = `
        <div id="question-type" class="question-type"></div>
        <div id="question" class="question"></div>
        <div class="input-container">
            <input type="text" id="answer" autocomplete="off">
        </div>
    `;
    document.getElementById('answer').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });
    nextQuestion();
}

// 监听回车键
document.getElementById('answer')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});


// 页面加载时隐藏答题区域
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.question-container').style.display = 'none';
});

// 加载词单列表
async function loadDecks() {
    try {
        const response = await fetch('/get_decks');
        const decks = await response.json();
        const decksContainer = document.getElementById('decks');
        decksContainer.innerHTML = '';

        if (decks.length === 0) {
            decksContainer.innerHTML = '<div class="empty-deck">暂无词单，请导入</div>';
            return;
        }

        decks.forEach(deck => {
            const deckElement = document.createElement('div');
            deckElement.className = 'deck-item';
            deckElement.innerHTML = `
                <div class="deck-info">
                    <span class="deck-name">${deck.name}</span>
                    <span class="deck-progress">${deck.memory_cnt}/${deck.total}</span>
                </div>
                <div class="deck-actions">
                    <button onclick="startDeck(${deck.id})">开始记忆</button>
                    <button onclick="deleteDeck(${deck.id})" class="delete-btn">删除</button>
                </div>
            `;
            decksContainer.appendChild(deckElement);
        });
    } catch (error) {
        console.error('加载词单失败:', error);
        alert('加载词单失败，请重试');
    }
}

// 开始记忆词单
async function startDeck(deckId) {
    currentDeckId = deckId;
    try {
        const response = await fetch('/get_deck_words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deck_id: deckId })
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        allQuestions = data;
        srsData.clear();

        // 初始化SRS数据
        allQuestions.forEach(q => {
            srsData.set(q.question, q.srs_info);
        });

        // 隐藏词单管理区域，显示记忆卡区域
        document.querySelector('.deck-list').style.display = 'none';
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.import-button').style.display = 'none';
        document.querySelector('.flashcard-container').style.display = 'block';

        nextFlashcard();
    } catch (error) {
        console.error('加载词单单词失败:', error);
        alert('加载词单单词失败，请重试');
    }
}

// 返回主页
function backToHome() {
    // 隐藏所有学习相关的容器
    document.querySelector('.question-container').style.display = 'none';
    document.querySelector('.flashcard-container').style.display = 'none';
    document.querySelector('.export-container').style.display = 'none';

    // 显示词单管理区域
    document.querySelector('.import-button').style.display = 'flex';
    document.querySelector('.deck-list').style.display = 'block';
    document.querySelector('.header').style.display = 'block';

    // 重置状态
    currentQuestion = null;
    correctCount = 0;
    wrongCount = 0;
    answeredQuestions.clear();
    allQuestions = [];
    wrongAnswers = [];
    currentMode = 'input';
    flashcardState = 'front';
    srsData.clear();
    currentDeckId = null;

    // 重新加载词单列表
    loadDecks();
}

// 页面加载时加载词单列表
document.addEventListener('DOMContentLoaded', () => {
    loadDecks();

    // 导入词单
    const fileInput = document.getElementById('deckFile');
    if (fileInput) {
        // 移除可能存在的旧事件监听器
        fileInput.removeEventListener('change', handleFileUpload);
        // 添加新的事件监听器
        fileInput.addEventListener('change', handleFileUpload);
    }
});

// 处理多文件上传
async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    try {
        const response = await fetch('/import_decks', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        alert(`成功导入 ${data.success_count} 个词单，共 ${data.total_words} 个单词`);
        event.target.value = ''; // 清空文件选择
        loadDecks(); // 重新加载词单列表
    } catch (error) {
        console.error('导入词单失败:', error);
        alert('导入词单失败，请重试');
    }
}

// 删除词单
async function deleteDeck(deckId) {
    if (!confirm('确定要删除这个词单吗？')) {
        return;
    }

    try {
        const response = await fetch('/delete_deck', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deck_id: deckId })
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        alert('词单删除成功');
        loadDecks(); // 重新加载词单列表
    } catch (error) {
        console.error('删除词单失败:', error);
        alert('删除词单失败，请重试');
    }
}

// 监听记忆卡点击
document.getElementById('flashcard').addEventListener('click', flipFlashcard);

// 监听难度按钮点击
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', handleDifficultyRating);
});

// 监听键盘事件
document.addEventListener('keypress', function (e) {
    if (flashcardState === 'front') {
        if (e.key === 'Enter') {
            flipFlashcard();
        }
    } else {
        switch (e.key.toLowerCase()) {
            case 'a':
                document.querySelector('.difficulty-btn.again').click();
                break;
            case 'b':
                document.querySelector('.difficulty-btn.hard').click();
                break;
            case 'c':
                document.querySelector('.difficulty-btn.good').click();
                break;
            case 'd':
                document.querySelector('.difficulty-btn.easy').click();
                break;
        }
    }
});

// 删除词单
async function deleteDeck(deckId) {
    if (!confirm('确定要删除这个词单吗？')) {
        return;
    }

    try {
        const response = await fetch('/delete_deck', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deck_id: deckId })
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        alert('词单删除成功');
        loadDecks(); // 重新加载词单列表
    } catch (error) {
        console.error('删除词单失败:', error);
        alert('删除词单失败，请重试');
    }
}
// 初始化新单词的SRS信息
function initializeSRSInfo() {
    return {
        nextReview: 0,
        interval: 0,
        ease: 2.5,  // 初始难度系数
        lastReview: 0,
        reviewCount: 0  // 添加复习次数计数
    };
}
