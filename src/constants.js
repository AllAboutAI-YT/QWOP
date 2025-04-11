// Game Constants
export const KEYS = {
  Q: 'KeyQ',    // Left thigh forward/up
  W: 'KeyW',    // Right thigh forward/up
  O: 'KeyO',    // Left calf backward/up (knee flexion)
  P: 'KeyP',    // Right calf backward/up (knee flexion)
  SPACE: 'Space',
  ESC: 'Escape'
};

// Physics Constants
export const PHYSICS = {
  GRAVITY: -10.0,              // Reduced gravity for easier movement
  FIXED_TIMESTEP: 1/60,
  SOLVER_ITERATIONS: 10,       // Reduced iterations for more instability
  GROUND_FRICTION: 0.85,       // Higher friction to prevent excessive sliding
  JOINT_MOTOR_MAX_FORCE: 100.0, // Even higher force for greater range of hip movement
  MAX_MOTOR_VELOCITY: 20.0,    // Higher velocity for faster joint rotation
  INITIAL_POSITION: { x: 0, y: -3.5 }, // Position above ground at the bottom of camera
  LINEAR_DAMPING: 0.15,        // Increased damping for better stability
  ANGULAR_DAMPING: 0.15,       // Increased damping for better stability
  INITIAL_STIFFNESS: 35.0,     // Increased stiffness for joints to help character stand more upright
  INITIAL_DAMPING: 3.0         // Increased damping for joints to reduce wobble
};

// Character Constants
export const CHARACTER = {
  PARTS: {
    TORSO: {
      WIDTH: 0.3,
      HEIGHT: 0.6,
      DENSITY: 1.2    // Reduced density to help character stay more upright
    },
    THIGH: {
      WIDTH: 0.15,
      HEIGHT: 0.45,   // Slightly longer thighs for better proportions
      DENSITY: 0.7    // Increased density for better stability
    },
    CALF: {
      WIDTH: 0.12,
      HEIGHT: 0.45,   // Slightly longer calves to match thighs
      DENSITY: 0.5    // Increased density for better stability
    },
    FOOT: {
      WIDTH: 0.25,
      HEIGHT: 0.08,
      DENSITY: 0.6    // Increased foot density for better grounding and stability
    },
    ARM: {
      WIDTH: 0.1,
      HEIGHT: 0.4,
      DENSITY: 0.4    // Lighter than legs to serve as balance but not too heavy
    }
  },
  JOINTS: {
    HIP: {
      MIN_ANGLE: -Math.PI / 2,    // -90 degrees - more backward swing
      MAX_ANGLE: Math.PI * 1.25   // 225 degrees - much higher leg lift to allow crossing
    },
    KNEE: {
      MIN_ANGLE: -Math.PI * 0.8, // -144 degrees - maximum backward bend (anatomically correct)
      MAX_ANGLE: 0.05,           // Allow a tiny bit of forward flex (5 degrees) for stability
      STIFFNESS: 10.0,           // Increased stiffness for knee motor
      DAMPING: 1.0,              // Increased damping to prevent oscillation
      REST_ANGLE: -0.05,         // Very slight natural bend at rest position (-3 degrees)
    },
    ANKLE: {
      MIN_ANGLE: -Math.PI / 3,   // -60 degrees
      MAX_ANGLE: Math.PI / 3     // 60 degrees
    },
    SHOULDER: {
      MIN_ANGLE: -Math.PI / 2,   // -90 degrees - backward swing
      MAX_ANGLE: Math.PI / 2,    // 90 degrees - forward swing
      STIFFNESS: 8.0,            // Less stiffness than legs for natural swinging
      DAMPING: 1.2,              // Higher damping for stability
      REST_ANGLE: Math.PI / 8,   // Slight forward angle at rest (15 degrees)
    }
  }
};

// Game States
export const GAME_STATES = {
  MAIN_MENU: 'MainMenu',
  PLAYING: 'Playing',
  GAME_OVER: 'GameOver',
  PAUSED: 'Paused'
};

// Game Over Conditions
export const GAME_OVER = {
  HEAD_GROUND_THRESHOLD: -4.8  // Distance threshold for head touching ground at camera bottom
};