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

let flashlightFocus = Math.PI / 2; // Default cone angle (45 degrees)
const flashlightFocusChangeSpeed = 0.05; // Speed of focusing/narrowing the beam

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x444444 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Player
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ffcc })
);
player.position.set(-12, 0, 12); // Starting in About Me room
scene.add(player);

let currentCameraViewIdx = 2;
let cameraPositions = [
  { height: { base: player.position.y, add: 0.5 }, angleMultiplyer: 1 },
  { height: { base: player.position.y, add: 2.5 }, angleMultiplyer: 1.25 },
  { height: { base: player.position.y, add: 50 }, angleMultiplyer: 100 },
];
const getNextCameraViewIdx = () => {
  if (!cameraPositions[currentCameraViewIdx + 1]) return 0;
  else return currentCameraViewIdx + 1
}
const toggleCamera = () => {
  currentCameraViewIdx = getNextCameraViewIdx()
}

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
const walls = [];

function createWall(x, y, z, scaleX, scaleY, scaleZ) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    wallMaterial
  );
  wall.position.set(x, y, z);
  wall.scale.set(scaleX, scaleY, scaleZ);
  scene.add(wall);
  walls.push(wall);
}

// Room boundaries
const half = 5;
const height = 0.5;

// Add walls between/around 4 rooms (2x2 grid of 10x10 units)
for (let x = -10; x <= 10; x += 10) {
  for (let z = -10; z <= 10; z += 10) {
    // Top wall
    createWall(x, height / 2, z + half, 10, height, 0.5);
    // Bottom wall
    createWall(x, height / 2, z - half, 10, height, 0.5);
    // Left wall
    createWall(x - half, height / 2, z, 0.5, height, 10);
    // Right wall
    createWall(x + half, height / 2, z, 0.5, height, 10);
  }
}

// Movement
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function checkCollision(x, z) {
  for (const wall of walls) {
    const dx = Math.abs(x - wall.position.x);
    const dz = Math.abs(z - wall.position.z);
    const combinedX = (wall.scale.x / 2) + 0.5;
    const combinedZ = (wall.scale.z / 2) + 0.5;

    if (dx < combinedX && dz < combinedZ) {
      return true;
    }
  }
  return false;
}

let playerRotation = 0; // in radians (0 = forward along -Z)

// Flashlight (Spotlight) setup
const flashlight = new THREE.SpotLight(0xffffff, 5, 50, Math.PI / 4, 0.1, 2);
// Flashlight: position it in front of the player's face
const flashlightDistance = 0.5; // Adjust this distance based on where the flashlight should be
flashlight.position.set(
  player.position.x + Math.sin(playerRotation) * flashlightDistance, // Move it in front of the player
  player.position.y + 0.5,  // Height is around the head level
  player.position.z - Math.cos(playerRotation) * flashlightDistance
);
scene.add(flashlight);

// Make it follow the player (later in animate function)
flashlight.target = new THREE.Object3D();
scene.add(flashlight.target);



  let flashlightOn = true; // Initially, the flashlight is on

// Event listener for 'F' key press to toggle flashlight
document.addEventListener('keydown', (event) => {
  if (event.key === 'f' || event.key === 'F') {
    flashlightOn = !flashlightOn; // Toggle flashlight state
  }
});
// Event listener for 'C' key press to toggle flashlight
document.addEventListener('keydown', (event) => {
  if (event.key === 'c' || event.key === 'C') {
    toggleCamera();
  }
});

let isJumping = false;  // Flag to check if the player is currently jumping
let jumpSpeed = 0.2;    // Speed of the jump
let gravity = 0.01;     // The gravity applied to the player
let playerVelocityY = 0; // Player's velocity in the y-axis (vertical movement)

// Function to detect if the player is on the ground (simplified version)
function isOnGround() {
  return player.position.y <= 0.5;
}



