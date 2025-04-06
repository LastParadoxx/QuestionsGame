// DOM elements
const elements = {
  toggleTheme: document.getElementById('toggleTheme'),
  setupScreen: document.getElementById('setup-screen'),
  gameScreen: document.getElementById('game-screen'),
  questionsListContainer: document.getElementById('questions-list-container'),
  questions: document.getElementById('questions'),
  saveQuestions: document.getElementById('saveQuestions'),
  questionsList: document.getElementById('questionsList'),
  questionNumber: document.getElementById('questionNumber'),
  showQuestion: document.getElementById('showQuestion'),
  questionResult: document.getElementById('questionResult'),
  selectedQuestion: document.getElementById('selectedQuestion'),
  errorMessage: document.getElementById('errorMessage'),
  resetGame: document.getElementById('resetGame'),
  endGame: document.getElementById('endGame'),
  
  // New elements for game modes
  gameModeRadios: document.querySelectorAll('input[name="game-mode"]'),
  timerSettings: document.getElementById('timer-settings'),
  timerRange: document.getElementById('timer-range'),
  timerValue: document.getElementById('timer-value'),
  timerDisplay: document.getElementById('timer-display'),
  timerCountdown: document.getElementById('timer-countdown'),
  
  // Mode-specific controls
  standardControls: document.getElementById('standard-controls'),
  quizControls: document.getElementById('quiz-controls'),
  challengeControls: document.getElementById('challenge-controls'),
  nextRandomQuestion: document.getElementById('nextRandomQuestion'),
  pauseChallenge: document.getElementById('pauseChallenge'),
  resumeChallenge: document.getElementById('resumeChallenge'),
  
  // Progress tracking
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  modeIndicator: document.getElementById('mode-indicator'),
  questionHeading: document.getElementById('question-heading'),
  
  // Swipe area
  swipeArea: document.getElementById('swipe-area'),
  swipeIndicator: document.getElementById('swipe-indicator')
};

// Game state
let gameQuestions = [];
let isListVisible = false;
let activeQuestionNumber = null;
let visitedQuestions = new Set();
let gameMode = "standard";
let timerDuration = 30;
let timerInterval = null;
let isPaused = false;
let usedIndices = new Set();
let hammer = null;

// Theme handling
function initTheme() {
  // Check if user preference exists
  if (localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  // Add a subtle flash animation when toggling theme
  const flash = document.createElement('div');
  flash.style.position = 'fixed';
  flash.style.top = '0';
  flash.style.left = '0';
  flash.style.right = '0';
  flash.style.bottom = '0';
  flash.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  flash.style.zIndex = '9999';
  flash.style.pointerEvents = 'none';
  flash.style.opacity = '0';
  flash.style.transition = 'opacity 0.3s ease';
  document.body.appendChild(flash);
  
  setTimeout(() => {
    flash.style.opacity = '1';
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(flash);
      }, 300);
    }, 100);
  }, 0);
}

// Game mode setup
function setupGameModes() {
  elements.gameModeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      gameMode = this.value;
      
      // Show/hide timer settings
      elements.timerSettings.classList.toggle('hidden', gameMode === 'standard');
      
      // Update UI based on selected mode
      updateModeDisplay();
    });
  });
  
  // Timer range slider
  elements.timerRange.addEventListener('input', function() {
    timerDuration = parseInt(this.value);
    elements.timerValue.textContent = `${timerDuration} sec`;
  });
}

function updateModeDisplay() {
  // Update mode indicator and controls visibility
  switch(gameMode) {
    case 'standard':
      elements.modeIndicator.innerHTML = '<i class="fas fa-list-ol mr-1"></i> Standard Mode';
      elements.questionHeading.textContent = 'Reveal a Question';
      break;
      
    case 'quiz':
      elements.modeIndicator.innerHTML = '<i class="fas fa-random mr-1"></i> Quiz Mode';
      elements.questionHeading.textContent = 'Random Question';
      break;
      
    case 'challenge':
      elements.modeIndicator.innerHTML = '<i class="fas fa-fire mr-1"></i> Challenge Mode';
      elements.questionHeading.textContent = 'Auto Question Cycle';
      break;
  }
}

