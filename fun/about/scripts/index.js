// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e1e);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

let flashlightFocus = Math.PI / 4; // Default cone angle (45 degrees)
const flashlightFocusChangeSpeed = 0.05; // Speed of focusing/narrowing the beam

// Player
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ffcc })
);
player.position.set(-20, 0.5, -20); // Centered in the room
scene.add(player);

let currentCameraViewIdx = 0;
let cameraPositions = [
  { height: { base: player.position.y, add: 0.5 }, angleMultiplyer: 1 },
  { height: { base: player.position.y, add: 5 }, angleMultiplyer: 10 },
  { height: { base: player.position.y, add: 50 }, angleMultiplyer: 100 },
];
const getNextCameraViewIdx = () => {
  if (!cameraPositions[currentCameraViewIdx + 1]) return 0;
  else return currentCameraViewIdx + 1;
}
const toggleCamera = () => {
  currentCameraViewIdx = getNextCameraViewIdx();
};

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
const walls = [];

// Door system
const doors = [];

// Function to create a door
function createDoor(x, y, z, width, height, depth, orientation) {
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    doorMaterial
  );
  
  door.position.set(x, y, z);
  door.userData = {
    isDoor: true,
    isOpen: false,
    requiresKey: false,
    keyId: null,
    orientation: orientation, // 'x' for east/west, 'z' for north/south
    originalPosition: { x, y, z },
    openAmount: 0,
    interactionDistance: 3, // How close player needs to be to interact with the door
  };
  
  scene.add(door);
  doors.push(door);
  walls.push(door); // Add to walls for collision detection
  
  return door;
}

// Function to get the nearest door to the player
function getNearestDoor() {
  let nearestDoor = null;
  let nearestDistance = Infinity;
  
  for (const door of doors) {
    const dx = player.position.x - door.position.x;
    const dz = player.position.z - door.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < door.userData.interactionDistance && distance < nearestDistance) {
      nearestDistance = distance;
      nearestDoor = door;
    }
  }
  
  return nearestDoor;
}

// Open/close door function
function toggleDoor(door) {
  if (!door) return;
  door.userData.isOpen = !door.userData.isOpen;
}

// Handle door animation
function animateDoors() {
  for (const door of doors) {
    if (door.userData.isOpen) {
      // Animate door opening
      if (door.userData.orientation === 'x') {
        // East/West oriented door - slide fully into wall
        if (door.userData.openAmount < 1) {
          door.userData.openAmount += 0.1;
          // Move door completely into wall (using extra factor for safety)
          door.position.x = door.userData.originalPosition.x + 
            (door.userData.openAmount * door.geometry.parameters.width * 1.5);
        }
      } else {
        // North/South oriented door - slide fully into wall
        if (door.userData.openAmount < 1) {
          door.userData.openAmount += 0.1;
          // Move door completely into wall (using extra factor for safety)
          door.position.z = door.userData.originalPosition.z + 
            (door.userData.openAmount * door.geometry.parameters.depth * 1.5);
        }
      }
    } else {
      // Animate door closing
      if (door.userData.openAmount > 0) {
        door.userData.openAmount -= 0.1;
        if (door.userData.orientation === 'x') {
          door.position.x = door.userData.originalPosition.x + 
            (door.userData.openAmount * door.geometry.parameters.width * 1.5);
        } else {
          door.position.z = door.userData.originalPosition.z + 
            (door.userData.openAmount * door.geometry.parameters.depth * 1.5);
        }
      }
    }
  }
}

// UI
function createDoorInteractionUI() {
  const doorUI = document.createElement('div');
  doorUI.id = 'doorUI';
  doorUI.style.position = 'absolute';
  doorUI.style.bottom = '20px';
  doorUI.style.left = '50%';
  doorUI.style.transform = 'translateX(-50%)';
  doorUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  doorUI.style.color = 'white';
  doorUI.style.padding = '10px 20px';
  doorUI.style.borderRadius = '5px';
  doorUI.style.fontFamily = 'Arial, sans-serif';
  doorUI.style.display = 'none';
  doorUI.textContent = 'Press E to interact with door';
  document.body.appendChild(doorUI);
  
  return doorUI;
}

const doorUI = createDoorInteractionUI();

