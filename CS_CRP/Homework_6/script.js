"use strict";

// MEMORY.exe — Stage 5: Final Polish & Debugging

const COLOURS = ["red", "blue", "green", "yellow"];

const levelDisplay = document.getElementById("level");
const highScoreDisplay = document.getElementById("highscore");
const statusDisplay = document.getElementById("status");
const colourButtons = document.querySelectorAll(".colour-button");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const muteButton = document.getElementById("mute-button");
const resetDataButton = document.getElementById("reset-data-button");

let sequence = [];
let inputIndex = 0;
let level = 0;
let highScore = 0;
let gameState = "menu";
let isMuted = false;

let playbackTimers = [];
let playbackToken = 0;

function loadHighScore() {
  const saved = localStorage.getItem("memory_high_score");
  if (saved !== null) {
    highScore = parseInt(saved, 10) || 0;
  }
  highScoreDisplay.textContent = highScore;
}

function saveHighScore() {
  if (level > highScore) {
    highScore = level;
    localStorage.setItem("memory_high_score", highScore.toString());
    highScoreDisplay.textContent = highScore;
  }
}

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(colour) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const frequencies = {
    red: 220,     // A3
    blue: 293.66, // D4
    green: 329.63,// E4
    yellow: 392   // G4
  };

  const freq = frequencies[colour] || 440;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function playGameOverSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);

  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

function clearPlayback() {
  playbackToken++;
  playbackTimers.forEach(timer => clearTimeout(timer));
  playbackTimers = [];

  colourButtons.forEach(button => {
    button.classList.remove("active");
  });
}

function updateInterface(message) {
  levelDisplay.textContent = level;
  highScoreDisplay.textContent = highScore;
  statusDisplay.textContent = message;

  colourButtons.forEach(button => {
    button.disabled = gameState !== "input";
  });

  startButton.disabled = gameState !== "menu";
  restartButton.disabled = gameState === "menu";
}

function addRandomColour() {
  const randomIndex = Math.floor(Math.random() * COLOURS.length);
  sequence.push(COLOURS[randomIndex]);
}

function startGame() {
  getAudioContext();
  clearPlayback();

  sequence = [];
  inputIndex = 0;
  level = 1;
  gameState = "showing";

  addRandomColour();
  updateInterface("Watch the sequence...");
  playSequence();
}

function restartGame() {
  startGame();
}

function playSequence() {
  if (gameState !== "showing") return;

  const currentToken = playbackToken;
  let position = 0;

  function schedule(callback, delay) {
    const timer = setTimeout(() => {
      if (currentToken !== playbackToken) return;

      playbackTimers = playbackTimers.filter(
        existingTimer => existingTimer !== timer
      );

      callback();
    }, delay);

    playbackTimers.push(timer);
  }

  function showNext() {
    if (currentToken !== playbackToken) return;

    if (position >= sequence.length) {
      inputIndex = 0;
      gameState = "input";
      updateInterface("Your turn! Repeat the sequence.");
      return;
    }

    const colour = sequence[position];
    const button = document.getElementById(colour);

    button.classList.add("active");
    playTone(colour);

    schedule(() => {
      button.classList.remove("active");
      position++;
      schedule(showNext, 350);
    }, 350);
  }

  schedule(showNext, 250);
}

function handleSelection(colour) {
  if (gameState !== "input") return;

  playTone(colour);
  const expectedColour = sequence[inputIndex];

  if (colour !== expectedColour) {
    gameState = "gameover";
    clearPlayback();
    playGameOverSound();
    saveHighScore();

    updateInterface(
      `Game over! Reached level ${level}. Press Restart.`
    );
    return;
  }

  inputIndex++;

  if (inputIndex === sequence.length) {
    level++;
    saveHighScore();
    inputIndex = 0;
    gameState = "showing";

    addRandomColour();
    updateInterface(`Correct! Level ${level}. Watch sequence...`);
    playSequence();
  }
}

colourButtons.forEach(button => {
  button.addEventListener("click", () => {
    handleSelection(button.dataset.colour);
  });
});

document.addEventListener("keydown", event => {
  if (event.repeat || gameState !== "input") return;

  const keyMap = {
    "1": "red",
    "2": "blue",
    "3": "green",
    "4": "yellow"
  };

  const colour = keyMap[event.key];

  if (colour) {
    event.preventDefault();
    handleSelection(colour);
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? "> AUDIO: OFF" : "> AUDIO: ON";
});

resetDataButton.addEventListener("click", () => {
  localStorage.removeItem("memory_high_score");
  highScore = 0;
  highScoreDisplay.textContent = highScore;
  statusDisplay.textContent = "> HIGH SCORE WIPED_";
});

loadHighScore();
updateInterface("Press Start when you're ready.");