// Game functions
function saveQuestions() {
  const questionsText = elements.questions.value.trim();
  
  if (!questionsText) {
    showError('Please enter at least one question');
    return;
  }
  
  // Process the questions
  gameQuestions = questionsText.split('\n')
    .map(q => q.trim())
    .filter(q => q.length > 0);
  
  if (gameQuestions.length === 0) {
    showError('Please enter at least one question');
    return;
  }
  
  // Add success animation before transitioning
  animateSuccess(elements.saveQuestions);
  
  setTimeout(() => {
    // Display questions in the list (but keep it hidden)
    displayQuestionsList();
    
    // Switch to game screen
    elements.setupScreen.classList.add('hidden');
    elements.gameScreen.classList.remove('hidden');
    elements.questionsListContainer.classList.add('hidden');
    // Ensure display property is reset
    elements.questionsListContainer.style.display = '';
    isListVisible = false;
    
    // Reset visited questions and progress
    visitedQuestions.clear();
    usedIndices.clear();
    updateProgressBar();
    
    // Update endGame button text
    elements.endGame.innerHTML = '<i class="fas fa-eye mr-2"></i> Show List';
    
    // Clear any previous results/errors
    hideResult();
    hideError();
    
    // Setup UI based on game mode
    setupGameUI();
    
    // Initialize swipe gestures
    setupSwipeGestures();
  }, 600);
}

function setupGameUI() {
  // Show the appropriate controls based on the game mode
  elements.standardControls.classList.toggle('hidden', gameMode !== 'standard');
  elements.quizControls.classList.toggle('hidden', gameMode !== 'quiz');
  elements.challengeControls.classList.toggle('hidden', gameMode !== 'challenge');
  
  // Show/hide swipe indicator
  elements.swipeIndicator.classList.toggle('hidden', gameMode === 'standard');
  
  // Show/hide timer if needed
  elements.timerDisplay.classList.toggle('hidden', gameMode === 'standard');
  if (gameMode !== 'standard') {
    elements.timerCountdown.textContent = `${timerDuration}s`;
  }
  
  // If it's challenge mode, start the challenge automatically
  if (gameMode === 'challenge') {
    startChallenge();
  } else if (gameMode === 'quiz') {
    // If it's quiz mode, set focus on the random button
    elements.nextRandomQuestion.focus();
  } else {
    // If it's standard mode, set focus on the number input
    elements.questionNumber.focus();
  }
}

// Display question list
function displayQuestionsList() {
  elements.questionsList.innerHTML = '';
  
  gameQuestions.forEach((question, index) => {
    const questionElement = document.createElement('div');
    questionElement.classList.add('mb-2', 'py-1');
    
    // Add visited class if this question has been viewed
    if (visitedQuestions.has(index + 1)) {
      questionElement.classList.add('visited-question');
    }
    
    // Highlight active question if any
    if (activeQuestionNumber === index + 1) {
      questionElement.classList.add('active-question');
    }
    
    questionElement.textContent = `${index + 1}. ${question}`;
    
    // Add click event to select this question
    questionElement.addEventListener('click', () => {
      elements.questionNumber.value = index + 1;
      showQuestion();
      // If on mobile, automatically hide the list after selection
      if (window.innerWidth < 768) {
        toggleQuestionsList(false);
      }
    });
    
    elements.questionsList.appendChild(questionElement);
  });
}

// Standard mode - show specific question by number
function showQuestion() {
  const numberInput = elements.questionNumber.value.trim();
  hideError();
  
  if (!numberInput) {
    showError('Please enter a question number');
    return;
  }
  
  const number = parseInt(numberInput, 10);
  
  if (isNaN(number) || number < 1) {
    showError('Please enter a valid positive number');
    return;
  }
  
  if (number > gameQuestions.length) {
    showError(`No question found for number ${number}. Please enter a number between 1 and ${gameQuestions.length}.`);
    return;
  }
  
  // Display the question
  displayQuestionByNumber(number);
}

// Quiz mode - show random question
function showRandomQuestion() {
  let randomIndex;
  
  // If all questions have been used, reset the used indices
  if (usedIndices.size >= gameQuestions.length) {
    // If all questions have been shown, display confetti
    if (usedIndices.size === gameQuestions.length) {
      triggerConfetti();
    }
    usedIndices.clear();
  }
  
  // Generate a random index that hasn't been used yet
  do {
    randomIndex = Math.floor(Math.random() * gameQuestions.length) + 1;
  } while (usedIndices.has(randomIndex));
  
  usedIndices.add(randomIndex);
  
  // Display the question
  displayQuestionByNumber(randomIndex);
  
  // In quiz mode, also update the number input to show the current number
  elements.questionNumber.value = randomIndex;
}

// Challenge mode - auto cycle through questions
function startChallenge() {
  isPaused = false;
  
  // Hide pause button and show resume button
  elements.pauseChallenge.classList.remove('hidden');
  elements.resumeChallenge.classList.add('hidden');
  
  // Show first question immediately if no question is active
  if (!activeQuestionNumber) {
    showRandomQuestion();
  }
  
  // Set up timer
  startTimer();
}

function pauseChallenge() {
  isPaused = true;
  
  // Clear the timer
  clearInterval(timerInterval);
  
  // Show/hide appropriate buttons
  elements.pauseChallenge.classList.add('hidden');
  elements.resumeChallenge.classList.remove('hidden');
}

