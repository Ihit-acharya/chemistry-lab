const QUIZ_LENGTH = 10;
let allQuestions = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];

const quizContainer = document.getElementById('quiz-container');
const questionElement = document.getElementById('question');
const optionsElement = document.getElementById('options');
const answerStatus = document.getElementById('answerStatus');
const feedbackMessage = document.getElementById('feedbackMessage');
const nextButton = document.getElementById('next-btn');
const submitButton = document.getElementById('submit-btn');
const resultElement = document.getElementById('result');
const questionCounter = document.getElementById('questionCounter');
const quizProgress = document.getElementById('quizProgress');
const selectedDifficultyEl = document.getElementById('selectedDifficulty');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardDifficulty = document.getElementById('leaderboardDifficulty');

function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getQuestionKey(question) {
    const text = typeof question.question === 'string' ? question.question.trim() : '';
    const options = Array.isArray(question.options) ? question.options.map(opt => String(opt).trim()) : [];
    return `${text}::${options.join('||')}`;
}

function uniqueQuestions(questions) {
    const seen = new Set();
    const unique = [];
    questions.forEach(q => {
        const key = getQuestionKey(q);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(q);
        }
    });
    return unique;
}

function getDifficulty() {
    const diff = (localStorage.getItem('quizDifficulty') || 'easy').toLowerCase();
    if (selectedDifficultyEl) {
        selectedDifficultyEl.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
    }
    if (leaderboardDifficulty) {
        leaderboardDifficulty.textContent = `Difficulty: ${diff.charAt(0).toUpperCase() + diff.slice(1)}`;
    }
    return diff;
}

async function loadQuestions() {
    const difficulty = getDifficulty();
    const res = await fetch(window.apiUrl(`/data/quiz_${difficulty}.json`), { cache: 'no-store' });
    if (!res.ok) {
        throw new Error('Failed to load quiz data');
    }
    allQuestions = await res.json();
    const uniquePool = uniqueQuestions(allQuestions);
    const randomized = shuffle(uniquePool);
    quizQuestions = randomized.slice(0, Math.min(QUIZ_LENGTH, randomized.length));
    userAnswers = new Array(quizQuestions.length).fill(null);
}

function renderQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    
    // Clear feedback
    feedbackMessage.classList.add('d-none');
    feedbackMessage.innerHTML = '';
    
    // Render question
    questionElement.innerHTML = `
        <h3 class="question-number">Question ${currentQuestionIndex + 1} of ${quizQuestions.length}</h3>
        <p class="question-content">${question.question}</p>
    `;

    optionsElement.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'option-btn';
        optionBtn.setAttribute('data-index', index.toString());
        optionBtn.innerHTML = `
            <span class="option-key">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${option}</span>
            <i class="fas fa-check-circle option-check"></i>
        `;

        if (userAnswers[currentQuestionIndex] === index) {
            optionBtn.classList.add('selected');
            answerStatus.classList.add('d-none');
        }

        optionBtn.addEventListener('click', () => selectAnswer(index, optionBtn));
        optionsElement.appendChild(optionBtn);
    });

    updateAnswerStatus();
    updateButtons();
    updateProgress();
}

function selectAnswer(index, optionBtn) {
    userAnswers[currentQuestionIndex] = index;
    
    // Remove selection from all buttons
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    
    // Add selection to clicked button with animation
    optionBtn.classList.add('selected');
    optionBtn.style.animation = 'none';
    setTimeout(() => {
        optionBtn.style.animation = 'answerPulse 0.6s ease-out';
    }, 10);
    
    // Show immediate feedback
    showAnswerFeedback();
    
    // Hide "no answer selected" status
    answerStatus.classList.add('d-none');
    
    // Update buttons
    updateButtons();
}

