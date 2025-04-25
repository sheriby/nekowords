let currentQuestion = null;
let correctCount = 0;
let wrongCount = 0;
let answeredQuestions = new Set(); // 用于记录已正确回答的题目
let allQuestions = []; // 存储所有题目
let wrongAnswers = []; // 存储答错的题目

function getQuestionTypeText(type) {
    switch (type) {
        case 'japanese_to_chinese':
            return '请写出以下日语单词的中文意思：';
        case 'chinese_to_japanese':
            return '请写出以下中文对应的日语单词：';
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
    historyItem.className = `history-item ${isCorrect ? 'correct' : 'incorrect'}`;

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

        // 隐藏文件上传区域，显示答题区域
        document.querySelector('.file-upload').style.display = 'none';
        document.querySelector('.question-container').style.display = 'block';

        nextQuestion();
    } catch (error) {
        console.error('加载题目失败:', error);
        alert('加载题目失败，请重试');
    }
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
    const isCorrect = userAnswer === currentQuestion.answer;

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
            a.download = 'wrong_answers.txt';
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

// 监听回车键
document.getElementById('answer').addEventListener('keypress', function (e) {
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