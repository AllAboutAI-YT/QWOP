import { KEYS, CHARACTER, PHYSICS, GAME_OVER } from './constants.js';
import RAPIER from '@dimforge/rapier2d-compat';
import { CollisionGroups, CollisionFilters } from './physics.js';

export class Character {
  constructor(physicsWorld) {
    this.physics = physicsWorld;
    this.bodies = {};    // Store physics rigid bodies
    this.joints = {};    // Store physics joints
    this.meshes = null;  // Will be set from graphics
    
    // Impulse cooldowns - short enough to feel responsive but prevent overwhelming forces
    this.impulseTimer = 0;
    this.impulseInterval = 80; // Apply impulses more frequently for better response
    
    // Last timestamp for time calculations
    this.lastTimestamp = performance.now();
  }
  
  init(meshes, graphics) {
    this.meshes = meshes;
    this.graphics = graphics; // Store reference to graphics for debug visuals
    this.createPhysicsBodies();
    this.createJoints();
    
    // Apply initial stabilization to help the character stand
    this.stabilizeJoints();
  }
  
  createPhysicsBodies() {
    // Create torso
    const { TORSO, THIGH, CALF, FOOT, ARM } = CHARACTER.PARTS;
    
    // Initial position for the character
    const x = PHYSICS.INITIAL_POSITION.x;
    const y = PHYSICS.INITIAL_POSITION.y;
    
    // Create torso with torso collision filter
    this.bodies.torso = this.physics.createDynamicBody(
      x, y,
      TORSO.WIDTH, TORSO.HEIGHT,
      TORSO.DENSITY,
      false, // Not a round shape
      CollisionFilters.TORSO // Use torso collision filter
    );
    
    // Create left arm
    this.bodies.leftArm = this.physics.createDynamicBody(
      x - TORSO.WIDTH/2 - ARM.WIDTH/2, // Position to the left of torso
      y + TORSO.HEIGHT/4,              // Position at upper part of torso
      ARM.WIDTH, ARM.HEIGHT,
      ARM.DENSITY,
      true, // Use a capsule shape
      CollisionFilters.LEFT_LEG // Use left leg collision filter (for arm)
    );
    
    // Create right arm
    this.bodies.rightArm = this.physics.createDynamicBody(
      x + TORSO.WIDTH/2 + ARM.WIDTH/2, // Position to the right of torso
      y + TORSO.HEIGHT/4,              // Position at upper part of torso
      ARM.WIDTH, ARM.HEIGHT,
      ARM.DENSITY,
      true, // Use a capsule shape
      CollisionFilters.RIGHT_LEG // Use right leg collision filter (for arm)
    );
    
    // Set up parameters for a fully balanced straight stance
    const hipOffsetY = -0.3; // Increase hip-to-torso distance for better stance
    
    // Start with very slight leg bends for stability but visually straight
    const initialHipBend = 0.0;      // No hip bend (standing straight)
    const initialKneeBend = -0.02;   // Very slight knee bend (barely noticeable, for stability)
    
    // Thigh placement for straight stance
    const thighXOffset = 0; // No X offset for straight stance
    const thighYOffset = THIGH.HEIGHT / 2; // Full Y offset for straight stance
    
    // Create left thigh with forward lean and LEFT_LEG collision filter
    this.bodies.leftThigh = this.physics.createDynamicBody(
      x - TORSO.WIDTH/4 + thighXOffset, // Position outward from torso center
      y + hipOffsetY - thighYOffset,    // Position down from hip joint
      THIGH.WIDTH, THIGH.HEIGHT,
      THIGH.DENSITY,
      true, // Use a capsule shape
      CollisionFilters.LEFT_LEG // Use left leg collision filter
    );
    
    // Create right thigh with forward lean and RIGHT_LEG collision filter
    this.bodies.rightThigh = this.physics.createDynamicBody(
      x + TORSO.WIDTH/4 + thighXOffset,
      y + hipOffsetY - thighYOffset,
      THIGH.WIDTH, THIGH.HEIGHT,
      THIGH.DENSITY,
      true, // Use a capsule shape
      CollisionFilters.RIGHT_LEG // Use right leg collision filter
    );
    
    // Calculate knee positions
    const leftKneeX = x - TORSO.WIDTH/4 + 2 * thighXOffset;
    const leftKneeY = y + hipOffsetY - 2 * thighYOffset;
    const rightKneeX = x + TORSO.WIDTH/4 + 2 * thighXOffset;
    const rightKneeY = y + hipOffsetY - 2 * thighYOffset;
    
    // Calf placement for straight stance
    const calfXOffset = 0; // No X offset for straight stance
    const calfYOffset = CALF.HEIGHT / 2; // Full Y offset for straight stance
    
    // Create left calf with bent knee and LEFT_LEG collision filter
    this.bodies.leftCalf = this.physics.createDynamicBody(
      leftKneeX + calfXOffset,
      leftKneeY - calfYOffset,
      CALF.WIDTH, CALF.HEIGHT,
      CALF.DENSITY,
      true, // Use a capsule shape
      CollisionFilters.LEFT_LEG // Use left leg collision filter
    );
    
    // Create right calf with bent knee and RIGHT_LEG collision filter
    this.bodies.rightCalf = this.physics.createDynamicBody(
      rightKneeX + calfXOffset,
      rightKneeY - calfYOffset,
      CALF.WIDTH, CALF.HEIGHT,
      CALF.DENSITY,
      true, // Use a capsule shape
      CollisionFilters.RIGHT_LEG // Use right leg collision filter
    );
    
    // Calculate ankle positions
    const leftAnkleX = leftKneeX + 2 * calfXOffset;
    const leftAnkleY = leftKneeY - 2 * calfYOffset;
    const rightAnkleX = rightKneeX + 2 * calfXOffset;
    const rightAnkleY = rightKneeY - 2 * calfYOffset;
    
    // Foot placement for a perfectly balanced stance
    const footXOffset = 0.05; // Small offset forward for better balance
    
    // Create left foot with LEFT_LEG collision filter
    this.bodies.leftFoot = this.physics.createDynamicBody(
      leftAnkleX + footXOffset,
      leftAnkleY - FOOT.HEIGHT/2,
      FOOT.WIDTH, FOOT.HEIGHT,
      FOOT.DENSITY,
      false, // Not a capsule shape
      CollisionFilters.LEFT_LEG // Use left leg collision filter
    );
    
    // Create right foot with RIGHT_LEG collision filter
    this.bodies.rightFoot = this.physics.createDynamicBody(
      rightAnkleX + footXOffset,
      rightAnkleY - FOOT.HEIGHT/2,
      FOOT.WIDTH, FOOT.HEIGHT,
      FOOT.DENSITY,
      false, // Not a capsule shape
      CollisionFilters.RIGHT_LEG // Use right leg collision filter
    );
  }
  