function showAnswerFeedback() {
    feedbackMessage.classList.remove('d-none');
    feedbackMessage.classList.add('feedback-selected');
    feedbackMessage.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Answer recorded! Ready to continue.</span>
    `;
    
    // Add animation
    feedbackMessage.style.animation = 'feedbackSlideIn 0.3s ease-out';
}

function updateAnswerStatus() {
    if (userAnswers[currentQuestionIndex] === null) {
        answerStatus.classList.remove('d-none');
        answerStatus.innerHTML = `
            <span class="answer-indicator">
                <i class="fas fa-circle-question"></i> Please select an answer to continue
            </span>
        `;
    } else {
        answerStatus.classList.add('d-none');
    }
}

function updateButtons() {
    const hasAnswer = userAnswers[currentQuestionIndex] !== null;
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;
    
    // Next button: enabled only if answer selected and not last question
    nextButton.disabled = !hasAnswer || isLastQuestion;
    nextButton.style.display = isLastQuestion ? 'none' : 'inline-block';
    
    // Submit button: enabled only if answer selected and is last question
    submitButton.disabled = !hasAnswer;
    submitButton.style.display = isLastQuestion ? 'inline-block' : 'none';
}

function updateProgress() {
    if (questionCounter) {
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    }
    if (quizProgress) {
        const percent = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);
        quizProgress.style.width = `${percent}%`;
        quizProgress.setAttribute('aria-valuenow', String(percent));
    }
}

function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1 && userAnswers[currentQuestionIndex] !== null) {
        currentQuestionIndex++;
        renderQuestion();
        // Scroll to top
        document.querySelector('.quiz-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function submitQuiz() {
    let score = 0;
    quizQuestions.forEach((q, index) => {
        if (userAnswers[index] === q.answer) {
            score++;
        }
    });

    const total = quizQuestions.length;
    const username = (window.auth && typeof window.auth.getUserName === 'function')
        ? window.auth.getUserName()
        : 'Anonymous';
    const difficulty = getDifficulty();

    let betterThanPct = 0;
    try {
        const res = await fetch(window.apiUrl('/api/quiz/submit'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, score, total, difficulty })
        });
        const data = await res.json();
        if (res.ok && data && typeof data.betterThanPct === 'number') {
            betterThanPct = data.betterThanPct;
        }
    } catch (err) {
        console.warn('Quiz submit failed', err);
    }

    // Show result with celebration animation
    resultElement.innerHTML = `
        <div class="result-content">
            <div class="result-icon">
                <i class="fas fa-trophy"></i>
            </div>
            <h3>Quiz Completed!</h3>
            <div class="score-display">
                <div class="score-number">${score}</div>
                <div class="score-total">out of ${total}</div>
            </div>
            <p class="result-percentile">You did better than <strong>${betterThanPct}%</strong> of participants at this difficulty level.</p>
            <a href="quizhome.html" class="btn btn-primary mt-3">
                <i class="fas fa-home me-2"></i>Back to Quiz Home
            </a>
        </div>
    `;
    resultElement.style.display = 'block';
    resultElement.style.animation = 'resultPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    quizContainer.style.display = 'none';
    await loadLeaderboard();
}

async function loadLeaderboard() {
    if (!leaderboardList) return;
    const difficulty = getDifficulty();
    leaderboardList.innerHTML = '<div class="text-muted">Loading leaderboard...</div>';
    try {
        const url = window.apiUrl(`/api/quiz/leaderboard?difficulty=${encodeURIComponent(difficulty)}`);
        console.log('[Leaderboard] Fetching from:', url);
        
        const res = await fetch(url);
        const data = await res.json();
        
        console.log('[Leaderboard] Response:', data);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${data.message || 'Unknown error'}`);
        }
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load leaderboard');
        }
        
        if (!data.scores || data.scores.length === 0) {
            leaderboardList.innerHTML = '<div class="text-muted">No scores yet. Be the first to play!</div>';
            return;
        }
        
        leaderboardList.innerHTML = '';
        data.scores.forEach((row, index) => {
            const el = document.createElement('div');
            el.className = 'leaderboard-row';
            el.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-user">${row.username}</span>
                <span class="leaderboard-score">${row.score}/${row.total}</span>
            `;
            leaderboardList.appendChild(el);
        });
    } catch (err) {
        console.error('[Leaderboard] Error:', err);
        leaderboardList.innerHTML = `<div class="text-muted text-danger">Leaderboard unavailable: ${err.message}</div>`;
    }
}


async function initQuiz() {
    if (!quizContainer || !questionElement || !optionsElement) return;
    resultElement.style.display = 'none';
    try {
        await loadQuestions();
        renderQuestion();
        await loadLeaderboard();
    } catch (err) {
        resultElement.style.display = 'block';
        resultElement.innerHTML = '<p>Unable to load quiz questions. Please refresh and try again.</p>';
        quizContainer.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (nextButton) nextButton.addEventListener('click', nextQuestion);
    if (submitButton) submitButton.addEventListener('click', submitQuiz);
    initQuiz();
});
