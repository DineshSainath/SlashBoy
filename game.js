// Game elements
const gameArea = document.getElementById("game-area");
const player = document.getElementById("player");
const scoreElement = document.getElementById("score");
const startButton = document.getElementById("start-button");
const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");
const attackButton = document.getElementById("attack-button");
const comboCounter = document.getElementById("combo-counter");
const comboValue = document.getElementById("combo-value");
const lifeFill = document.getElementById("life-fill");
const debugLeft = document.getElementById("debug-left");
const debugRight = document.getElementById("debug-right");
const debugAttack = document.getElementById("debug-attack");

// Game state
let gameRunning = false;
let playerPosition = 50;
let score = 0;
let enemies = [];
let enemySpawnRate = 2000; // milliseconds
let enemySpeed = 2;
let spawnInterval;
let gameLoop;
let moveInterval;
let combo = 0;
let comboTimer = null;
let highScore = localStorage.getItem("highScore") || 0;
let playerLife = 100; // Player life percentage
let isInvulnerable = false; // Invulnerability after taking damage
let leftPressed = false;
let rightPressed = false;
let attackPressed = false;

// Game constants
const PLAYER_SPEED = 5;
const PLAYER_WIDTH = 50;
const ENEMY_WIDTH = 45;
let GAME_AREA_WIDTH = window.innerWidth; // Will be updated on resize
const ATTACK_RANGE = 100;
const COMBO_TIMEOUT = 3000; // 3 seconds to maintain combo
const DAMAGE_AMOUNT = 20; // Amount of life lost when hit
const INVULNERABILITY_TIME = 1000; // 1 second of invulnerability after being hit

// Sound effects (will be initialized when game starts)
let attackSound;
let hitSound;
let gameOverSound;
let damageSound;
let bgMusic;

// Initialize game
function initGame() {
  // Update game area width
  GAME_AREA_WIDTH = gameArea.offsetWidth;

  playerPosition = 50;
  score = 0;
  combo = 0;
  playerLife = 100;
  enemies = [];
  enemySpawnRate = 2000;
  enemySpeed = 2;
  isInvulnerable = false;
  leftPressed = false;
  rightPressed = false;
  attackPressed = false;

  player.style.left = `${playerPosition}px`;
  scoreElement.textContent = "0";
  comboValue.textContent = "0";
  comboCounter.classList.remove("active");

  // Reset debug indicators
  updateDebugIndicators();

  // Reset life bar
  updateLifeBar();

  // Remove any existing enemies
  document.querySelectorAll(".enemy").forEach((enemy) => enemy.remove());

  // Remove any energy blasts
  document.querySelectorAll(".energy-blast").forEach((blast) => blast.remove());

  // Remove game over screen if exists
  const gameOverScreen = document.querySelector(".game-over");
  if (gameOverScreen) {
    gameOverScreen.remove();
  }

  // Initialize sounds
  if (!attackSound) {
    // Using AudioContext for better browser compatibility
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    // Simple oscillator for attack sound
    attackSound = () => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        220,
        audioCtx.currentTime + 0.2
      );
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.2
      );
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    };

    // Simple oscillator for hit sound
    hitSound = () => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        110,
        audioCtx.currentTime + 0.3
      );
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.3
      );
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    };

    // Simple oscillator for game over sound
    gameOverSound = () => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        55,
        audioCtx.currentTime + 1
      );
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 1
      );
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    };

    // Simple oscillator for damage sound
    damageSound = () => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(110, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        55,
        audioCtx.currentTime + 0.5
      );
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.5
      );
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    };
  }
}

// Update debug indicators
function updateDebugIndicators() {
  debugLeft.className = leftPressed ? "active" : "";
  debugRight.className = rightPressed ? "active" : "";
  debugAttack.className = attackPressed ? "active" : "";
}

// Update life bar
function updateLifeBar() {
  lifeFill.style.width = `${playerLife}%`;

  // Change color based on life remaining
  if (playerLife > 60) {
    lifeFill.style.background = "linear-gradient(to right, #ff4757, #ff6b81)";
  } else if (playerLife > 30) {
    lifeFill.style.background = "linear-gradient(to right, #ff7f50, #ffb347)";
  } else {
    lifeFill.style.background = "linear-gradient(to right, #ff0000, #ff4500)";
  }
}

