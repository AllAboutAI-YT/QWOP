import RAPIER from '@dimforge/rapier2d-compat';
import { PHYSICS } from './constants.js';

// Define collision groups and filters to allow limbs to cross each other
// Using bit flags for collision groups
export const CollisionGroups = {
  DEFAULT: 0xFFFF, // Collides with everything
  TORSO: 0x0001,   // Group 1
  LEFT_LEG: 0x0002, // Group 2
  RIGHT_LEG: 0x0004, // Group 3
  GROUND: 0x0008    // Group 4
};

// Define collision filters (what can collide with what)
export const CollisionFilters = {
  // Torso collides with ground but not with itself
  TORSO: { memberships: CollisionGroups.TORSO, filter: CollisionGroups.GROUND | CollisionGroups.LEFT_LEG | CollisionGroups.RIGHT_LEG },
  
  // Left leg collides with ground and torso but not with right leg
  LEFT_LEG: { memberships: CollisionGroups.LEFT_LEG, filter: CollisionGroups.GROUND | CollisionGroups.TORSO },
  
  // Right leg collides with ground and torso but not with left leg
  RIGHT_LEG: { memberships: CollisionGroups.RIGHT_LEG, filter: CollisionGroups.GROUND | CollisionGroups.TORSO },
  
  // Ground collides with everything
  GROUND: { memberships: CollisionGroups.GROUND, filter: CollisionGroups.TORSO | CollisionGroups.LEFT_LEG | CollisionGroups.RIGHT_LEG }
};

export class PhysicsWorld {
  constructor() {
    this.world = null;
    this.initialized = false;
  }
  
  async init() {
    // Initialize Rapier physics engine
    await RAPIER.init();
    
    // Create the physics world with gravity
    this.world = new RAPIER.World({
      x: 0,
      y: PHYSICS.GRAVITY
    });
    
    // Set solver iterations for better stability
    this.world.timestep = PHYSICS.FIXED_TIMESTEP;
    this.world.numSolverIterations = PHYSICS.SOLVER_ITERATIONS;
    
    // Create the ground
    this.createGround();
    
    this.initialized = true;
  }
  
  createGround() {
    // Create ground as a static rigid body with a rectangular collider
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
    
    // Calculate ground position to match the visual position at bottom of camera
    const cameraHeight = 10;
    const cameraBottom = -cameraHeight / 2;
    const groundY = cameraBottom + 0.25; // Match the visual position
    
    // Set the ground body position
    groundBodyDesc.setTranslation(0, groundY);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    
    // Create a collider for the ground (a much longer rectangle)
    const trackLength = 250; // Match the visual track length (half of 500, as cuboid size is half-length)
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(trackLength, 0.25)
      .setFriction(PHYSICS.GROUND_FRICTION)
      .setRestitution(0.0); // No bounce
    
    // Apply ground collision filter
    groundColliderDesc.setCollisionGroups(
      (CollisionFilters.GROUND.memberships << 16) | CollisionFilters.GROUND.filter
    );
    
    this.world.createCollider(groundColliderDesc, groundBody);
    
    // Create hurdle colliders
    this.createHurdleColliders(groundBody);
    
    return groundBody;
  }
  
  createHurdleColliders(groundBody) {
    // Calculate ground position to match the visual position
    const cameraHeight = 10;
    const cameraBottom = -cameraHeight / 2;
    const groundY = cameraBottom + 0.25; // Match the visual position
    
    // Add colliders for hurdles at the same positions as the visual hurdles
    for (let i = 15; i < 500; i += 15) {
      // Don't place hurdles in the first 15 meters
      if (i < 15) continue;
      
      // Create a thin cuboid collider for the hurdle
      // The y-position is relative to the ground body position, so we use 0.5
      // (distance from ground center to top)
      const hurdleColliderDesc = RAPIER.ColliderDesc.cuboid(0.05, 0.25, 1.2)
        .setTranslation(i, 0.5, 0) // Position relative to ground body
        .setFriction(0.2)
        .setRestitution(0.5); // A bit bouncy when hit
        
      // Apply ground collision filter (same as ground)
      hurdleColliderDesc.setCollisionGroups(
        (CollisionFilters.GROUND.memberships << 16) | CollisionFilters.GROUND.filter
      );
      
      this.world.createCollider(hurdleColliderDesc, groundBody);
    }
  }
  
