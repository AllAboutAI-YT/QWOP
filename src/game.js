import { GraphicsRenderer } from './graphics.js';
import { PhysicsWorld } from './physics.js';
import { Character } from './character.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { GAME_STATES, PHYSICS, GAME_OVER } from './constants.js';
import { formatDistance } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.graphics = new GraphicsRenderer(canvas);
    this.physics = new PhysicsWorld();
    this.input = new InputHandler();
    this.ui = new UI();
    
    this.character = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.gameState = GAME_STATES.MAIN_MENU;
    
    this.maxDistance = 0;
    this.animationFrameId = null;
  }
  
  async init() {
    // Initialize graphics
    this.graphics.init();
    
    // Initialize physics
    await this.physics.init();
    
    // Create character
    this.character = new Character(this.physics);
    
    // Create character visual representation
    const characterMeshes = this.graphics.createCharacterMeshes();
    
    // Initialize character with meshes and graphics for debug visuals
    this.character.init(characterMeshes, this.graphics);
    
    // Show the main menu
    this.ui.showMainMenu();
  }
  
  start() {
    // Start the game
    this.gameState = GAME_STATES.PLAYING;
    this.maxDistance = 0;
    
    // Reset character with extra initial stabilization
    this.character.reset();
    
    // Add a small delay before starting the game loop to allow the character to stabilize
    setTimeout(() => {
      // Apply an additional stabilization impulse just before gameplay starts
      if (this.character && this.character.bodies && this.character.bodies.torso) {
        // Stronger upward impulse for better initial balance
        this.character.bodies.torso.applyImpulse({ x: 0, y: 1.0 }, true);
        
        // Also apply a slight angular impulse to help maintain upright position
        this.character.bodies.torso.applyAngularImpulse(-0.1);
      }
    }, 100);
    
    this.input.reset();
    this.ui.showGameUI();
    this.ui.updateScore(0);
    
    // Start the game loop
    this.lastTime = performance.now();
    
    // Cancel any existing animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.gameLoop(this.lastTime);
  }
  
  restart() {
    this.start();
  }
  
  gameLoop(currentTime) {
    // Uncomment for cleaner debugging
    // console.clear();
    
    // Calculate delta time in seconds
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Add to physics accumulator
    this.accumulator += deltaTime;
    
    // Update at fixed time steps for physics stability
    while (this.accumulator >= PHYSICS.FIXED_TIMESTEP) {
      this.update();
      this.accumulator -= PHYSICS.FIXED_TIMESTEP;
    }
    
    // Render at variable framerate
    this.render();
    
    // Continue the game loop
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  update() {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    
    // Apply input forces to character
    this.character.applyInputForces(this.input);
    
    // Step the physics simulation
    this.physics.step();
    
    // Check for game over conditions
    if (this.checkGameOver()) {
      console.log("Game over condition detected");
      this.gameOver();
      return;
    }
    
    // Get character position
    const position = this.character.getPosition();
    
    // Update max distance if character has moved further
    if (position.x > this.maxDistance) {
      this.maxDistance = position.x;
      this.ui.updateScore(this.maxDistance);
    }
  }
  
  render() {
    // Sync character graphics with physics
    this.character.syncGraphics();
    
    // Get character position for camera
    const position = this.character.getPosition();
    this.graphics.updateCamera(position.x);
    
    // Render the scene
    this.graphics.render();
  }
  
  checkGameOver() {
    // Check if the character's head is touching the ground
    if (this.character.isHeadTouchingGround()) {
      console.log("Game over: Head touched the ground");
      return true;
    }
    
    return false;
  }
  
  gameOver() {
    this.gameState = GAME_STATES.GAME_OVER;
    this.ui.showGameOver(this.maxDistance);
  }
  
}