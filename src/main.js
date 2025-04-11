import { Game } from './game.js';

// Initialize and start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  // Create and initialize the game
  const game = new Game(canvas);
  
  // Setup event listeners for UI buttons
  const startButton = document.getElementById('start-button');
  const restartButton = document.getElementById('restart-button');
  
  startButton.addEventListener('click', () => {
    game.start();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
  });
  
  restartButton.addEventListener('click', () => {
    game.restart();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
  });
  
  // Initialize the game
  game.init();
});