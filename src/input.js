import { KEYS } from './constants.js';

export class InputHandler {
  constructor() {
    this.keyState = {
      [KEYS.Q]: false, // Left thigh forward/up
      [KEYS.W]: false, // Right thigh forward/up
      [KEYS.O]: false, // Left calf backward/up (knee flexion)
      [KEYS.P]: false, // Right calf backward/up (knee flexion)
      [KEYS.SPACE]: false,
      [KEYS.ESC]: false
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Handle key down events
    document.addEventListener('keydown', (event) => {
      if (event.code in this.keyState) {
        this.keyState[event.code] = true;
      }
    });
    
    // Handle key up events
    document.addEventListener('keyup', (event) => {
      if (event.code in this.keyState) {
        this.keyState[event.code] = false;
      }
    });
  }
  
  isKeyPressed(keyCode) {
    return this.keyState[keyCode] || false;
  }
  
  reset() {
    console.log("Resetting all key states");
    // Reset all key states to false
    Object.keys(this.keyState).forEach(key => {
      this.keyState[key] = false;
    });
  }
  
}