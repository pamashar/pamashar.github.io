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
//const floor = new THREE.Mesh(
//  new THREE.PlaneGeometry(30, 30),
//  new THREE.MeshStandardMaterial({ color: 0x444444 })
//);
//floor.rotation.x = -Math.PI / 2;
//scene.add(floor);

// Player
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ffcc })
);
player.position.set(-20, 0.5, -20); // Centered in the room
scene.add(player);

let currentCameraViewIdx = 1;
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

function createWall(x, y, z, scaleX, scaleY, scaleZ) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x999999 })
  );
  wall.position.set(x, y, z);
  wall.scale.set(scaleX, scaleY, scaleZ);
  scene.add(wall);
  walls.push(wall);
}

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

// Function to create rooms (grid of rooms)
function createRooms({ cols = 1, rows = 1, roomSize = 10 }) {
  // Clear existing walls and labels from the scene
  for (const wall of walls) scene.remove(wall);
  walls.length = 0;

  const labelGroup = scene.getObjectByName("labels");
  if (labelGroup) scene.remove(labelGroup);

  const startX = -(cols * roomSize) / 2 + roomSize / 2;
  const startZ = -(rows * roomSize) / 2 + roomSize / 2;

  // Create the floor based on the number of rooms and their size
  const floorWidth = cols * roomSize;
  const floorDepth = rows * roomSize;

  // Create the floor (a large plane that covers the entire grid)
  const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Rotate it to lie flat on the ground
  floor.position.set(0, 0, 0); // Position the floor at the center of the scene
  scene.add(floor);

  // Create walls and labels for each room
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const roomX = startX + col * roomSize;
      const roomZ = startZ + row * roomSize;

      // Add 4 walls around the room
      const half = roomSize / 2;
      const height = 2;

      createWall(roomX, height / 2, roomZ - half, roomSize, height, 0.5); // Top
      createWall(roomX, height / 2, roomZ + half, roomSize, height, 0.5); // Bottom
      createWall(roomX - half, height / 2, roomZ, 0.5, height, roomSize); // Left
      createWall(roomX + half, height / 2, roomZ, 0.5, height, roomSize); // Right

      // Add label for this room
      addLabelToFloor(roomX, roomZ, `Room ${row * cols + col + 1}`);
    }
  }
}
createRooms({ cols: 2, rows: 2, roomSize: 30 });
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

let playerRotation = 0;

const flashlight = new THREE.SpotLight(0xffffff, 5, 50, Math.PI / 4, 0.1, 2);
const flashlightDistance = 0.5;
flashlight.position.set(
  player.position.x + Math.sin(playerRotation) * flashlightDistance,
  player.position.y + 0.5,
  player.position.z - Math.cos(playerRotation) * flashlightDistance
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

  const turnSpeed = 0.05;
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) playerRotation -= turnSpeed;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) playerRotation += turnSpeed;

  const speed = 0.1;
  const dx = Math.sin(playerRotation) * speed;
  const dz = Math.cos(playerRotation) * speed;

  let newX = player.position.x;
  let newZ = player.position.z;

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    newX += dx;
    newZ -= dz;
  }
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    newX -= dx;
    newZ += dz;
  }

  if (keys[" "] && !isJumping && isOnGround()) {
    isJumping = true;
    playerVelocityY = jumpSpeed;
  }

  if (!checkCollision(newX, player.position.z)) player.position.x = newX;
  if (!checkCollision(player.position.x, newZ)) player.position.z = newZ;

  if (isJumping) {
    player.position.y += playerVelocityY;
    playerVelocityY -= gravity;
    if (player.position.y <= 0.5) {
      player.position.y = 0.5;
      isJumping = false;
      playerVelocityY = 0;
    }
  }

  camera.position.set(
    player.position.x,
    player.position.y + cameraPositions[currentCameraViewIdx].height.add,
    player.position.z
  );
  camera.rotation.set(-Math.PI / 30, playerRotation, 0);

  const lookX = player.position.x + Math.sin(playerRotation);
  const lookZ = player.position.z - Math.cos(playerRotation);
  const lookAtYJumpDiff = (!isOnGround() && Math.abs(playerVelocityY / 6) || 0);
  camera.lookAt(
    lookX,
    player.position.y + cameraPositions[currentCameraViewIdx].height.add - cameraPositions[currentCameraViewIdx].height.add / 10 + lookAtYJumpDiff,
    lookZ
  );

  flashlight.position.set(
    player.position.x + Math.sin(playerRotation) * flashlightDistance,
    player.position.y + 0.5,
    player.position.z - Math.cos(playerRotation) * flashlightDistance
  );
  flashlight.target.position.set(
    player.position.x + Math.sin(playerRotation) * 5,
    player.position.y + 0.5,
    player.position.z - Math.cos(playerRotation) * 5
  );
  flashlightFocus = Math.max(Math.PI / 20, Math.min(Math.PI / 2.5, flashlightFocus));
  flashlight.angle = flashlightFocus;
  flashlight.visible = flashlightOn;

  player.rotation.y = -playerRotation;
  renderer.render(scene, camera);
}
animate();