// Function to add a label on the floor
function addLabelToFloor(x, z, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.51, z);

  let labelGroup = scene.getObjectByName("labels");
  if (!labelGroup) {
    labelGroup = new THREE.Group();
    labelGroup.name = "labels";
    scene.add(labelGroup);
  }

  labelGroup.add(plane);
}

// We'll store structured room data here
const roomData = [];

// Completely rewritten wall creation function
function createWallWithGap(x, y, z, width, height, depth, direction, roomId, gapStart = null, gapEnd = null, createDoorInGap = false) {
  // If no gap specified, create a solid wall
  if (gapStart === null || gapEnd === null || gapStart >= gapEnd) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      wallMaterial
    );
    wall.position.set(x, y, z);
    scene.add(wall);
    walls.push(wall);
    
    // Add to room data
    if (roomId !== undefined) {
      const room = roomData.find(r => r.id === roomId);
      if (room) {
        room.walls.push({
          id: `${roomId}-${direction}`,
          position: { x, y, z },
          scale: { x: width, y: height, z: depth },
          direction
        });
      }
    }
    
    return;
  }
  
  // If gap is specified, create two wall segments
  
  // For North/South walls (running East-West)
  if (direction === 'north' || direction === 'south') {
    // Left segment (if it exists)
    if (gapStart > 0) {
      const leftWidth = gapStart;
      const leftX = x - width/2 + leftWidth/2;
      
      const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(leftWidth, height, depth),
        wallMaterial
      );
      leftWall.position.set(leftX, y, z);
      scene.add(leftWall);
      walls.push(leftWall);
    }
    
    // Right segment (if it exists)
    if (gapEnd < width) {
      const rightWidth = width - gapEnd;
      const rightX = x + width/2 - rightWidth/2;
      
      const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(rightWidth, height, depth),
        wallMaterial
      );
      rightWall.position.set(rightX, y, z);
      scene.add(rightWall);
      walls.push(rightWall);
    }
    
    // Add door if requested
    if (createDoorInGap) {
      const doorWidth = gapEnd - gapStart;
      const doorX = x - width/2 + gapStart + doorWidth/2;
      
      createDoor(doorX, y, z, doorWidth, height, depth, 'z');
    }
  }
  // For East/West walls (running North-South)
  else if (direction === 'east' || direction === 'west') {
    // Front segment (if it exists)
    if (gapStart > 0) {
      const frontDepth = gapStart;
      const frontZ = z - depth/2 + frontDepth/2;
      
      const frontWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, frontDepth),
        wallMaterial
      );
      frontWall.position.set(x, y, frontZ);
      scene.add(frontWall);
      walls.push(frontWall);
    }
    
    // Back segment (if it exists)
    if (gapEnd < depth) {
      const backDepth = depth - gapEnd;
      const backZ = z + depth/2 - backDepth/2;
      
      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, backDepth),
        wallMaterial
      );
      backWall.position.set(x, y, backZ);
      scene.add(backWall);
      walls.push(backWall);
    }
    
    // Add door if requested
    if (createDoorInGap) {
      const doorDepth = gapEnd - gapStart;
      const doorZ = z - depth/2 + gapStart + doorDepth/2;
      
      createDoor(x, y, doorZ, width, height, doorDepth, 'x');
    }
  }
  
  // Add to room data
  if (roomId !== undefined) {
    const room = roomData.find(r => r.id === roomId);
    if (room) {
      room.walls.push({
        id: `${roomId}-${direction}`,
        position: { x, y, z },
        scale: { x: width, y: height, z: depth },
        direction,
        hasGap: true,
        gap: { start: gapStart, end: gapEnd }
      });
    }
  }
}