function resumeChallenge() {
  isPaused = false;
  
  // Show/hide appropriate buttons
  elements.pauseChallenge.classList.remove('hidden');
  elements.resumeChallenge.classList.add('hidden');
  
  // Resume the timer
  startTimer();
}

function startTimer() {
  // Clear any existing timer
  clearInterval(timerInterval);
  
  // Set initial time
  let timeLeft = timerDuration;
  elements.timerCountdown.textContent = `${timeLeft}s`;
  
  // Update the timer every second
  timerInterval = setInterval(() => {
    timeLeft--;
    
    // Update the display
    elements.timerCountdown.textContent = `${timeLeft}s`;
    
    // When time runs out, show next question and reset timer
    if (timeLeft <= 0) {
      showRandomQuestion();
      timeLeft = timerDuration;
    }
  }, 1000);
}

// Core function to display a question by number
function displayQuestionByNumber(number) {
  // Update active question number
  activeQuestionNumber = number;
  
  // Add to visited questions
  visitedQuestions.add(number);
  
  // Update progress
  updateProgressBar();
  
  // Hide previous result with animation
  if (!elements.questionResult.classList.contains('hidden')) {
    elements.questionResult.style.opacity = '0';
    elements.questionResult.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      // Display the question
      elements.selectedQuestion.textContent = gameQuestions[number - 1];
      
      setTimeout(() => {
        elements.questionResult.style.opacity = '1';
        elements.questionResult.style.transform = 'translateY(0)';
      }, 50);
    }, 300);
  } else {
    // Display the question
    elements.selectedQuestion.textContent = gameQuestions[number - 1];
    elements.questionResult.classList.remove('hidden');
  }
  
  // Update the question list if visible
  if (isListVisible) {
    displayQuestionsList();
  }
  
  // Add button press animation
  if (gameMode === 'standard') {
    animateButtonPress(elements.showQuestion);
  } else if (gameMode === 'quiz') {
    animateButtonPress(elements.nextRandomQuestion);
  }
  
  // Check if all questions have been viewed
  if (visitedQuestions.size === gameQuestions.length) {
    // Trigger confetti celebration
    triggerConfetti();
  }
}

// Update progress bar and text
function updateProgressBar() {
  if (gameQuestions.length === 0) return;
  
  const progress = Math.round((visitedQuestions.size / gameQuestions.length) * 100);
  elements.progressBar.style.width = `${progress}%`;
  elements.progressText.textContent = `${visitedQuestions.size}/${gameQuestions.length} Questions`;
}

// Confetti animation when all questions are answered
function triggerConfetti() {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true
  });
}

// Swipe gestures for navigation
function setupSwipeGestures() {
  if (hammer) {
    hammer.destroy();
  }
  
  // Initialize Hammer.js on swipe area
  hammer = new Hammer(elements.swipeArea);
  
  // Configure horizontal swipe
  hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
  
  // Handle swipe events
  hammer.on('swipeleft swiperight', function(ev) {
    if (gameMode === 'standard') return; // Don't use swipe in standard mode
    
    if (ev.type === 'swipeleft') {
      // Next question
      showRandomQuestion();
    } else if (ev.type === 'swiperight' && activeQuestionNumber) {
      // Previous question (only works in quiz mode, not challenge)
      if (gameMode === 'quiz') {
        const prevIndex = getPreviousQuestionIndex();
        if (prevIndex) {
          displayQuestionByNumber(prevIndex);
        }
      }
    }
  });
}

// Helper function to get previous question index
function getPreviousQuestionIndex() {
  // For now just return the current one
  // In a more advanced implementation, this would track question history
  return activeQuestionNumber;
}

function resetGame() {
  // Confirm reset if there are questions
  if (gameQuestions.length > 0) {
    if (!confirm('Are you sure you want to reset the game and enter new questions?')) {
      return;
    }
  }
  
  // Add button animation
  animateButtonPress(elements.resetGame);
  
  // Fade out game screen
  elements.gameScreen.style.opacity = '0';
  elements.gameScreen.style.transform = 'translateY(10px)';
  
  // Clear any running challenge
  clearInterval(timerInterval);
  isPaused = false;
  
  setTimeout(() => {
    // Clear questions
    elements.questions.value = '';
    gameQuestions = [];
    activeQuestionNumber = null;
    visitedQuestions.clear();
    usedIndices.clear();
    
    // Switch to setup screen
    elements.setupScreen.classList.remove('hidden');
    elements.gameScreen.classList.add('hidden');
    
    // Reset opacity and transform
    elements.gameScreen.style.opacity = '1';
    elements.gameScreen.style.transform = 'translateY(0)';
    
    // Clear any results/errors
    hideResult();
    hideError();
    
    // Reset progress
    updateProgressBar();
    
    // Focus on textarea
    elements.questions.focus();
  }, 300);
}

