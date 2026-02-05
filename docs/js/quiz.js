const QUIZ_LENGTH = 10;
let allQuestions = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let feedbackShown = false; // Track if feedback for current question is shown

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
    // Fisher-Yates algorithm with optimized iteration
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
    
    // Validate and filter questions
    questions.forEach(q => {
        if (!q || !q.question) return; // Skip invalid questions
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
    try {
        const difficulty = getDifficulty();
        const res = await fetch(window.apiUrl(`/data/quiz_${difficulty}.json`), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load quiz`);
        
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid quiz data format');
        
        allQuestions = data;
        const uniquePool = uniqueQuestions(allQuestions);
        const randomized = shuffle(uniquePool);
        quizQuestions = randomized.slice(0, Math.min(QUIZ_LENGTH, randomized.length));
        
        if (quizQuestions.length === 0) throw new Error('No questions available');
        
        userAnswers = new Array(quizQuestions.length).fill(null);
    } catch (err) {
        console.error('Error loading questions:', err);
        throw err; // Re-throw for caller to handle
    }
}

function renderQuestion() {
    if (!quizQuestions[currentQuestionIndex]) {
        console.error('No question at index', currentQuestionIndex);
        return;
    }
    
    const question = quizQuestions[currentQuestionIndex];
    
    // Reset feedback for new question
    feedbackShown = false;
    if (feedbackMessage) {
        feedbackMessage.classList.add('d-none');
        feedbackMessage.innerHTML = '';
    }
    
    // Validate and render question
    const questionText = question.question || 'Question unavailable';
    const options = Array.isArray(question.options) ? question.options : [];
    
    if (questionElement) {
        questionElement.innerHTML = `
            <h3 class="question-number">Question ${currentQuestionIndex + 1} of ${quizQuestions.length}</h3>
            <p class="question-content">${questionText}</p>
        `;
    }

    if (optionsElement) {
        optionsElement.innerHTML = '';
        options.forEach((option, index) => {
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
                if (answerStatus) answerStatus.classList.add('d-none');
            }

            optionBtn.addEventListener('click', () => selectAnswer(index, optionBtn));
            optionsElement.appendChild(optionBtn);
        });
    }

    updateProgress();
}
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
    
    if (isLastQuestion) {
        // Last question: show Submit button instead of Next
        if (feedbackShown) {
            // After feedback shown, enable submit
            submitButton.disabled = false;
            nextButton.style.display = 'none';
            submitButton.style.display = 'inline-block';
        } else {
            // Before feedback shown, show Next button (which will show feedback)
            nextButton.disabled = !hasAnswer;
            nextButton.innerHTML = `
                <span id="nextBtnText">Show Answer</span>
                <i class="fas fa-arrow-right ms-2"></i>
            `;
            nextButton.style.display = 'inline-block';
            submitButton.style.display = 'none';
        }
    } else {
        // Not last question
        if (feedbackShown) {
            // After feedback shown, enable next
            nextButton.disabled = false;
            nextButton.innerHTML = `
                <span id="nextBtnText">Next Question</span>
                <i class="fas fa-arrow-right ms-2"></i>
            `;
        } else {
            // Before feedback shown, show "Show Answer" button
            nextButton.disabled = !hasAnswer;
            nextButton.innerHTML = `
                <span id="nextBtnText">Show Answer</span>
                <i class="fas fa-arrow-right ms-2"></i>
            `;
        }
        submitButton.style.display = 'none';
    }
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
    if (userAnswers[currentQuestionIndex] === null) return;
    
    // If feedback hasn't been shown yet, show it
    if (!feedbackShown) {
        showCorrectnessFeedback();
        feedbackShown = true;
        // Change button text to "Next Question"
        nextButton.innerHTML = `
            <span id="nextBtnText">Next Question</span>
            <i class="fas fa-arrow-right ms-2"></i>
        `;
        return;
    }
    
    // Feedback already shown, move to next question
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        // Scroll to top
        document.querySelector('.quiz-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showCorrectnessFeedback() {
    const question = quizQuestions[currentQuestionIndex];
    const userAnswerIndex = userAnswers[currentQuestionIndex];
    const isCorrect = userAnswerIndex === question.answer;
    const correctAnswerIndex = question.answer;
    const correctAnswerText = question.options[correctAnswerIndex];
    
    // Update all option buttons to show correctness
    document.querySelectorAll('.option-btn').forEach((btn, idx) => {
        if (idx === correctAnswerIndex) {
            // Correct answer - always show in green
            btn.classList.add('correct-answer');
            btn.innerHTML = btn.innerHTML.replace('option-check', 'option-indicator');
            btn.innerHTML = btn.innerHTML.replace('fas fa-check-circle', 'fas fa-check-circle correct-icon');
        } else if (idx === userAnswerIndex && !isCorrect) {
            // Wrong answer selected by user - show in red
            btn.classList.add('wrong-answer');
            btn.innerHTML = btn.innerHTML.replace('option-check', 'option-indicator');
            btn.innerHTML = btn.innerHTML.replace('fas fa-check-circle', 'fas fa-times-circle wrong-icon');
        }
    });
    
    // Show feedback message
    feedbackMessage.classList.remove('d-none');
    if (isCorrect) {
        feedbackMessage.classList.remove('feedback-wrong');
        feedbackMessage.classList.add('feedback-correct');
        feedbackMessage.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span><strong>Correct!</strong> Great job!</span>
        `;
    } else {
        feedbackMessage.classList.remove('feedback-correct');
        feedbackMessage.classList.add('feedback-wrong');
        feedbackMessage.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <div class="feedback-content">
                <div><strong>Not quite right.</strong></div>
                <div class="feedback-correct-answer">The correct answer is <strong>${String.fromCharCode(65 + correctAnswerIndex)}</strong>: ${correctAnswerText}</div>
            </div>
        `;
    }
    
    // Disable answer selection during feedback
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.cursor = 'default';
    });
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