function animate() {
  requestAnimationFrame(animate);

  // Rotate left/right
  const turnSpeed = 0.05;
if (keys["ArrowLeft"] || keys["a"] || keys["A"])  playerRotation -= turnSpeed;
if (keys["ArrowRight"] || keys["d"] || keys["D"]) playerRotation += turnSpeed;

  // Move forward/backward based on direction
  const speed = 0.1;
  const dx = Math.sin(playerRotation) * speed;
  const dz = Math.cos(playerRotation) * speed;

  let newX = player.position.x;
  let newZ = player.position.z;

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    //if (keys["Shift"]) flashlightFocus -= flashlightFocusChangeSpeed;  // Narrow beam
    newX += dx;
    newZ -= dz; 
  }
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    //if (keys["Shift"]) flashlightFocus += flashlightFocusChangeSpeed;  // Widen beam
    newX -= dx;
    newZ += dz; 
  }

  // Jump mechanic - only allow jumping if on the ground
  if (keys[" "] && !isJumping && isOnGround()) {
    isJumping = true;
    playerVelocityY = jumpSpeed; // Start the jump by applying upward velocity
  }

  // Apply movement with collision
  if (!checkCollision(newX, player.position.z)) {
    player.position.x = newX;
  }
  if (!checkCollision(player.position.x, newZ)) {
    player.position.z = newZ;
  }

  // Apply gravity
  if (isJumping) {
    player.position.y += playerVelocityY;
    playerVelocityY -= gravity; // Apply gravity (negative velocity)

    // Check if player has landed
    if (player.position.y <= 0.5) { // Player has landed on the ground
      player.position.y = 0.5; // Prevent player from going below ground (set to player's height)
      isJumping = false; // Stop jumping
      playerVelocityY = 0; // Reset velocity
    }
  }

  // Adjust camera position to be at a lower height
  camera.position.set(
    player.position.x,
    player.position.y + cameraPositions[currentCameraViewIdx].height.add,
    player.position.z,
  ); // Lower the camera height
  camera.rotation.set(-Math.PI / 30, playerRotation, 0); // Rotate camera to decrease angle of view



  // Look in the direction of rotation
  const lookX = player.position.x + Math.sin(playerRotation);
  const lookZ = player.position.z - Math.cos(playerRotation);
  const lookAtYJumpDiff = (!isOnGround() && Math.abs(playerVelocityY/6) || 0);
  camera.lookAt(
    lookX,
    player.position.y + cameraPositions[currentCameraViewIdx].height.add - cameraPositions[currentCameraViewIdx].height.add/10 + lookAtYJumpDiff,
    lookZ,
  );


// Flashlight: position it in front of the player's face
const flashlightDistance = 0.5; // Adjust this distance based on where the flashlight should be
flashlight.position.set(
  player.position.x + Math.sin(playerRotation) * flashlightDistance, // Move it in front of the player
  player.position.y + 0.5,  // Height is around the head level
  player.position.z - Math.cos(playerRotation) * flashlightDistance
);
// Make the flashlight beam point in the direction the player is looking
flashlight.target.position.set(
  player.position.x + Math.sin(playerRotation) * 5,  // Shine in front
  player.position.y + 0.5,
  player.position.z - Math.cos(playerRotation) * 5
);
  // Limit the flashlight's cone angle to a reasonable range
  flashlightFocus = Math.max(Math.PI / 20, Math.min(Math.PI / 2.5, flashlightFocus)); // Between 360°/20 and 360°/2.5
  // Update the flashlight's spotlight angle (focus)
  flashlight.angle = flashlightFocus;
  // Toggle flashlight based on the flashlightOn state
  if (flashlightOn) {
    flashlight.visible = true;  // Turn flashlight on
  } else {
    flashlight.visible = false; // Turn flashlight off
  }


    player.rotation.y = -playerRotation; // Example if you have a character model
  renderer.render(scene, camera);
}
animate();