function toggleQuestionsList(forceState) {
  // If forceState is provided, use it, otherwise toggle
  isListVisible = forceState !== undefined ? forceState : !isListVisible;
  
  // Add button animation
  animateButtonPress(elements.endGame);
  
  if (isListVisible) {
    // Show the full list with animation
    elements.questionsListContainer.style.display = 'block';
    elements.questionsListContainer.style.opacity = '0';
    elements.questionsListContainer.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      elements.questionsListContainer.style.opacity = '1';
      elements.questionsListContainer.style.transform = 'translateY(0)';
      elements.questionsListContainer.classList.remove('hidden');
    }, 10);
    
    elements.endGame.innerHTML = '<i class="fas fa-eye-slash mr-2"></i> Hide List';
  } else {
    // Hide the list with animation
    elements.questionsListContainer.style.opacity = '0';
    elements.questionsListContainer.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      elements.questionsListContainer.classList.add('hidden');
      // Reset display property after transition completes
      elements.questionsListContainer.style.display = '';
      elements.endGame.innerHTML = '<i class="fas fa-eye mr-2"></i> Show List';
    }, 300);
  }
}

function endGame() {
  toggleQuestionsList();
}

function showError(message) {
  // Hide any existing error with animation if present
  if (!elements.errorMessage.classList.contains('hidden')) {
    elements.errorMessage.style.opacity = '0';
    
    setTimeout(() => {
      elements.errorMessage.textContent = message;
      elements.errorMessage.style.opacity = '1';
    }, 300);
  } else {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
  }
  
  // Add shake animation
  elements.errorMessage.classList.add('shake');
  setTimeout(() => {
    elements.errorMessage.classList.remove('shake');
  }, 500);
}

function hideError() {
  if (!elements.errorMessage.classList.contains('hidden')) {
    elements.errorMessage.style.opacity = '0';
    setTimeout(() => {
      elements.errorMessage.classList.add('hidden');
      elements.errorMessage.textContent = '';
      elements.errorMessage.style.opacity = '1';
    }, 300);
  }
}

function hideResult() {
  if (!elements.questionResult.classList.contains('hidden')) {
    elements.questionResult.style.opacity = '0';
    setTimeout(() => {
      elements.questionResult.classList.add('hidden');
      elements.selectedQuestion.textContent = '';
      elements.questionResult.style.opacity = '1';
    }, 300);
  }
}

// UI animation helpers
function animateButtonPress(button) {
  button.classList.add('button-press-animation');
  setTimeout(() => {
    button.classList.remove('button-press-animation');
  }, 300);
}

function animateSuccess(element) {
  element.classList.add('success-animation');
  setTimeout(() => {
    element.classList.remove('success-animation');
  }, 500);
}

// Add CSS for new animations
function addDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .button-press-animation {
      transform: scale(0.95);
    }
    
    .success-animation {
      background: linear-gradient(to right, #34d399, #3b82f6) !important;
    }
    
    .active-question {
      background-color: rgba(99, 102, 241, 0.1);
      border-left: 3px solid #6366f1 !important;
      padding-left: 0.5rem;
      font-weight: 500;
    }
    
    .dark .active-question {
      background-color: rgba(99, 102, 241, 0.2);
    }
    
    .visited-question {
      position: relative;
    }
    
    .visited-question::after {
      content: "✓";
      position: absolute;
      right: 8px;
      color: #10b981;
      font-weight: bold;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    
    #questionResult {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    #questionsListContainer {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    #confetti-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    }
  `;
  document.head.appendChild(style);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  initTheme();
  
  // Add dynamic styles
  addDynamicStyles();
  
  // Setup game modes
  setupGameModes();
  
  // Theme toggle
  elements.toggleTheme.addEventListener('click', toggleTheme);
  
  // Game functionality
  elements.saveQuestions.addEventListener('click', saveQuestions);
  elements.showQuestion.addEventListener('click', showQuestion);
  elements.resetGame.addEventListener('click', resetGame);
  elements.endGame.addEventListener('click', endGame);
  
  // Quiz mode
  elements.nextRandomQuestion.addEventListener('click', showRandomQuestion);
  
  // Challenge mode
  elements.pauseChallenge.addEventListener('click', pauseChallenge);
  elements.resumeChallenge.addEventListener('click', resumeChallenge);
  
  // Enter key functionality
  elements.questionNumber.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      showQuestion();
    }
  });
  
  // Add random placeholder questions on load
  const placeholders = [
    "1. What's your favorite movie?",
    "2. If you could have any superpower, what would it be?",
    "3. What's your dream vacation destination?",
    "4. What's something you've always wanted to learn?",
    "5. If you could have dinner with anyone, who would it be?"
  ];
  elements.questions.placeholder = placeholders.join('\n');
}); 