  createJoints() {
    const { HIP, KNEE, ANKLE, SHOULDER } = CHARACTER.JOINTS;
    const { TORSO, THIGH, CALF, FOOT, ARM } = CHARACTER.PARTS;
    
    // Shoulder joint anchors (relative to body centers)
    const torsoShoulderAnchorLeft = { x: -TORSO.WIDTH/2, y: TORSO.HEIGHT/3 };
    const torsoShoulderAnchorRight = { x: TORSO.WIDTH/2, y: TORSO.HEIGHT/3 };
    const armShoulderAnchor = { x: 0, y: ARM.HEIGHT/2 - 0.05 };
    
    // Create shoulder joints
    this.joints.leftShoulder = this.physics.createRevoluteJoint(
      this.bodies.torso,
      this.bodies.leftArm,
      torsoShoulderAnchorLeft,
      armShoulderAnchor,
      { 
        min: SHOULDER.MIN_ANGLE, 
        max: SHOULDER.MAX_ANGLE,
        REST_ANGLE: SHOULDER.REST_ANGLE,
        STIFFNESS: SHOULDER.STIFFNESS,
        DAMPING: SHOULDER.DAMPING
      }
    );
    
    this.joints.rightShoulder = this.physics.createRevoluteJoint(
      this.bodies.torso,
      this.bodies.rightArm,
      torsoShoulderAnchorRight,
      armShoulderAnchor,
      { 
        min: SHOULDER.MIN_ANGLE, 
        max: SHOULDER.MAX_ANGLE,
        REST_ANGLE: SHOULDER.REST_ANGLE,
        STIFFNESS: SHOULDER.STIFFNESS,
        DAMPING: SHOULDER.DAMPING
      }
    );
    
    // Hip joint anchors (relative to body centers)
    const torsoHipAnchorLeft = { x: -TORSO.WIDTH/4, y: -TORSO.HEIGHT/2 + 0.05 };
    const torsoHipAnchorRight = { x: TORSO.WIDTH/4, y: -TORSO.HEIGHT/2 + 0.05 };
    const thighHipAnchor = { x: 0, y: THIGH.HEIGHT/2 - 0.05 };
    
    // Create hip joints (torso to thighs) with wide range of motion
    this.joints.leftHip = this.physics.createRevoluteJoint(
      this.bodies.torso, 
      this.bodies.leftThigh,
      torsoHipAnchorLeft, // Left hip anchor on torso
      thighHipAnchor,     // Top anchor on thigh
      { min: HIP.MIN_ANGLE, max: HIP.MAX_ANGLE }
    );
    
    this.joints.rightHip = this.physics.createRevoluteJoint(
      this.bodies.torso, 
      this.bodies.rightThigh,
      torsoHipAnchorRight, // Right hip anchor on torso
      thighHipAnchor,      // Top anchor on thigh
      { min: HIP.MIN_ANGLE, max: HIP.MAX_ANGLE }
    );
    
    // Knee joint anchors
    const thighKneeAnchor = { x: 0, y: -THIGH.HEIGHT/2 + 0.05 };
    const calfKneeAnchor = { x: 0, y: CALF.HEIGHT/2 - 0.05 };
    
    // Create knee joints (thighs to calves) with human-like hinge constraints
    this.joints.leftKnee = this.physics.createRevoluteJoint(
      this.bodies.leftThigh, 
      this.bodies.leftCalf,
      thighKneeAnchor, // Bottom of thigh
      calfKneeAnchor,  // Top of calf
      { min: KNEE.MIN_ANGLE, max: KNEE.MAX_ANGLE },
      true // Specify this is a knee joint for special handling
    );
    
    this.joints.rightKnee = this.physics.createRevoluteJoint(
      this.bodies.rightThigh, 
      this.bodies.rightCalf,
      thighKneeAnchor, // Bottom of thigh
      calfKneeAnchor,  // Top of calf
      { min: KNEE.MIN_ANGLE, max: KNEE.MAX_ANGLE },
      true // Specify this is a knee joint for special handling
    );
    
    // Ankle joint anchors
    const calfAnkleAnchor = { x: 0, y: -CALF.HEIGHT/2 + 0.05 };
    const footAnkleAnchor = { x: -FOOT.WIDTH/3, y: 0 }; // Place anchor near the heel
    
    // Create ankle joints (calves to feet)
    this.joints.leftAnkle = this.physics.createRevoluteJoint(
      this.bodies.leftCalf, 
      this.bodies.leftFoot,
      calfAnkleAnchor,  // Bottom of calf
      footAnkleAnchor,  // Back of foot (heel)
      { min: ANKLE.MIN_ANGLE, max: ANKLE.MAX_ANGLE }
    );
    
    this.joints.rightAnkle = this.physics.createRevoluteJoint(
      this.bodies.rightCalf, 
      this.bodies.rightFoot,
      calfAnkleAnchor,  // Bottom of calf
      footAnkleAnchor,  // Back of foot (heel)
      { min: ANKLE.MIN_ANGLE, max: ANKLE.MAX_ANGLE }
    );
  }
  
