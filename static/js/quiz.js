/**
 * Quiz/input mode functionality
 */

import { getQuestionTypeText, addHistoryItem, showWrongAnswers, updateStats, showQuizScreen } from './ui.js';
import { exportWrongAnswers as apiExportWrongAnswers } from './api.js';

// State variables
let currentQuestion = null;
let correctCount = 0;
let wrongCount = 0;
let answeredQuestions = new Set();
let allQuestions = [];
let wrongAnswers = [];

/**
 * Initialize quiz mode
 *
 * @param {Array} questions - Array of question objects
 */
export function initQuizMode(questions) {
    // Reset state
    currentQuestion = null;
    correctCount = 0;
    wrongCount = 0;
    answeredQuestions.clear();
    wrongAnswers = [];

    // Set questions
    allQuestions = questions;

    // Show quiz screen
    showQuizScreen();

    // Set up input mode
    setupInputMode();

    // Show first question
    nextQuestion();
}

/**
 * Set up input mode
 */
function setupInputMode() {
    const questionContainer = document.querySelector('.question-container');
    if (!questionContainer) return;

    questionContainer.innerHTML = `
        <button class="back-button" onclick="backToHome()">返回主页</button>
        <div id="question-type" class="question-type"></div>
        <div id="question" class="question"></div>
        <div class="input-container">
            <input type="text" id="answer" autocomplete="off">
        </div>
        <div id="history" class="history"></div>
    `;

    // Add event listener to answer input
    const answerInput = document.getElementById('answer');
    if (answerInput) {
        answerInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                checkAnswer();
            }
        });
    }

    // Add global event listener for checkAnswer event
    document.addEventListener('checkAnswer', function () {
        checkAnswer();
    });
}

/**
 * Show the next question
 */
export function nextQuestion() {
    if (allQuestions.length === 0) return;

    // 如果所有题目都已正确回答，显示错题
    if (answeredQuestions.size === allQuestions.length) {
        showWrongAnswers(wrongAnswers);
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

/**
 * Check the user's answer
 */
export function checkAnswer() {
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

    updateStats(correctCount, wrongCount);
    addHistoryItem(currentQuestion, userAnswer, currentQuestion.answer, isCorrect);
    nextQuestion();
}

/**
 * Export wrong answers to a CSV file
 */
export async function exportWrongAnswers() {
    try {
        await apiExportWrongAnswers(wrongAnswers);
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Reset quiz mode state
 */
export function resetQuizState() {
    currentQuestion = null;
    correctCount = 0;
    wrongCount = 0;
    answeredQuestions.clear();
    allQuestions = [];
    wrongAnswers = [];
}