// Start game
function startGame() {
  if (gameRunning) return;

  initGame();
  gameRunning = true;
  startButton.textContent = "Restart Game";

  // Start spawning enemies
  spawnInterval = setInterval(spawnEnemy, enemySpawnRate);

  // Start game loop
  gameLoop = setInterval(updateGame, 16); // ~60fps

  // Start movement loop
  moveInterval = setInterval(handleMovement, 16);

  // Play background music if supported
  try {
    if (!bgMusic) {
      bgMusic = new Audio();
      bgMusic.loop = true;
      // Use a placeholder URL - in a real game, you'd host your own audio file
      // bgMusic.src = 'background-music.mp3';
    }
    // bgMusic.play().catch(e => console.log('Background music could not be played:', e));
  } catch (e) {
    console.log("Audio not supported");
  }
}

// Spawn enemy
function spawnEnemy() {
  if (!gameRunning) return;

  const enemy = document.createElement("div");
  enemy.classList.add("enemy");

  // Random position on the right side of the game area
  const position = GAME_AREA_WIDTH;
  enemy.style.left = `${position}px`;

  gameArea.appendChild(enemy);
  enemies.push({
    element: enemy,
    position: position,
    isHit: false,
  });

  // Increase difficulty over time
  if (enemySpawnRate > 500) {
    enemySpawnRate -= 50;
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, enemySpawnRate);
  }

  if (enemySpeed < 5) {
    enemySpeed += 0.1;
  }
}

// Handle continuous movement
function handleMovement() {
  if (!gameRunning) return;

  // Update debug indicators
  updateDebugIndicators();

  if (leftPressed) {
    playerPosition = Math.max(0, playerPosition - PLAYER_SPEED);
    player.style.left = `${playerPosition}px`;
  }

  if (rightPressed) {
    playerPosition = Math.min(
      GAME_AREA_WIDTH - PLAYER_WIDTH,
      playerPosition + PLAYER_SPEED
    );
    player.style.left = `${playerPosition}px`;
  }
}

// Player attack
function playerAttack() {
  if (!gameRunning) return;

  // Set attack indicator
  attackPressed = true;
  updateDebugIndicators();

  // Reset attack indicator after a short delay
  setTimeout(() => {
    attackPressed = false;
    updateDebugIndicators();
  }, 300);

  // Play attack sound
  if (attackSound) attackSound();

  // Add attack animation
  player.classList.add("attack-animation");
  setTimeout(() => {
    player.classList.remove("attack-animation");
  }, 300);

  // Create energy blast effect
  const blast = document.createElement("div");
  blast.classList.add("energy-blast");
  blast.style.left = `${playerPosition + PLAYER_WIDTH}px`;
  blast.style.bottom = "30px";
  gameArea.appendChild(blast);

  // Remove blast after animation completes
  setTimeout(() => {
    blast.remove();
  }, 300);

  let hitEnemies = 0;

  // Check for enemies in attack range
  enemies.forEach((enemy) => {
    if (enemy.isHit) return;

    const enemyPosition = enemy.position;
    const attackRangeStart = playerPosition - ATTACK_RANGE / 4;
    const attackRangeEnd = playerPosition + PLAYER_WIDTH + ATTACK_RANGE;

    if (enemyPosition >= attackRangeStart && enemyPosition <= attackRangeEnd) {
      enemy.isHit = true;
      enemy.element.classList.add("hit");

      // Play hit sound
      if (hitSound) hitSound();

      // Increase score
      const pointsEarned = 10 * (combo + 1);
      score += pointsEarned;
      scoreElement.textContent = score;

      // Show floating score
      showFloatingScore(enemyPosition, pointsEarned);

      // Increment combo
      hitEnemies++;
    }
  });

  // Update combo if enemies were hit
  if (hitEnemies > 0) {
    // Clear existing combo timeout
    if (comboTimer) clearTimeout(comboTimer);

    // Increment combo
    combo += hitEnemies;
    comboValue.textContent = combo;
    comboCounter.classList.add("active");

    // Set timeout to reset combo
    comboTimer = setTimeout(() => {
      combo = 0;
      comboValue.textContent = combo;
      comboCounter.classList.remove("active");
    }, COMBO_TIMEOUT);
  }
}

// Show floating score
function showFloatingScore(position, points) {
  const floatingScore = document.createElement("div");
  floatingScore.textContent = `+${points}`;
  floatingScore.style.position = "absolute";
  floatingScore.style.left = `${position}px`;
  floatingScore.style.bottom = "80px";
  floatingScore.style.color = "#00e5ff";
  floatingScore.style.fontWeight = "bold";
  floatingScore.style.fontSize = "24px";
  floatingScore.style.textShadow = "0 0 10px rgba(0, 229, 255, 0.7)";
  floatingScore.style.zIndex = "10";
  floatingScore.style.opacity = "1";
  floatingScore.style.transition = "all 1s ease-out";

  gameArea.appendChild(floatingScore);

  // Animate floating score
  setTimeout(() => {
    floatingScore.style.transform = "translateY(-50px)";
    floatingScore.style.opacity = "0";
  }, 50);

  // Remove floating score after animation
  setTimeout(() => {
    floatingScore.remove();
  }, 1000);
}

