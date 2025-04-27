let currentQuestion = null;
let correctCount = 0;
let wrongCount = 0;
let answeredQuestions = new Set(); // 用于记录已正确回答的题目
let allQuestions = []; // 存储所有题目
let wrongAnswers = []; // 存储答错的题目
let currentMode = 'input'; // 默认为输入模式
let flashcardState = 'front'; // 记忆卡状态：front或back
let srsData = new Map(); // 存储SRS数据

// SRS间隔设置（单位：分钟）
const SRS_INTERVALS = {
    again: 1,     // 重来：1分钟后
    hard: 6,      // 困难：6分钟后
    good: 10,     // 良好：10分钟后
    easy: 5760    // 简单：4天后
};

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
                srsData.set(q.question, {
                    nextReview: Date.now(),
                    interval: 0,
                    ease: 1.0
                });
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
            srsInfo.ease = Math.max(1.0, srsInfo.ease - 0.3);
            break;
        case '困难':
            srsInfo.interval = SRS_INTERVALS.hard;
            srsInfo.ease = Math.max(1.0, srsInfo.ease - 0.2);
            break;
        case '良好':
            srsInfo.interval = SRS_INTERVALS.good;
            break;
        case '简单':
            srsInfo.interval = SRS_INTERVALS.easy;
            srsInfo.ease = Math.min(2.5, srsInfo.ease + 0.2);
            break;
    }

    srsInfo.nextReview = now + (srsInfo.interval * 60 * 1000);
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

// 监听文件选择
document.getElementById('loadFiles').addEventListener('click', function () {
    const files = document.getElementById('wordFiles').files;
    if (files.length === 0) {
        alert('请选择至少一个单词文件');
        return;
    }
    loadQuestionsFromFiles(files);
});

// 监听导出按钮
document.getElementById('exportWrongAnswers').addEventListener('click', exportWrongAnswers);

// 页面加载时隐藏答题区域
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.question-container').style.display = 'none';
}); 