  applyInputForces(inputHandler) {
    if (!this.joints) {
      return;
    }
    
    // Validate that all joints are properly initialized
    if (!this.joints.leftHip || !this.joints.rightHip || !this.joints.leftKnee || !this.joints.rightKnee) {
      return;
    }
    
    // Calculate time since last frame
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTimestamp;
    this.lastTimestamp = currentTime;
    
    // Update impulse timer
    this.impulseTimer += deltaTime;
    const shouldApplyImpulse = this.impulseTimer >= this.impulseInterval;
    if (shouldApplyImpulse) {
      this.impulseTimer = 0; // Reset timer when interval is reached
    }
    
    // Apply regular QWOP controls
    this.applyQWOPControls(inputHandler, shouldApplyImpulse);
    
    // Apply arm balancing (automatic, without user input)
    this.applyArmBalancing();
  }
  
  applyArmBalancing() {
    // This method automatically moves the arms to help with balance
    // similar to how humans naturally use their arms when walking/running
    
    if (!this.bodies.torso || !this.bodies.leftArm || !this.bodies.rightArm ||
        !this.joints.leftShoulder || !this.joints.rightShoulder) {
      return;
    }
    
    // Check if we should apply impulses based on timer
    const shouldApplyImpulse = this.impulseTimer === 0;
    
    // Get torso rotation to determine if the character is leaning
    const torsoRotation = this.bodies.torso.rotation();
    
    // Get torso angular velocity to predict where it's going
    const torsoAngularVel = this.bodies.torso.angvel();
    
    // Calculate target arm positions based on current torso state
    // This creates a counterbalancing effect
    
    // If leaning forward (negative rotation), swing arms backward to counterbalance
    // If leaning backward (positive rotation), swing arms forward to counterbalance
    
    // Enhanced counterbalance values - negative means the arms move in opposite direction to torso lean
    const counterbalanceStrength = -3.0; // Increased strength for better stability
    const predictiveStrength = -2.0;    // Stronger prediction for better proactive counterbalance
    
    // Calculate target angles that combine current torso tilt and angular velocity prediction
    const leftArmTargetAngle = (counterbalanceStrength * torsoRotation) + 
                              (predictiveStrength * torsoAngularVel) +
                              CHARACTER.JOINTS.SHOULDER.REST_ANGLE; // Add base position
                              
    const rightArmTargetAngle = (counterbalanceStrength * torsoRotation) + 
                               (predictiveStrength * torsoAngularVel) +
                               CHARACTER.JOINTS.SHOULDER.REST_ANGLE; // Add base position
                               
    // Apply counterbalancing force using arm motors
    const { STIFFNESS, DAMPING } = CHARACTER.JOINTS.SHOULDER;
    
    // Use an even stronger stiffness for more responsive and stable counterbalancing
    const balanceStiffness = STIFFNESS * 2.0;  // Increased for better stability
    const balanceDamping = DAMPING * 1.5;      // More damping to prevent oscillation
    
    // Configure arm motors to move toward the target angles
    if (this.joints.leftShoulder.configureMotorPosition) {
      this.joints.leftShoulder.configureMotorPosition(
        leftArmTargetAngle,
        balanceStiffness,
        balanceDamping
      );
      
      this.joints.rightShoulder.configureMotorPosition(
        rightArmTargetAngle,
        balanceStiffness,
        balanceDamping
      );
    }
    
    // Add a small natural swinging motion opposite to leg movement for more realistic balance
    // This mimics how humans swing their arms when walking
    // If left leg is forward, right arm goes forward and vice versa
    if (this.bodies.leftThigh && this.bodies.rightThigh) {
      // Get thigh positions relative to torso to determine which leg is forward
      const leftThighPos = this.bodies.leftThigh.translation();
      const rightThighPos = this.bodies.rightThigh.translation();
      const torsoPos = this.bodies.torso.translation();
      
      // Calculate relative X positions (forward/backward)
      const leftThighRelativeX = leftThighPos.x - torsoPos.x;
      const rightThighRelativeX = rightThighPos.x - torsoPos.x;
      
      // If left thigh is more forward than right thigh, swing right arm forward
      if (leftThighRelativeX > rightThighRelativeX && shouldApplyImpulse) {
        // Apply a small impulse to the right arm in the forward direction
        this.bodies.rightArm.applyImpulse({ x: 0.1, y: 0 }, true);
        // Apply a small impulse to the left arm in the backward direction
        this.bodies.leftArm.applyImpulse({ x: -0.05, y: 0 }, true);
      } 
      // If right thigh is more forward than left thigh, swing left arm forward
      else if (rightThighRelativeX > leftThighRelativeX && shouldApplyImpulse) {
        // Apply a small impulse to the left arm in the forward direction
        this.bodies.leftArm.applyImpulse({ x: 0.1, y: 0 }, true);
        // Apply a small impulse to the right arm in the backward direction
        this.bodies.rightArm.applyImpulse({ x: -0.05, y: 0 }, true);
      }
    }
  }
  
