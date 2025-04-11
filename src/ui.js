export class UI {
  constructor() {
    this.scoreDisplay = document.getElementById('score');
    this.finalScoreDisplay = document.getElementById('final-score');
    
    this.mainMenuPanel = document.getElementById('main-menu');
    this.gameUIPanel = document.getElementById('game-ui');
    this.gameOverPanel = document.getElementById('game-over');
  }
  
  updateScore(distance) {
    // Update the score display with distance traveled
    const formattedDistance = Math.floor(distance * 10) / 10;
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = formattedDistance.toFixed(1);
      
      // Change color based on distance milestones
      if (distance >= 100) {
        this.scoreDisplay.style.color = '#FFD700'; // Gold for 100m+
      } else if (distance >= 50) {
        this.scoreDisplay.style.color = '#C0C0C0'; // Silver for 50m+
      } else if (distance >= 25) {
        this.scoreDisplay.style.color = '#CD7F32'; // Bronze for 25m+
      }
    }
  }
  
  showMainMenu() {
    this.hideAllPanels();
    this.mainMenuPanel.classList.remove('hidden');
  }
  
  showGameUI() {
    this.hideAllPanels();
    this.gameUIPanel.classList.remove('hidden');
  }
  
  showGameOver(finalScore) {
    this.hideAllPanels();
    
    // Update the final score
    if (this.finalScoreDisplay) {
      this.finalScoreDisplay.textContent = finalScore.toFixed(1);
    }
    
    // Update game over message
    const gameOverTitle = document.querySelector('#game-over h2');
    if (gameOverTitle) {
      gameOverTitle.textContent = "Head Hit Ground!";
    }
    
    // Display medal based on distance
    const medalDisplay = document.getElementById('medal-display');
    if (medalDisplay) {
      if (finalScore >= 100) {
        medalDisplay.innerHTML = '🥇 Gold Medal!';
        medalDisplay.style.color = '#FFD700';
      } else if (finalScore >= 50) {
        medalDisplay.innerHTML = '🥈 Silver Medal!';
        medalDisplay.style.color = '#C0C0C0';
      } else if (finalScore >= 25) {
        medalDisplay.innerHTML = '🥉 Bronze Medal!';
        medalDisplay.style.color = '#CD7F32';
      } else {
        medalDisplay.innerHTML = 'Keep your head up! Try again!';
        medalDisplay.style.color = 'white';
      }
    }
    
    this.gameOverPanel.classList.remove('hidden');
  }
  
  hideAllPanels() {
    this.mainMenuPanel.classList.add('hidden');
    this.gameUIPanel.classList.add('hidden');
    this.gameOverPanel.classList.add('hidden');
  }
  
}