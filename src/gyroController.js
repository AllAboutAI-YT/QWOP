import { PHYSICS } from './constants.js';

export class GyroController {
  constructor() {
    // Gyro state variables
    this.active = false;
    this.beta = 0;             // Front-back tilt
    this.gamma = 0;            // Left-right tilt
    this.smoothedBeta = 0;     // Smoothed front-back tilt
    this.smoothedGamma = 0;    // Smoothed left-right tilt
    this.isCalibrated = false;
    
    // Calibration reference angles
    this.neutralBeta = 15;     // Default neutral beta angle
    this.neutralGamma = 0;     // Default neutral gamma angle
    
    // Configuration for gyro-to-joint mapping
    this.maxBetaTilt = 45;     // Max degrees tilt from neutral
    this.maxGammaTilt = 30;    // Max degrees tilt from neutral
    
    // Range for thigh joints
    this.thighAngleRange = Math.PI / 2;  // Max swing forward/backward from vertical
    this.thighDiffRange = Math.PI / 4;   // Max angle difference between thighs
    
    // Default target angle for calves (slightly bent)
    this.calfTargetAngle = -Math.PI / 6;
  }
  
  enable() {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requires permission
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
              this.active = true;
              console.log("Gyro mode enabled with permission");
              this.showGyroStatus(true);
            } else {
              console.error("Gyro permission denied");
              this.showGyroStatus(false, "Permission denied");
            }
          })
          .catch(error => {
            console.error("Error requesting gyro permission:", error);
            this.showGyroStatus(false, "Permission error");
          });
      } else {
        // Non-iOS devices don't need explicit permission
        window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        this.active = true;
        console.log("Gyro mode enabled (no permission required)");
        this.showGyroStatus(true);
      }
    } else {
      console.error("Device orientation not supported");
      this.showGyroStatus(false, "Not supported");
    }
  }
  
  disable() {
    window.removeEventListener('deviceorientation', this.handleOrientation.bind(this));
    this.active = false;
    console.log("Gyro mode disabled");
    this.hideGyroStatus();
  }
  
  toggle() {
    if (this.active) {
      this.disable();
    } else {
      this.enable();
    }
    return this.active;
  }
  
  isActive() {
    return this.active;
  }
  
  handleOrientation(event) {
    if (!this.active) return;
    
    // Get the raw device orientation data
    this.beta = event.beta;   // Front-back tilt (-180 to 180)
    this.gamma = event.gamma; // Left-right tilt (-90 to 90)
    
    // Apply smoothing using exponential moving average
    const smoothingFactor = PHYSICS.GYRO.SMOOTHING_FACTOR;
    this.smoothedBeta = this.smoothedBeta + smoothingFactor * (this.beta - this.smoothedBeta);
    this.smoothedGamma = this.smoothedGamma + smoothingFactor * (this.gamma - this.smoothedGamma);
    
    // Calibrate if not already done
    if (!this.isCalibrated && this.beta !== null && this.gamma !== null) {
      this.calibrate();
    }
    
    // Update the on-screen display if visible
    this.updateGyroDisplay();
  }
  
  calibrate() {
    // Set the current orientation as the neutral position
    if (this.beta !== null && this.gamma !== null) {
      this.neutralBeta = this.beta;
      this.neutralGamma = this.gamma;
      this.isCalibrated = true;
      console.log(`Gyro calibrated: Beta ${this.neutralBeta.toFixed(1)}°, Gamma ${this.neutralGamma.toFixed(1)}°`);
    }
  }
  
  resetCalibration() {
    this.isCalibrated = false;
  }
  
  // Calculate target angles for joints based on device orientation
  calculateTargetAngles() {
    if (!this.active || !this.isCalibrated) {
      return {
        leftThigh: 0,
        rightThigh: 0,
        leftCalf: 0,
        rightCalf: 0
      };
    }
    
    // Normalize orientation inputs to -1 to 1 range
    let pitchInput = (this.smoothedBeta - this.neutralBeta) / this.maxBetaTilt;
    let rollInput = (this.smoothedGamma - this.neutralGamma) / this.maxGammaTilt;
    
    // Clamp values
    pitchInput = Math.max(-1, Math.min(1, pitchInput));
    rollInput = Math.max(-1, Math.min(1, rollInput));
    
    // Calculate base thigh angle from pitch (negative because positive beta means tilt forward -> legs back)
    let baseThighTarget = -pitchInput * (this.thighAngleRange / 2);
    
    // Calculate thigh difference from roll
    let thighDiffTarget = rollInput * (this.thighDiffRange / 2);
    
    // Calculate final target angles
    let targetLeftThighAngle = baseThighTarget + thighDiffTarget;
    let targetRightThighAngle = baseThighTarget - thighDiffTarget;
    
    // Simple fixed bend for calves - alternatively could make this dynamic based on thigh position
    const targetLeftCalfAngle = this.calfTargetAngle;
    const targetRightCalfAngle = this.calfTargetAngle;
    
    return {
      leftThigh: targetLeftThighAngle,
      rightThigh: targetRightThighAngle,
      leftCalf: targetLeftCalfAngle,
      rightCalf: targetRightCalfAngle
    };
  }
  
  // UI helpers for showing gyro status
  showGyroStatus(enabled, errorMessage = null) {
    // Create or update status element
    let statusEl = document.getElementById('gyro-status');
    
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'gyro-status';
      statusEl.style.position = 'fixed';
      statusEl.style.top = '10px';
      statusEl.style.right = '10px';
      statusEl.style.padding = '10px';
      statusEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      statusEl.style.color = '#fff';
      statusEl.style.fontFamily = 'Arial, sans-serif';
      statusEl.style.fontSize = '14px';
      statusEl.style.borderRadius = '5px';
      statusEl.style.zIndex = '1000';
      document.body.appendChild(statusEl);
      
      // Add calibrate button
      const calibrateBtn = document.createElement('button');
      calibrateBtn.textContent = 'Calibrate';
      calibrateBtn.style.marginTop = '5px';
      calibrateBtn.style.display = 'block';
      calibrateBtn.style.width = '100%';
      calibrateBtn.style.padding = '5px';
      calibrateBtn.onclick = () => this.calibrate();
      statusEl.appendChild(calibrateBtn);
      
      // Create container for angle display
      const angleDisplay = document.createElement('div');
      angleDisplay.id = 'gyro-angles';
      angleDisplay.style.marginTop = '5px';
      angleDisplay.style.fontSize = '12px';
      statusEl.appendChild(angleDisplay);
    }
    
    // Update status text
    if (enabled) {
      statusEl.innerHTML = '<strong>Gyro Mode: Active</strong>';
    } else {
      statusEl.innerHTML = `<strong>Gyro Mode: Error</strong><br>${errorMessage}`;
    }
    
    // Reattach the calibrate button
    const calibrateBtn = document.createElement('button');
    calibrateBtn.textContent = 'Calibrate';
    calibrateBtn.style.marginTop = '5px';
    calibrateBtn.style.display = 'block';
    calibrateBtn.style.width = '100%';
    calibrateBtn.style.padding = '5px';
    calibrateBtn.onclick = () => this.calibrate();
    statusEl.appendChild(calibrateBtn);
    
    // Reattach angle display
    const angleDisplay = document.createElement('div');
    angleDisplay.id = 'gyro-angles';
    angleDisplay.style.marginTop = '5px';
    angleDisplay.style.fontSize = '12px';
    statusEl.appendChild(angleDisplay);
  }
  
  updateGyroDisplay() {
    const angleDisplay = document.getElementById('gyro-angles');
    if (angleDisplay) {
      angleDisplay.textContent = `Beta: ${this.smoothedBeta.toFixed(1)}° (${(this.smoothedBeta - this.neutralBeta).toFixed(1)}°)
Gamma: ${this.smoothedGamma.toFixed(1)}° (${(this.smoothedGamma - this.neutralGamma).toFixed(1)}°)`;
    }
  }
  
  hideGyroStatus() {
    const statusEl = document.getElementById('gyro-status');
    if (statusEl) {
      document.body.removeChild(statusEl);
    }
  }
}