  // Helper function to set collision groups for all colliders in a body
  setBodyCollisionGroup(body, group) {
    if (!body || !group) return;
    
    // Get all colliders attached to the body
    const colliderCount = body.numColliders();
    for (let i = 0; i < colliderCount; i++) {
      const collider = body.collider(i);
      collider.setCollisionGroups(group);
    }
  }
  
  createDynamicBody(x, y, width, height, density, isRound = false, collisionFilter = null) {
    // Create a dynamic rigid body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setLinearDamping(PHYSICS.LINEAR_DAMPING)       // Add damping to reduce excessive movement
      .setAngularDamping(PHYSICS.ANGULAR_DAMPING);    // Add damping to reduce excessive rotation
    
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create a collider for the body
    let colliderDesc;
    
    if (isRound) {
      // For limbs, use capsule colliders (better for joints and movement)
      const radius = width / 2;
      colliderDesc = RAPIER.ColliderDesc.capsule(height / 2 - radius, radius);
    } else {
      // For torso and feet, use cuboid colliders
      colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2);
    }
    
    // Set physics properties
    colliderDesc
      .setDensity(density)
      .setFriction(PHYSICS.GROUND_FRICTION) // Use consistent friction value
      .setRestitution(0.1);                 // Low restitution to prevent bounciness
    
    // Apply collision filter if provided
    if (collisionFilter) {
      colliderDesc.setCollisionGroups(
        (collisionFilter.memberships << 16) | collisionFilter.filter
      );
    }
    
    this.world.createCollider(colliderDesc, body);
    
    return body;
  }
  
  createRevoluteJoint(bodyA, bodyB, anchorA, anchorB, limits, isKnee = false) {
    if (!this.world || !bodyA || !bodyB) {
      console.error("Cannot create joint: Invalid world or bodies provided.");
      return null;
    }
    
    // Create parameters for a revolute joint
    const params = RAPIER.JointData.revolute(anchorA, anchorB);
    
    // Set joint limits if provided
    if (limits && typeof limits.min === 'number' && typeof limits.max === 'number') {
      // Ensure min <= max
      params.limits = [Math.min(limits.min, limits.max), Math.max(limits.min, limits.max)];
      params.limitsEnabled = true; // Crucial: You need to enable the limits!
    }
    
    // Create the joint
    try {
      const joint = this.world.createImpulseJoint(params, bodyA, bodyB, true);
      
      // If this is a knee joint, add special knee-specific settings
      if (isKnee && limits) {
        // Add stiffness and damping to make the knee more stable and resist rapid oscillation
        try {
          // Configure with rest position, stiffness, and damping if constants are provided
          if (joint.configureMotorPosition && 
              limits.REST_ANGLE !== undefined && 
              limits.STIFFNESS !== undefined && 
              limits.DAMPING !== undefined) {
            
            joint.configureMotorPosition(
              limits.REST_ANGLE,     // Default slight bend
              limits.STIFFNESS * 1.5, // Increased stiffness for better standing
              limits.DAMPING * 1.5    // Increased damping for better stability
            );
          }
        } catch (error) {
          console.error("Error configuring knee joint motor:", error);
        }
      }
      
      console.log("Revolute joint created successfully:", joint.handle);
      return joint;
    } catch (error) {
      console.error("Error creating impulse joint:", error);
      return null;
    }
  }
  
  step() {
    if (this.initialized) {
      this.world.step();
    }
  }
}