  applyQWOPControls(inputHandler, shouldApplyImpulse) {
    // Classic QWOP-style control system - simplified to 4 keys
    // Each key controls a motor at a joint with a single direction
    
    //// LEFT THIGH - Q KEY ////
    if (inputHandler.isKeyPressed(KEYS.Q)) {
      // Q: Left thigh forward/up - activate motor to swing forward with extra force
      this.applyJointMotor(this.joints.leftHip, PHYSICS.MAX_MOTOR_VELOCITY, PHYSICS.JOINT_MOTOR_MAX_FORCE);
      
      // Apply additional direct impulse for more immediate movement
      const thigh = this.bodies.leftThigh;
      if (thigh && shouldApplyImpulse) {
        // Apply impulse at 60 degree angle with much more power - needed for wider range hip movement
        thigh.applyImpulse({ x: 0.1, y: 0.2 }, true);
        
        // Update visual indicator if available
        if (this.graphics && this.graphics.forceIndicators && this.graphics.forceIndicators.leftThigh) {
          const pos = thigh.translation();
          const forceDir = { x: 0.1, y: 0.2 }; // 60 degree angle with reduced power
          this.graphics.forceIndicators.leftThigh.update(pos, forceDir, 2.0);
        }
      }
    } else {
      // When key is released, disable the motor (allow natural movement)
      this.disableJointMotor(this.joints.leftHip);
    }
    
    //// RIGHT THIGH - W KEY ////
    if (inputHandler.isKeyPressed(KEYS.W)) {
      // W: Right thigh forward/up - activate motor to swing forward with extra force
      this.applyJointMotor(this.joints.rightHip, PHYSICS.MAX_MOTOR_VELOCITY, PHYSICS.JOINT_MOTOR_MAX_FORCE);
      
      // Apply additional direct impulse for more immediate movement
      const thigh = this.bodies.rightThigh;
      if (thigh && shouldApplyImpulse) {
        // Apply impulse at 60 degree angle with much more power - needed for wider range hip movement
        thigh.applyImpulse({ x: 0.1, y: 0.2 }, true);
        
        // Update visual indicator if available
        if (this.graphics && this.graphics.forceIndicators && this.graphics.forceIndicators.rightThigh) {
          const pos = thigh.translation();
          const forceDir = { x: 0.1, y: 0.2 }; // 60 degree angle with reduced power
          this.graphics.forceIndicators.rightThigh.update(pos, forceDir, 2.0);
        }
      }
    } else {
      // When key is released, disable the motor (allow natural movement)
      this.disableJointMotor(this.joints.rightHip);
    }
    
    //// LEFT KNEE - O KEY ////
    if (inputHandler.isKeyPressed(KEYS.O)) {
      // O: Apply biomechanically realistic forces for knee extension (straightening)
      // When O is pressed, we want to straighten the leg (knee extension)
      
      // Use a motor to control the knee joint directly
      // Negative velocity means extension (motor moves toward the MAX_ANGLE/straightening)
      this.applyJointMotor(this.joints.leftKnee, -PHYSICS.MAX_MOTOR_VELOCITY, PHYSICS.JOINT_MOTOR_MAX_FORCE);
      
      // Apply additional direct impulse for more immediate movement
      const calf = this.bodies.leftCalf;
      if (calf && shouldApplyImpulse) {
        // Apply impulse vector in anatomically correct direction to help straighten the leg
        // Forward and upward motion to help extend the knee
        calf.applyImpulse({ x: 0.1, y: 0.2 }, true);
        
        // Update visual indicator
        if (this.graphics && this.graphics.forceIndicators && this.graphics.forceIndicators.leftCalf) {
          const pos = calf.translation();
          const forceDir = { x: 0.1, y: 0.2 }; // Forward and upward direction
          this.graphics.forceIndicators.leftCalf.update(pos, forceDir, 2.0);
        }
      }
    } else {
      // When key is released, allow knee to naturally flex under weight
      // Reset to the natural slight bend defined in the constants
      try {
        const knee = this.joints.leftKnee;
        if (knee && knee.configureMotorPosition) {
          const { REST_ANGLE, STIFFNESS, DAMPING } = CHARACTER.JOINTS.KNEE;
          
          // Add extra stiffness and damping when returning to rest position
          knee.configureMotorPosition(
            REST_ANGLE,     // Default rest angle
            STIFFNESS * 2,  // Double stiffness when releasing for quick return
            DAMPING * 2     // Double damping when releasing for stability
          );
        } else {
          this.disableJointMotor(knee);
        }
      } catch (error) {
        // Fallback to simply disabling the motor
        this.disableJointMotor(this.joints.leftKnee);
      }
    }
    
    //// RIGHT KNEE - P KEY ////
    if (inputHandler.isKeyPressed(KEYS.P)) {
      // P: Apply biomechanically realistic forces for knee extension (straightening)
      // When P is pressed, we want to straighten the leg (knee extension)
      
      // Use a motor to control the knee joint directly
      // Negative velocity means extension (motor moves toward the MAX_ANGLE/straightening)
      this.applyJointMotor(this.joints.rightKnee, -PHYSICS.MAX_MOTOR_VELOCITY, PHYSICS.JOINT_MOTOR_MAX_FORCE);
      
      // Apply additional direct impulse for more immediate movement
      const calf = this.bodies.rightCalf;
      if (calf && shouldApplyImpulse) {
        // Apply impulse vector in anatomically correct direction to help straighten the leg
        // Forward and upward motion to help extend the knee
        calf.applyImpulse({ x: 0.1, y: 0.2 }, true);
        
        // Update visual indicator
        if (this.graphics && this.graphics.forceIndicators && this.graphics.forceIndicators.rightCalf) {
          const pos = calf.translation();
          const forceDir = { x: 0.1, y: 0.2 }; // Forward and upward direction
          this.graphics.forceIndicators.rightCalf.update(pos, forceDir, 2.0);
        }
      }
    } else {
      // When key is released, allow knee to naturally flex under weight
      // Reset to the natural slight bend defined in the constants
      try {
        const knee = this.joints.rightKnee;
        if (knee && knee.configureMotorPosition) {
          const { REST_ANGLE, STIFFNESS, DAMPING } = CHARACTER.JOINTS.KNEE;
          
          // Add extra stiffness and damping when returning to rest position
          knee.configureMotorPosition(
            REST_ANGLE,     // Default rest angle
            STIFFNESS * 2,  // Double stiffness when releasing for quick return
            DAMPING * 2     // Double damping when releasing for stability
          );
        } else {
          this.disableJointMotor(knee);
        }
      } catch (error) {
        // Fallback to simply disabling the motor
        this.disableJointMotor(this.joints.rightKnee);
      }
    }
  }
  
  
  // Helper method to disable a joint motor - allows natural movement
  disableJointMotor(joint) {
    if (!joint || typeof joint.configureMotorVelocity !== 'function') {
      return;
    }
    
    try {
      // Set motor speed to 0 with very low force to effectively disable it
      joint.configureMotorVelocity(0, 0.1);
    } catch (error) {
      // Silently handle errors
    }
  }
  