// Player takes damage
function takeDamage() {
  if (isInvulnerable) return;

  // Play damage sound
  if (damageSound) damageSound();

  // Reduce player life
  playerLife = Math.max(0, playerLife - DAMAGE_AMOUNT);
  updateLifeBar();

  // Visual feedback
  gameArea.classList.add("damage-flash");
  setTimeout(() => {
    gameArea.classList.remove("damage-flash");
  }, 300);

  // Set invulnerability
  isInvulnerable = true;
  player.style.opacity = "0.5";

  // Reset invulnerability after timeout
  setTimeout(() => {
    isInvulnerable = false;
    player.style.opacity = "1";
  }, INVULNERABILITY_TIME);

  // Check if player is dead
  if (playerLife <= 0) {
    gameOver();
  }
}

// Update game state
function updateGame() {
  if (!gameRunning) return;

  // Move enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.position -= enemySpeed;
    enemy.element.style.left = `${enemy.position}px`;

    // Remove enemies that are off-screen or hit
    if (enemy.position + ENEMY_WIDTH < 0 || enemy.isHit) {
      // Add a small delay before removing hit enemies for visual effect
      if (enemy.isHit) {
        setTimeout(() => {
          enemy.element.remove();
        }, 500);
      } else {
        enemy.element.remove();
      }

      enemies.splice(i, 1);

      // Add score for enemies that passed
      if (!enemy.isHit && enemy.position + ENEMY_WIDTH < 0) {
        score += 1;
        scoreElement.textContent = score;
      }
    }

    // Check for collision with player
    if (
      !enemy.isHit &&
      enemy.position < playerPosition + PLAYER_WIDTH &&
      enemy.position + ENEMY_WIDTH > playerPosition
    ) {
      takeDamage();
    }
  }
}

// Game over
function gameOver() {
  gameRunning = false;
  clearInterval(spawnInterval);
  clearInterval(gameLoop);
  clearInterval(moveInterval);

  // Play game over sound
  if (gameOverSound) gameOverSound();

  // Stop background music
  if (bgMusic && !bgMusic.paused) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }

  const gameOverScreen = document.createElement("div");
  gameOverScreen.classList.add("game-over");
  gameOverScreen.innerHTML = `
    <h2>Game Over</h2>
    <p>Your score: ${score}</p>
    <p style="font-size: 24px; margin-top: 10px;">High score: ${highScore}</p>
  `;

  gameArea.appendChild(gameOverScreen);
  startButton.textContent = "Play Again";
}

// Event listeners for buttons
startButton.addEventListener("click", startGame);

// Left button - press and hold
leftButton.addEventListener("mousedown", () => {
  leftPressed = true;
});

leftButton.addEventListener("mouseup", () => {
  leftPressed = false;
});

leftButton.addEventListener("mouseleave", () => {
  leftPressed = false;
});

// Right button - press and hold
rightButton.addEventListener("mousedown", () => {
  rightPressed = true;
});

rightButton.addEventListener("mouseup", () => {
  rightPressed = false;
});

rightButton.addEventListener("mouseleave", () => {
  rightPressed = false;
});

// Attack button
attackButton.addEventListener("click", playerAttack);

// Touch events for buttons
leftButton.addEventListener("touchstart", (e) => {
  e.preventDefault();
  leftPressed = true;
});

leftButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  leftPressed = false;
});

rightButton.addEventListener("touchstart", (e) => {
  e.preventDefault();
  rightPressed = true;
});

rightButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  rightPressed = false;
});

attackButton.addEventListener("touchstart", (e) => {
  e.preventDefault();
  playerAttack();
});

// Keyboard controls (still try to support them)
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    leftPressed = true;
  } else if (e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === " " || e.key === "Enter") {
    playerAttack();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") {
    leftPressed = false;
  } else if (e.key === "ArrowRight") {
    rightPressed = false;
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  GAME_AREA_WIDTH = gameArea.offsetWidth;

  // Make sure player stays within bounds after resize
  if (playerPosition > GAME_AREA_WIDTH - PLAYER_WIDTH) {
    playerPosition = GAME_AREA_WIDTH - PLAYER_WIDTH;
    player.style.left = `${playerPosition}px`;
  }
});

// Initialize game on load
window.addEventListener("load", initGame);