// Function to create rooms and specify gaps
function createRooms({ cols = 1, rows = 1, roomSize = 10 }) {
  // Clear existing walls and labels from the scene
  for (const wall of walls.slice()) {
    scene.remove(wall);
  }
  walls.length = 0;
  roomData.length = 0;

  // Clear existing doors
  for (const door of doors.slice()) {
    scene.remove(door);
  }
  doors.length = 0;

  const labelGroup = scene.getObjectByName("labels");
  if (labelGroup) scene.remove(labelGroup);

  const startX = -(cols * roomSize) / 2 + roomSize / 2;
  const startZ = -(rows * roomSize) / 2 + roomSize / 2;

  const floorWidth = cols * roomSize;
  const floorDepth = rows * roomSize;

  const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  scene.add(floor);

  let roomIdCounter = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const roomX = startX + col * roomSize;
      const roomZ = startZ + row * roomSize;
      const half = roomSize / 2;
      const height = 3.2;
      const id = roomIdCounter++;
      const label = `Room ${id}`;

      roomData.push({
        id,
        name: label,
        position: { x: roomX, z: roomZ },
        walls: []
      });

      // Create walls for each room
      // For room 1, we want to add a gap (e.g., door) on the east wall (next room entrance)
      if (row === 0 && col === 0) { // Room 1
        createWallWithGap(roomX, height / 2, roomZ - half, roomSize, height, 0.5, "north", id);  // North wall
        createWallWithGap(roomX, height / 2, roomZ + half, roomSize, height, 0.5, "south", id);  // South wall
        createWallWithGap(roomX - half, height / 2, roomZ, 0.5, height, roomSize, "west", id);   // West wall
        createWallWithGap(roomX + half, height / 2, roomZ, 0.5, height, roomSize, "east", id, 5, 10, true); // East wall of room 1 with door
      } 
      else if (row === 0 && col === 1) { // Room 2
        createWallWithGap(roomX, height / 2, roomZ - half, roomSize, height, 0.5, "north", id);  // North wall
        createWallWithGap(roomX, height / 2, roomZ + half, roomSize, height, 0.5, "south", id);  // South wall
        createWallWithGap(roomX - half, height / 2, roomZ, 0.5, height, roomSize, "west", id, 5, 10, false);   // West wall of room 2 with matching gap but no door
        createWallWithGap(roomX + half, height / 2, roomZ, 0.5, height, roomSize, "east", id);   // East wall
      }
      else {
        createWallWithGap(roomX, height / 2, roomZ - half, roomSize, height, 0.5, "north", id);  // North wall
        createWallWithGap(roomX, height / 2, roomZ + half, roomSize, height, 0.5, "south", id);  // South wall
        createWallWithGap(roomX - half, height / 2, roomZ, 0.5, height, roomSize, "west", id);   // West wall
        createWallWithGap(roomX + half, height / 2, roomZ, 0.5, height, roomSize, "east", id);   // East wall
      }

      addLabelToFloor(roomX, roomZ, label);
    }
  }
}

createRooms({ cols: 2, rows: 2, roomSize: 30 });
console.log(roomData);

// Movement
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  
  // Door interaction with E key
  if (e.key === 'e' || e.key === 'E') {
    const nearestDoor = getNearestDoor();
    if (nearestDoor) {
      toggleDoor(nearestDoor);
    }
  }
});
document.addEventListener('keyup', e => keys[e.key] = false);

// Fixed collision detection function
function checkCollision(x, z) {
  for (const wall of walls) {
    // Skip collision check for open doors
    if (wall.userData && wall.userData.isDoor && wall.userData.isOpen) {
      continue;
    }
    
    // Get the actual dimensions of the wall
    let width, depth;
    
    if (wall.geometry && wall.geometry.parameters) {
      width = wall.geometry.parameters.width || 0;
      depth = wall.geometry.parameters.depth || 0;
    } else {
      width = wall.scale ? wall.scale.x : 0;
      depth = wall.scale ? wall.scale.z : 0;
    }
    
    // Calculate half sizes plus player radius (0.5)
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    
    // Calculate distance between player and wall center
    const dx = Math.abs(x - wall.position.x);
    const dz = Math.abs(z - wall.position.z);
    
    // Check if player is colliding with wall
    if (dx < halfWidth + 0.5 && dz < halfDepth + 0.5) {
      return true;
    }
  }
  return false;
}

let playerRotation = 0;
let lookDirection = 0; // left/right (yaw)
let lookVertical = 0; // up/down (pitch)

const flashlight = new THREE.SpotLight(0xffffff, 5, 50, Math.PI / 4, 0.1, 2);
const flashlightDistance = 0.5;
flashlight.position.set(
  player.position.x + Math.sin(playerRotation),
  player.position.y + 0.5,
  player.position.z - Math.cos(playerRotation),
);
scene.add(flashlight);