  applyJointMotor(joint, targetVelocity, maxForce = PHYSICS.JOINT_MOTOR_MAX_FORCE) {
    if (!joint) {
      return;
    }
    
    // Check if the joint object is valid and has the necessary method
    if (typeof joint.configureMotorVelocity !== 'function') {
      return;
    }
    
    // Configure the motor's target velocity and max force (impulse)
    try {
      // This is the key method for velocity motors - standard QWOP-style approach
      // We apply a strong motor with high velocity when key is pressed
      joint.configureMotorVelocity(
        targetVelocity, // The desired angular speed (rad/s)
        maxForce        // Max impulse applied per step to reach the target speed
      );
      
      // No impulses are needed for classic QWOP - motor forces handle everything
    } catch (error) {
      // Silently handle errors
    }
  }
  
  reset() {
    // We'll recreate the bodies in the same positions as initializing
    this.createPhysicsBodies();
    
    // Reset all velocities to zero
    Object.values(this.bodies).forEach(body => {
      body.setLinvel({ x: 0, y: 0 });
      body.setAngvel(0);
    });
    
    // Recreate the joints with the new bodies
    this.createJoints();
    
    // Apply initial joint stabilization to maintain standing
    this.stabilizeJoints();
  }
  
  stabilizeJoints() {
    // Apply some initial stiffness to help the character stand upright
    try {
      // Apply strong position motors to all joints to maintain standing pose
      const stiffness = PHYSICS.INITIAL_STIFFNESS;  // Higher stiffness from constants
      const damping = PHYSICS.INITIAL_DAMPING;      // Higher damping from constants
      
      // Shoulders - set them at slight forward angle (defined in constants)
      if (this.joints.leftShoulder && this.joints.leftShoulder.configureMotorPosition) {
        const { REST_ANGLE } = CHARACTER.JOINTS.SHOULDER;
        // Left arm slightly forward
        this.joints.leftShoulder.configureMotorPosition(REST_ANGLE, stiffness, damping);
        // Right arm slightly forward
        this.joints.rightShoulder.configureMotorPosition(REST_ANGLE, stiffness, damping);
      }
      
      // Hips - keep them at 0 angle (straight down)
      if (this.joints.leftHip.configureMotorPosition) {
        this.joints.leftHip.configureMotorPosition(0, stiffness, damping);
        this.joints.rightHip.configureMotorPosition(0, stiffness, damping);
      }
      
      // Knees - very slight bend for stability
      if (this.joints.leftKnee.configureMotorPosition) {
        const kneeRestAngle = -0.05; // Very slight bend
        this.joints.leftKnee.configureMotorPosition(kneeRestAngle, stiffness, damping);
        this.joints.rightKnee.configureMotorPosition(kneeRestAngle, stiffness, damping);
      }
      
      // Apply much higher damping to all body parts for initial stability
      Object.values(this.bodies).forEach(body => {
        body.setLinearDamping(0.8);   // Much higher initial damping
        body.setAngularDamping(0.8);  // Much higher initial damping
      });
      
      // Extra stabilization for the torso - higher damping
      if (this.bodies.torso) {
        this.bodies.torso.setLinearDamping(1.0);   // Even higher for torso
        this.bodies.torso.setAngularDamping(1.0);  // Even higher for torso
      }
      
      // Give stronger upward impulse to the torso to help straighten up
      if (this.bodies.torso) {
        this.bodies.torso.applyImpulse({ x: 0, y: 1.5 }, true);
      }
      
      // Schedule a gradual return to normal damping after initial stabilization
      setTimeout(() => {
        if (!this.bodies) return; // Safety check in case character was destroyed
        
        // First step - reduce damping but still keep it higher than normal
        Object.values(this.bodies).forEach(body => {
          body.setLinearDamping(0.5);
          body.setAngularDamping(0.5);
        });
        
        // Second step - return to normal damping values after a bit more time
        setTimeout(() => {
          if (!this.bodies) return;
          
          Object.values(this.bodies).forEach(body => {
            body.setLinearDamping(PHYSICS.LINEAR_DAMPING);
            body.setAngularDamping(PHYSICS.ANGULAR_DAMPING);
          });
        }, 500); // After another 500ms (1000ms total)
        
      }, 500); // After initial 500ms
      
    } catch (error) {
      console.error("Error configuring initial joint stability:", error);
    }
  }
  
  
  syncGraphics() {
    if (!this.meshes) return;
    
    // Update visual representation based on physics state
    this.updateMeshFromBody(this.meshes.torso, this.bodies.torso);
    
    // Update the head position (visual only) relative to torso
    const torsoPosition = this.bodies.torso.translation();
    const torsoRotation = this.bodies.torso.rotation();
    
    // Calculate head position using same calculations as in isHeadTouchingGround
    const torsoHeight = CHARACTER.PARTS.TORSO.HEIGHT;
    const torsoHeadOffset = torsoHeight / 2 + 0.1; // Head is above torso center by half torso height + neck
    
    // Calculate head position based on torso position and rotation
    const headX = torsoPosition.x - Math.sin(torsoRotation) * torsoHeadOffset;
    const headY = torsoPosition.y + Math.cos(torsoRotation) * torsoHeadOffset;
    
    // Set head position and rotation
    this.meshes.head.position.set(
      headX, 
      headY, 
      0
    );
    this.meshes.head.rotation.z = torsoRotation;
    
    // Update limbs
    this.updateMeshFromBody(this.meshes.leftThigh, this.bodies.leftThigh);
    this.updateMeshFromBody(this.meshes.rightThigh, this.bodies.rightThigh);
    this.updateMeshFromBody(this.meshes.leftCalf, this.bodies.leftCalf);
    this.updateMeshFromBody(this.meshes.rightCalf, this.bodies.rightCalf);
    this.updateMeshFromBody(this.meshes.leftFoot, this.bodies.leftFoot);
    this.updateMeshFromBody(this.meshes.rightFoot, this.bodies.rightFoot);
    
    // Update arms
    this.updateMeshFromBody(this.meshes.leftArm, this.bodies.leftArm);
    this.updateMeshFromBody(this.meshes.rightArm, this.bodies.rightArm);
    
    // Debug joint angles (uncomment when debugging needed)
    // We can periodically check these to verify that the angles stay within limits
    // and that they match our understanding of the sign convention
    /*
    if (this.joints.leftKnee && this.joints.rightKnee) {
      const leftKneeAngle = this.joints.leftKnee.angle ? this.joints.leftKnee.angle() : 0;
      const rightKneeAngle = this.joints.rightKnee.angle ? this.joints.rightKnee.angle() : 0;
      
      // Log angle in degrees for easier reading
      const toDegrees = (radians) => Math.round(radians * 180 / Math.PI);
      
      if (Math.random() < 0.01) { // Only log occasionally to avoid spam
        console.log(
          `Knee Angles - Left: ${toDegrees(leftKneeAngle)}°, Right: ${toDegrees(rightKneeAngle)}°`
        );
      }
    }
    */
  }
  
