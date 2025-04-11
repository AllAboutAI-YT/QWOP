import * as THREE from 'three';

export class GraphicsRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.characterGroup = null;
    this.characterMeshes = {};
    
    // Camera and ground constants
    this.cameraHeight = 10;
    this.cameraWidth = null; // Will be calculated based on aspect ratio
    this.cameraBottom = null; // Will be calculated
    this.groundY = null; // Will be calculated
  }
  
  init() {
    // Create the scene with a gradient sky background
    this.scene = new THREE.Scene();
    
    // Create a gradient sky background
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 512;
    const context = skyCanvas.getContext('2d');
    
    // Create gradient (subtle transition from light blue to darker blue)
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEFA'); // Light sky blue at top
    gradient.addColorStop(0.5, '#6CB6FF'); // Transition
    gradient.addColorStop(1, '#4682B4'); // Steel blue at bottom
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 512);
    
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.wrapS = THREE.RepeatWrapping;
    skyTexture.wrapT = THREE.ClampToEdgeWrapping;
    skyTexture.repeat.set(1, 1);
    
    // Use the texture as background
    this.scene.background = skyTexture;
    
    // Set up the renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Calculate camera dimensions and store them
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.cameraWidth = this.cameraHeight * aspectRatio;
    this.cameraBottom = -this.cameraHeight / 2;
    this.groundY = this.cameraBottom + 0.25; // Position ground at the bottom of camera view
    
    // Set up the orthographic camera
    this.camera = new THREE.OrthographicCamera(
      -this.cameraWidth / 2, this.cameraWidth / 2,
      this.cameraHeight / 2, this.cameraBottom,
      0.1, 1000
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
    
    // Enhanced lighting setup
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6);
    this.scene.add(ambientLight);
    
    // Main sun-like directional light
    const directionalLight = new THREE.DirectionalLight(0xfff0dd, 1.0);
    directionalLight.position.set(5, 20, 10);
    directionalLight.castShadow = true;
    
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.normalBias = 0.02;
    this.scene.add(directionalLight);
    
    // Add a subtle blue rim light from the opposite side
    const rimLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    rimLight.position.set(-5, 8, -7);
    this.scene.add(rimLight);
    
    // Enable shadows in the renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a parent group for the character
    this.characterGroup = new THREE.Group();
    this.scene.add(this.characterGroup);
    
    // Create debug force indicators
    this.forceIndicators = {
      leftThigh: this.createForceIndicator(0xff0000),
      rightThigh: this.createForceIndicator(0xff0000),
      leftCalf: this.createForceIndicator(0x00ff00),
      rightCalf: this.createForceIndicator(0x00ff00)
    };
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Add ground
    this.createGround();
  }
  
  createForceIndicator(color) {
    // Create a line to indicate force direction
    const material = new THREE.LineBasicMaterial({ 
      color: color,
      linewidth: 3
    });
    
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0) // Will be updated
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.visible = false;
    this.scene.add(line);
    
    return {
      line: line,
      visible: false,
      update: function(startPos, forceVector, scale = 1.0) {
        // Update the line points
        const positions = line.geometry.attributes.position.array;
        
        // Start point
        positions[0] = startPos.x;
        positions[1] = startPos.y;
        positions[2] = 0.1; // Slightly above character in z
        
        // End point
        positions[3] = startPos.x + forceVector.x * scale;
        positions[4] = startPos.y + forceVector.y * scale;
        positions[5] = 0.1;
        
        line.geometry.attributes.position.needsUpdate = true;
        line.visible = true;
        
        // Auto-hide after 300ms
        setTimeout(() => {
          line.visible = false;
        }, 300);
      }
    };
  }
  
  createGround() {
    // Create a much longer running track
    const trackLength = 500; // Much longer track
    
    // Main running track - enhanced athletic track with texture
    const trackGeometry = new THREE.BoxGeometry(trackLength, 0.5, 3);
    
    // Create a canvas for the track texture
    const trackCanvas = document.createElement('canvas');
    trackCanvas.width = 1024;
    trackCanvas.height = 512;
    const trackCtx = trackCanvas.getContext('2d');
    
    // Base color - deep red
    trackCtx.fillStyle = '#B71C1C';
    trackCtx.fillRect(0, 0, 1024, 512);
    
    // Add texture details - track lanes with subtle texture
    trackCtx.fillStyle = '#D32F2F';
    
    // Draw lane markers
    for (let i = 0; i < 6; i++) {
      const y = i * 85;
      trackCtx.fillRect(0, y, 1024, 75);
    }
    
    // Add subtle noise texture
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.05;
      
      trackCtx.fillStyle = `rgba(0,0,0,${alpha})`;
      trackCtx.fillRect(x, y, size, size);
    }
    
    // Create the texture
    const trackTexture = new THREE.CanvasTexture(trackCanvas);
    trackTexture.wrapS = THREE.RepeatWrapping;
    trackTexture.wrapT = THREE.RepeatWrapping;
    trackTexture.repeat.set(50, 1); // Repeat along the length
    
    // Create material with the texture
    const trackMaterial = new THREE.MeshStandardMaterial({ 
      map: trackTexture,
      roughness: 0.85,
      metalness: 0.05,
      bumpScale: 0.01
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.position.y = this.groundY; // Position at the bottom of camera view
    track.position.z = 0;
    track.receiveShadow = true;
    this.scene.add(track);

    // Create lane markings
    this.createLaneMarkings(trackLength);
    
    // Create track borders
    const borderGeometry = new THREE.BoxGeometry(trackLength, 0.6, 0.3);
    const borderMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF, // White border
      roughness: 0.8,
      metalness: 0.2 
    });
    
    // Left border
    const leftBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    leftBorder.position.y = this.groundY;
    leftBorder.position.z = 1.65;
    leftBorder.receiveShadow = true;
    this.scene.add(leftBorder);
    
    // Right border
    const rightBorder = new THREE.Mesh(borderGeometry, borderMaterial);
    rightBorder.position.y = this.groundY;
    rightBorder.position.z = -1.65;
    rightBorder.receiveShadow = true;
    this.scene.add(rightBorder);
    
    // Create distance markers
    this.createDistanceMarkers(trackLength);
    
    // Add background elements for depth (stadium, hills, etc.)
    this.createBackgroundElements();
    
    // Add some track objects like hurdles spread throughout the course
    this.createTrackObjects(trackLength);
  }
  
  createLaneMarkings(trackLength) {
    
    // Create lane markings every 10 meters
    const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Lane lines
    for (let i = 0; i < trackLength / 10; i++) {
      // Skip the first few to not crowd the starting area
      if (i < 2) continue;
      
      const x = i * 10; // Every 10 meters
      
      // Create a thin marking
      const markingGeometry = new THREE.BoxGeometry(0.1, 0.01, 3);
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(x, this.groundY + 0.01, 0); // Slightly above ground
      this.scene.add(marking);
    }
  }
  
  createDistanceMarkers(trackLength) {
    
    // Create text markers to indicate distance
    const loader = new THREE.TextureLoader();
    
    for (let i = 10; i < trackLength; i += 20) {
      // Create a sign post to display the distance
      const signGeometry = new THREE.BoxGeometry(1, 0.6, 0.05);
      const signMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.6,
        metalness: 0.2 
      });
      
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      sign.position.set(i, this.groundY + 1.5, 2.2); // Position relative to ground
      
      // Add distance text on the sign
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 128;
      textCanvas.height = 64;
      const ctx = textCanvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = 'black';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i}m`, 64, 32);
      
      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture });
      const textGeometry = new THREE.PlaneGeometry(0.9, 0.5);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(0, 0, 0.03);
      sign.add(textMesh);
      
      // Create a post to hold the sign
      const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
      const postMaterial = new THREE.MeshStandardMaterial({ color: 0x757575 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(i, this.groundY + 0.75, 2.2); // Position relative to ground
      
      this.scene.add(sign);
      this.scene.add(post);
    }
  }
  
  createTrackObjects(trackLength) {
    
    // Add some track objects like hurdles
    const hurdleGeometry = new THREE.BoxGeometry(0.1, 0.5, 2.4);
    const hurdleTopGeometry = new THREE.BoxGeometry(0.3, 0.05, 2.4);
    const hurdleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: 0.7,
      metalness: 0.3 
    });
    
    // Add hurdles at certain intervals
    for (let i = 15; i < trackLength; i += 15) {
      // Don't place hurdles in the first 15 meters
      if (i < 15) continue;
      
      // Create hurdle base (two vertical legs)
      const leftLeg = new THREE.Mesh(hurdleGeometry, hurdleMaterial);
      leftLeg.position.set(i, this.groundY + 0.25, 0.6); // Position relative to ground
      
      const rightLeg = new THREE.Mesh(hurdleGeometry, hurdleMaterial);
      rightLeg.position.set(i, this.groundY + 0.25, -0.6); // Position relative to ground
      
      // Create hurdle crossbar
      const crossbar = new THREE.Mesh(hurdleTopGeometry, hurdleMaterial);
      crossbar.position.set(i, this.groundY + 0.5, 0); // Position relative to ground
      
      this.scene.add(leftLeg);
      this.scene.add(rightLeg);
      this.scene.add(crossbar);
    }
  }
  
  createBackgroundElements() {
    
    // Create a stadium-like backdrop
    this.createStadium();
    
    // Create a more visually pleasing distant mountain range
    // Create different mountain materials for variety
    const mountainMaterials = [
      new THREE.MeshStandardMaterial({ 
        color: 0x2E5D32, 
        roughness: 0.9, 
        metalness: 0.1,
        flatShading: true
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x1E4D22, 
        roughness: 0.8, 
        metalness: 0.0,
        flatShading: true
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x3E6D42, 
        roughness: 0.85, 
        metalness: 0.05,
        flatShading: true
      })
    ];
    
    // Create fewer, more detailed mountains
    for (let i = 0; i < 5; i++) {
      // Use different geometries for visual variety
      const segments = 24 + Math.floor(Math.random() * 8);
      const topRadius = 1.5 + Math.random() * 2.5;
      const bottomRadius = 6 + Math.random() * 4;
      const height = 4 + Math.random() * 4;
      
      const mountainGeometry = new THREE.CylinderGeometry(
        topRadius, bottomRadius, height, segments, 1, false, 0, Math.PI
      );
      
      // Create the mountain with random material
      const mountain = new THREE.Mesh(
        mountainGeometry,
        mountainMaterials[Math.floor(Math.random() * mountainMaterials.length)]
      );
      
      // Position and rotate the mountain
      mountain.rotation.x = Math.PI / 2;
      const xPos = i * 120 - 180 + (Math.random() * 40 - 20); // Add some randomness
      const zPos = -30 - Math.random() * 20; // Random distance
      mountain.position.set(xPos, this.groundY - 1, zPos);
      
      // Add the mountain to the scene
      this.scene.add(mountain);
    }
    
    // Add some clouds
    this.createClouds();
  }
  
  createStadium() {
    
    // Create stadium stands on both sides of the track
    const standGeometry = new THREE.BoxGeometry(500, 6, 8);
    const standMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x607D8B, // Bluish grey
      roughness: 0.8,
      metalness: 0.2 
    });
    
    // Left stands
    const leftStands = new THREE.Mesh(standGeometry, standMaterial);
    leftStands.position.set(250, this.groundY + 3, 7); // Position relative to ground
    this.scene.add(leftStands);
    
    // Right stands
    const rightStands = new THREE.Mesh(standGeometry, standMaterial);
    rightStands.position.set(250, this.groundY + 3, -7); // Position relative to ground
    this.scene.add(rightStands);
    
    // Create stadium seating (small colorful cubes representing spectators)
    const seatGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const seatColors = [
      0xE57373, // Red
      0x64B5F6, // Blue
      0x81C784, // Green
      0xFFD54F  // Yellow
    ];
    
    // Create seats in a grid pattern
    for (let x = 0; x < 100; x += 2) {
      for (let y = 0; y < 5; y++) {
        // Left side spectators
        const leftSeatMaterial = new THREE.MeshBasicMaterial({ 
          color: seatColors[Math.floor(Math.random() * seatColors.length)] 
        });
        const leftSeat = new THREE.Mesh(seatGeometry, leftSeatMaterial);
        leftSeat.position.set(x * 5, this.groundY + 4 + y * 0.8, 4 + y * 0.6); // Position relative to ground
        this.scene.add(leftSeat);
        
        // Right side spectators
        const rightSeatMaterial = new THREE.MeshBasicMaterial({ 
          color: seatColors[Math.floor(Math.random() * seatColors.length)] 
        });
        const rightSeat = new THREE.Mesh(seatGeometry, rightSeatMaterial);
        rightSeat.position.set(x * 5, this.groundY + 4 + y * 0.8, -4 - y * 0.6); // Position relative to ground
        this.scene.add(rightSeat);
      }
    }
  }
  
  createClouds() {
    // Enhanced cloud material with subtle translucency
    const cloudMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
      emissive: 0xccccff,
      emissiveIntensity: 0.05 // Subtle glow
    });
    
    // Create fewer, better-looking clouds
    for (let i = 0; i < 12; i++) {
      const cloudGroup = new THREE.Group();
      
      // Improved cloud formation with more variation
      const numPuffs = 4 + Math.floor(Math.random() * 4); // More puffs
      
      // Create unique cloud shapes by distributing puffs in a more natural pattern
      for (let j = 0; j < numPuffs; j++) {
        // Larger size range for more variety
        const size = 0.9 + Math.random() * 1.2;
        
        // Higher resolution sphere for smoother clouds
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(size, 12, 12),
          cloudMaterial
        );
        
        // Position puffs in a more natural, clustered formation
        const angle = (j / numPuffs) * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.5;
        
        puff.position.x = Math.cos(angle) * radius + (Math.random() * 0.5 - 0.25);
        puff.position.z = Math.sin(angle) * radius + (Math.random() * 0.5 - 0.25); 
        puff.position.y = Math.random() * 0.5 - 0.25;
        
        // Slightly scale puffs for more natural shapes
        const puffScale = 0.8 + Math.random() * 0.4;
        puff.scale.set(puffScale, puffScale * 0.8, puffScale);
        
        // Rotate puff slightly for more variation
        puff.rotation.set(
          Math.random() * Math.PI * 0.1,
          Math.random() * Math.PI * 0.1,
          Math.random() * Math.PI * 0.1
        );
        
        cloudGroup.add(puff);
      }
      
      // Distribute clouds more evenly and at varied heights
      const zVariation = Math.random() < 0.5 ? 1 : -1; // Distribute on both sides
      cloudGroup.position.set(
        i * 80 - 200 + (Math.random() * 60 - 30), // Spread out more
        8 + Math.random() * 4, // Higher variation
        (25 + Math.random() * 20) * zVariation // Further back/front with direction variation
      );
      
      // More varied cloud sizes
      const scale = 2 + Math.random() * 3;
      cloudGroup.scale.set(scale, scale * 0.7, scale);
      
      // Add subtle rotation to each cloud
      cloudGroup.rotation.z = Math.random() * 0.2 - 0.1;
      
      this.scene.add(cloudGroup);
    }
  }
  
  createCharacterMeshes() {
    // Clear any existing meshes
    this.characterGroup.clear();
    this.characterMeshes = {};
    
    // Create enhanced materials with better physical properties
    const torsoMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1976D2,           // Deeper blue
      roughness: 0.7,            // Less shiny
      metalness: 0.1,            // Slightly metallic
      envMapIntensity: 0.5       // Subtle environment reflections
    });
    
    const limbMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF9800,           // Vivid orange
      roughness: 0.6,            // Smoother than torso
      metalness: 0.2,            // More metallic shine
      envMapIntensity: 0.6       // More reflective
    });
    
    // Create Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.6, 0.2),
      torsoMaterial
    );
    torso.castShadow = true;
    this.characterMeshes.torso = torso;
    this.characterGroup.add(torso);
    
    // Create Head (just for visuals) with improved geometry and material
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 32, 32), // Higher poly count for smoother sphere
      new THREE.MeshStandardMaterial({ 
        color: 0xFFD54F,     // Bright yellow
        roughness: 0.4,      // Smoother than other parts
        metalness: 0.1,      // Slight shine
        emissive: 0x332200,  // Subtle glow
        emissiveIntensity: 0.2
      })
    );
    head.position.set(0, 0.4, 0);
    head.castShadow = true;
    this.characterMeshes.head = head;
    this.characterGroup.add(head);
    
    // Create Left Thigh
    const leftThigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.3, 8, 8),
      limbMaterial
    );
    leftThigh.castShadow = true;
    this.characterMeshes.leftThigh = leftThigh;
    this.characterGroup.add(leftThigh);
    
    // Create Right Thigh
    const rightThigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.3, 8, 8),
      limbMaterial
    );
    rightThigh.castShadow = true;
    this.characterMeshes.rightThigh = rightThigh;
    this.characterGroup.add(rightThigh);
    
    // Create Left Calf
    const leftCalf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06, 0.3, 8, 8),
      limbMaterial
    );
    leftCalf.castShadow = true;
    this.characterMeshes.leftCalf = leftCalf;
    this.characterGroup.add(leftCalf);
    
    // Create Right Calf
    const rightCalf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06, 0.3, 8, 8),
      limbMaterial
    );
    rightCalf.castShadow = true;
    this.characterMeshes.rightCalf = rightCalf;
    this.characterGroup.add(rightCalf);
    
    // Create Left Foot with enhanced material
    const footMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x5D4037,     // Darker brown
      roughness: 0.9,      // Very rough
      metalness: 0.0,      // No metallic quality
      flatShading: true    // Gives a more stylized look
    });
    
    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.08, 0.15),
      footMaterial
    );
    leftFoot.castShadow = true;
    this.characterMeshes.leftFoot = leftFoot;
    this.characterGroup.add(leftFoot);
    
    // Create Right Foot (using same material as left foot)
    const rightFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.08, 0.15),
      footMaterial // Reuse the same material
    );
    rightFoot.castShadow = true;
    this.characterMeshes.rightFoot = rightFoot;
    this.characterGroup.add(rightFoot);
    
    // Create Left Arm
    const leftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.05, 0.3, 8, 8),
      limbMaterial
    );
    leftArm.castShadow = true;
    this.characterMeshes.leftArm = leftArm;
    this.characterGroup.add(leftArm);
    
    // Create Right Arm
    const rightArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.05, 0.3, 8, 8),
      limbMaterial
    );
    rightArm.castShadow = true;
    this.characterMeshes.rightArm = rightArm;
    this.characterGroup.add(rightArm);
    
    return this.characterMeshes;
  }
  
  updateCamera(characterX) {
    // Smoothly follow the character
    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x,
      characterX,
      0.1
    );
    this.camera.updateProjectionMatrix();
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  handleResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.cameraWidth = this.cameraHeight * aspectRatio;
    this.cameraBottom = -this.cameraHeight / 2;
    this.groundY = this.cameraBottom + 0.25; // Update ground position
    
    this.camera.left = -this.cameraWidth / 2;
    this.camera.right = this.cameraWidth / 2;
    this.camera.top = this.cameraHeight / 2;
    this.camera.bottom = this.cameraBottom;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}