flashlight.target = new THREE.Object3D();
scene.add(flashlight.target);
let flashlightOn = false;

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f') flashlightOn = !flashlightOn;
  if (event.key.toLowerCase() === 'c') toggleCamera();
});

let isJumping = false;
let jumpSpeed = 0.2;
let gravity = 0.01;
let playerVelocityY = 0;

function isOnGround() {
  return player.position.y <= 0.5;
}

function animate() {
  requestAnimationFrame(animate);

  const speed = 0.1;

  // Get direction vectors based on lookDirection
  const forwardX = Math.sin(lookDirection);
  const forwardZ = -Math.cos(lookDirection);
  const rightX = Math.cos(lookDirection);
  const rightZ = Math.sin(lookDirection);

  let moveX = 0;
  let moveZ = 0;

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    moveX += forwardX * speed;
    moveZ += forwardZ * speed;
  }
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    moveX -= forwardX * speed;
    moveZ -= forwardZ * speed;
  }
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    moveX -= rightX * speed;
    moveZ -= rightZ * speed;
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    moveX += rightX * speed;
    moveZ += rightZ * speed;
  }
  if (keys[" "] && !isJumping && isOnGround()) {
    isJumping = true;
    playerVelocityY = jumpSpeed;
  }
  
  // Check collision for X movement
  const newX = player.position.x + moveX;
  if (!checkCollision(newX, player.position.z)) {
    player.position.x = newX;
  }
  
  // Check collision for Z movement
  const newZ = player.position.z + moveZ;
  if (!checkCollision(player.position.x, newZ)) {
    player.position.z = newZ;
  }

  if (isJumping) {
    player.position.y += playerVelocityY;
    playerVelocityY -= gravity;
    if (player.position.y <= 0.5) {
      player.position.y = 0.5;
      isJumping = false;
      playerVelocityY = 0;
    }
  }

  // Handle door animations
  animateDoors();
  
  // Check for nearby doors and show UI if needed
  const nearestDoor = getNearestDoor();
  if (nearestDoor) {
    doorUI.style.display = 'block';
  } else {
    doorUI.style.display = 'none';
  }

  const camHeight = cameraPositions[currentCameraViewIdx].height.add;
  camera.position.set(
    player.position.x,
    player.position.y + camHeight,
    player.position.z,
  );

  // Calculate direction vector based on both yaw and pitch
  const dirX = Math.sin(lookDirection) * Math.cos(lookVertical);
  const dirY = Math.sin(lookVertical);
  const dirZ = -Math.cos(lookDirection) * Math.cos(lookVertical);

  camera.lookAt(
    player.position.x + dirX,
    player.position.y + camHeight + dirY,
    player.position.z + dirZ
  );

  // Update the flashlight's position based on the camera's direction
  flashlight.position.set(
    player.position.x,
    player.position.y,
    player.position.z,
  );

  // Update the flashlight target position based on the camera's look direction
  flashlight.target.position.set(
    player.position.x + dirX,
    player.position.y + dirY,
    player.position.z + dirZ);

  // Set the flashlight's angle to simulate a beam
  flashlight.angle = flashlightFocus;
  flashlight.visible = flashlightOn; // Toggle visibility with flashlightOn

  player.rotation.y = -lookDirection;
  renderer.render(scene, camera);
}
animate();

const onMouseMove = (event) => {
  const sensitivity = 0.005;
  lookDirection += event.movementX * sensitivity;
  lookVertical -= event.movementY * sensitivity;

  // Clamp vertical look between -80° and 80°
  const maxPitch = Math.PI / 2.5;
  lookVertical = Math.max(-maxPitch, Math.min(maxPitch, lookVertical));
}
document.addEventListener('mousemove', onMouseMove);

document.body.addEventListener('click', () => {
  if (document.pointerLockElement !== document.body) {
    document.body.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === document.body) {
    console.log("Pointer locked");
    // Start listening to mouse move
    document.addEventListener("mousemove", onMouseMove);
  } else {
    console.log("Pointer unlocked");
    // Stop listening to mouse move
    document.removeEventListener("mousemove", onMouseMove);
  }
});