  updateMeshFromBody(mesh, body) {
    if (!mesh || !body) return;
    
    // Get position and rotation from physics body
    const position = body.translation();
    const rotation = body.rotation();
    
    // Update the mesh
    mesh.position.set(position.x, position.y, 0);
    mesh.rotation.z = rotation;
  }
  
  getTorsoAngle() {
    // Get the absolute angle of the torso
    return Math.abs(this.bodies.torso.rotation());
  }
  
  getPosition() {
    // Get the character's current position (using torso)
    return this.bodies.torso.translation();
  }
  
  isHeadTouchingGround() {
    // Calculate head position based on torso position and rotation
    if (!this.bodies.torso) return false;
    
    const torsoPosition = this.bodies.torso.translation();
    const torsoRotation = this.bodies.torso.rotation();
    
    // Calculate head position using same logic as in syncGraphics
    // Get torso dimensions for more accurate head positioning
    const torsoHeight = CHARACTER.PARTS.TORSO.HEIGHT;
    const torsoHeadOffset = torsoHeight / 2 + 0.1; // Head is above torso center by half torso height + neck
    const headRadius = 0.15; // Approximate head radius
    
    // Calculate head position based on torso position and rotation
    // The head is located at the top of the torso, rotated around torso center
    const headX = torsoPosition.x - Math.sin(torsoRotation) * torsoHeadOffset;
    const headY = torsoPosition.y + Math.cos(torsoRotation) * torsoHeadOffset;
    
    // For debugging
    if (this.meshes && this.meshes.head) {
      // Add a small visual indicator for the detected head position
      const debugPoint = this.meshes.head.position.clone();
      debugPoint.y -= headRadius; // Bottom of head
      
      // Log the head's bottom y-position for debugging
      if (Math.random() < 0.01) { // Only occasionally to avoid spam
        console.log(`Head bottom Y: ${(headY - headRadius).toFixed(2)}, Ground threshold: ${GAME_OVER.HEAD_GROUND_THRESHOLD}`);
      }
    }
    
    // Check if head is touching the ground (y-position is very low)
    // Add headRadius to account for the size of the head
    return (headY - headRadius) <= GAME_OVER.HEAD_GROUND_THRESHOLD;
  }
}