import * as THREE from "three";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/DRACOLoader.js";
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/libs/draco/");

gltfLoader.setDRACOLoader(dracoLoader);
// --------------------
// CONFIG
// --------------------
let combonotsure = 0;
let playerAnimations = [];
let bossAnimations = [];
let comboinaction = 0;
let bossCurrentAction = null;
let pauseButton = null;
let showdetailsfinal = 0;
let lastButtonPress = 0;
const buttonCooldown = 300; // milliseconds
const loadingFrames = [];
const totalFrames = 39; // change to how many images you have
let loadingFrameIndex = 0;
let loadingTimer = 0;
const loadingFPS = 12; // animation speed
//MODEL POSITION FIXES

const song1 = 0;
const song2 = 0;
const allowedKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyZ", "KeyX"];

let scoreposition = 20;
let comboposition = 20;
let bossscoreposition = 20;

let restartButton = null;
let quitButton = null;
let retryButton = null;
const keys = ["KeyZ", "KeyX", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const lanes = {};
const spacing = 70;
let playerModel;
let bossModel;
let isDragging = false;
let lastX = 0;
let lastY = 0;

let yaw = 0;
let pitch = 0;
const pitchLimit = 0;

let isPaused = false;
let pauseMenuVisible = false;


// --------------------
// FULL BOARD MISS FLASH
// --------------------
let missFlash = 0;
let misscount = 0;
// --------------------
// ACCURACY TRACKING
// --------------------
let totalNotes = 0;
let hitNotes = 0;
let accuracy = 0;
let songFinished = false;
let totalgoods = 0
let totalperfects = 0
let trackcombos = 0
let hidescorecombo = 0

// --------------------
// LANE GLOW EFFECT
// --------------------
const laneGlow = {};
keys.forEach(key => laneGlow[key] = 0);

// --------------------
// LANE FLASH EFFECT
// --------------------
const laneFlash = {};
keys.forEach(key => laneFlash[key] = 0);


// --------------------
// NOTE ICONS
// --------------------
const noteImages = {
  ArrowUp: new Image(),
  ArrowDown: new Image(),
  ArrowLeft: new Image(),
  ArrowRight: new Image(),
  KeyZ: new Image(),
  KeyX: new Image()
};

// load images from your folder
noteImages.ArrowUp.src = "./images/up.png";
noteImages.ArrowDown.src = "./images/down.png";
noteImages.ArrowLeft.src = "./images/left.png";
noteImages.ArrowRight.src = "./images/right.png";
noteImages.KeyZ.src = "./images/Z.png";
noteImages.KeyX.src = "./images/X.png";


function updateCharacterPositions() {

    const aspect = window.innerWidth / window.innerHeight;

    // portrait tablet/phone
    if (aspect < 1) {

        if (playerModel) {
            playerModel.position.x = -2.8;
        }

        if (bossModel) {
            bossModel.position.x = 2.8;
        }

        camera.position.z = 9;
    }

    // landscape ============================================================(HERE IS LANDSCAPE CODE
    else {

        if (playerModel) {
            playerModel.position.x = -3.5;
        }

        if (bossModel) {
            bossModel.position.x = 3.5;
        }

        camera.position.z = 7;
    }
}


function handlePointer(x, y) {

  // OK button
  if (okButton &&
      x > okButton.x && x < okButton.x + okButton.w &&
      y > okButton.y && y < okButton.y + okButton.h) {
    window.location.href = "index.html";
  }

  // Restart button
  if (restartButton &&
      x > restartButton.x && x < restartButton.x + restartButton.w &&
      y > restartButton.y && y < restartButton.y + restartButton.h) {
    restartLevel();
  }

  // Pause menu buttons
  if (pauseMenuVisible) {
    if (
      x > quitButton.x &&
      x < quitButton.x + quitButton.w &&
      y > quitButton.y &&
      y < quitButton.y + quitButton.h
    ) {
      window.location.href = "index.html";
    }

    if (
      x > retryButton.x &&
      x < retryButton.x + retryButton.w &&
      y > retryButton.y &&
      y < retryButton.y + retryButton.h
    ) {
      pauseMenuVisible = false;
      isPaused = false;
      restartLevel();
    }
  }
}

function handleKeyPress(code) {
  if (!gameStarted) return;
  if (!allowedKeys.includes(code)) return;
  if (isPaused) return;

  let hitSomething = false;
  const hitY = uiCanvas.height - 25;

  notes.forEach(note => {
    if (!note.hit && note.key === code) {
      const distance = Math.abs(note.y - hitY);

      if (distance < 20) {
        note.hit = true;
        combo++;
        updateMultiplier();
        score += 10 * multiplier;

        triggerFeedback("PERFECT!", "cyan", 25);
        triggerComboPopup(combo);
        hitSomething = true;

        laneGlow[code] = 10;
        laneFlash[code] = 8;

        hitNotes++;
        totalperfects++;

      } else if (distance < 50) {
        note.hit = true;
        combo++;
        updateMultiplier();
        score += 5 * multiplier;

        triggerFeedback("GOOD", "yellow", 20);
        triggerComboPopup(combo);
        hitSomething = true;

        laneGlow[code] = 10;
        laneFlash[code] = 8;

        hitNotes++;
        totalgoods++;
      }
    }
  });

  if (hidescorecombo == 0 && !hitSomething) {
    combo = 0;
    multiplier = 1;
    if (score > 0) score -= 10;

    triggerFeedback("MISS", "red", 25);
    missFlash = 10;
    misscount++;
    playSlice();
    combonotsure = 1;
    comboinaction = 0;
  }
}

// --------------------
// STATE
// --------------------
let levelData;
let chart = [];
let chartIndex = 0;

let audio;
let assetsToLoad = 2;
let assetsLoaded = 0;

let assetsReady = false;
let menuActive = true;
let gameStarted = false;

// GAME DATA
let notes = [];
let score = 0;
let combo = 0;
let multiplier = 1;

let targetScore = 0;

// FEEDBACK SYSTEM
let feedbackText = "";
let feedbackColor = "white";
let feedbackAlpha = 1;
let feedbackTimer = 0;

// COMBO POPUP
let comboPopup = "";
let comboAlpha = 0;

// SCREEN SHAKE
let shakeTime = 0;
let shakeIntensity = 0;

// --------------------
// SCENE SETUP
// --------------------



function setCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decoded = decodeURIComponent(document.cookie);
    const parts = decoded.split(';');
    for (let c of parts) {
        c = c.trim();
        if (c.indexOf(cname) === 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}



const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const playerLight = new THREE.DirectionalLight(0xffffff, 0.6);
playerLight.position.set(-5.5, 10, 0);
playerLight.target.position.set(-5.5, -2, 0);
scene.add(playerLight);
scene.add(playerLight.target);

const bossLight = new THREE.DirectionalLight(0xff3333, 0.6);
bossLight.position.set(5.5, 10, 0);
bossLight.target.position.set(5.5, -2, 0);
scene.add(bossLight);
scene.add(bossLight.target);

// --------------------
// FBX LOADER
// --------------------
const loader = new FBXLoader();
let playerMixer;
let bossMixer;

  const params = new URLSearchParams(window.location.search);
  const levelName = params.get("level") || "song1";

let highScore = parseInt(getCookie("highscore_" + levelName) || "0");


// --------------------
// LOAD LEVEL JSON
// --------------------
async function loadLevel() {
  const params = new URLSearchParams(window.location.search);
  const levelName = params.get("level") || "song1";

  const res = await fetch("./songs/" + levelName + ".json");
  levelData = await res.json();

  chart = levelData.notes;
  totalNotes = chart.length;

  // ? GET TARGET SCORE FROM JSON
  targetScore = levelData.targetScore || 5000;

  audio = new Audio(levelData.music.audio);
  audio.preload = "auto";

}


function togglePause() {
    if (!pauseMenuVisible) {
        // PAUSE
        isPaused = true;
        pauseMenuVisible = true;

        audio.pause();   // stop music
    } else {
        // RESUME
        isPaused = false;
        pauseMenuVisible = false;

        audio.play();    // resume music
    }
}


// --------------------
// LOAD CHARACTER
// --------------------
function loadCharacter(path, xPos, isPlayer, scaleOverride) {
    const ext = path.split('.').pop().toLowerCase();

    const onLoad = (object) => {
        const model = object.scene || object; // GLB uses .scene, FBX is direct

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const scale = (scaleOverride || 5.7) / size.y;
        model.scale.setScalar(scale);
        model.position.set(xPos, -2, 0);

        // Face toward center
        if (isPlayer) model.rotation.y = Math.PI / 2;
        else model.rotation.y = -Math.PI / 2;



const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

if (isTouchDevice) {

if (isPlayer) {
model.position.x += 1.5;
}

}



        scene.add(model);
updateCharacterPositions();

        const mixer = new THREE.AnimationMixer(model);

        // GLB animations ? object.animations
        // FBX animations ? object.animations
        if (object.animations?.length > 0) {
            mixer.clipAction(object.animations[1]).play();
        }

        if (isPlayer) {
            playerMixer = mixer;
            playerModel = model;
			playerAnimations = object.animations;
			window.playerModel = model
			
        } else {
            bossMixer = mixer;
            bossModel = model;
			bossAnimations = object.animations;
window.bossModel = model;
        }
		

if (isPlayer) {
    model.position.y -= 2.5;   // raise boss by 1 unit
}	
if (!isPlayer) {
    model.position.y -= 2.5;   // raise boss by 1 unit
}	
		



		
		
if (levelName == "song2") {

if (!isPlayer) {
    model.position.y += 5.5;   // raise boss by 1 unit
}

}
if (levelName == "song1") {

if (!isPlayer) {
    model.position.y += 0.1;   // raise boss by 1 unit
	model.scale.set(6, 6, 6);
}

}
if (levelName == "song3") {

if (!isPlayer) {
    model.position.y -= 0.5;   // raise boss by 1 unit
	model.scale.set(6, 6, 6);
	model.rotation.y = 46; // turn around (face forward)
}

}
if (levelName == "song4") {

if (!isPlayer) {
    model.position.y -= 0.5;   // raise boss by 1 unit
	model.scale.set(6, 6, 6);
	model.rotation.y = 46; // turn around (face forward)

}

}




        assetsLoaded++;
        checkIfReady();
    };

    // Choose loader based on extension
    if (ext === "fbx") {
        fbxLoader.load(path, onLoad);
    } else if (ext === "glb" || ext === "gltf") {
        gltfLoader.load(path, onLoad);
    } else {
        console.error("Unsupported model format:", path);
    }
}



// --------------------
// LOAD CHARACTERS
// --------------------
function loadLevelCharacters() {

  loadCharacter(
    levelData.player.model,
    levelData.player.x,
    true,
    levelData.player.scale
  );

  loadCharacter(
    levelData.boss.model,
    levelData.boss.x,
    false,
    levelData.boss.scale
  );
  
}

// --------------------
// READY CHECK
// --------------------
function checkIfReady() {
  if (assetsLoaded >= assetsToLoad && audio) {
    assetsReady = true;
  }
}

// --------------------
// START LEVEL
// --------------------
function startLevel() {
  menuActive = false;
  gameStarted = true;

  chartIndex = 0;
  notes = [];

  score = 0;
  combo = 0;
  multiplier = 1;

  audio.currentTime = 0;
  audio.play();
  
  hitNotes = 0;
accuracy = 0;
songFinished = false;

}


// Miss Sound Effects

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundBuffer = null;

async function loadSound() {
  const response = await fetch("images/misseffect.mp3");
  const arrayBuffer = await response.arrayBuffer();
  soundBuffer = await audioCtx.decodeAudioData(arrayBuffer);
}

function playSlice() {
  if (!soundBuffer) return;

  const source = audioCtx.createBufferSource();
  source.buffer = soundBuffer;

  // pick a random 1-second slice
  const maxStart = soundBuffer.duration - 1;
  const startTime = Math.random() * maxStart;

  source.connect(audioCtx.destination);

  source.start(0, startTime, 1); // (when, offset, duration)
}









// --------------------
// UI CANVAS
// --------------------
const uiCanvas = document.getElementById("ui");
const ctx = uiCanvas.getContext("2d");

function resize() {

    renderer.setSize(window.innerWidth, window.innerHeight);

    uiCanvas.width = window.innerWidth;
    uiCanvas.height = window.innerHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    updateLanes();
    updateCharacterPositions();
}
window.addEventListener("resize", resize);
resize();

// --------------------
// LANES
// --------------------
function updateLanes() {
  const centerX = uiCanvas.width / 2;
  keys.forEach((key, i) => {
    lanes[key] = centerX + (i - (keys.length - 1) / 2) * spacing;
  });
}

// --------------------
// FEEDBACK HELPERS
// --------------------
function triggerFeedback(text, color, duration = 20) {
  feedbackText = text;
  feedbackColor = color;
  feedbackTimer = duration;
  feedbackAlpha = 1;
}

function triggerComboPopup(combo) {
  if (combo < 2) return;
  comboPopup = combo + "x Combo!";
  comboAlpha = 1;
  
  if (trackcombos <= combo) {
  trackcombos = combo;
  }
  
  
}

function triggerScreenShake(intensity = 10, time = 10) {
  shakeIntensity = intensity;
  shakeTime = time;
}

function updateMultiplier() {
  if (combo >= 40) multiplier = 4;
  else if (combo >= 25) multiplier = 3;
  else if (combo >= 10) multiplier = 2;
  else multiplier = 1;
}

// --------------------
// CHART SYSTEM
// --------------------
const travelTime = 2000; // ms from spawn to hit line

function updateChart() {
  if (!gameStarted || !audio) return;

  const currentTime = audio.currentTime * 1000;

  while (
    chartIndex < chart.length &&
    chart[chartIndex].time <= currentTime + travelTime
  ) {
    const noteData = chart[chartIndex];

    notes.push({
      key: noteData.key,
      x: lanes[noteData.key],
      time: noteData.time,
      hit: false
    });

    chartIndex++;
  }
}

// --------------------
// INPUT (GAMEPLAY)
// --------------------
window.addEventListener("click", handlePausePress);
window.addEventListener("touchstart", handlePausePress);

window.addEventListener("keydown", (e) => {
handleKeyPress(e.code);
});
window.addEventListener("touchstart", (e) => {
  if (!gameStarted || isPaused) return;

  e.preventDefault();

  const rect = uiCanvas.getBoundingClientRect();
  const hitY = uiCanvas.height - 25;
  const radius = 40;

  for (let touch of e.touches) {
    const tx = touch.clientX - rect.left;
    const ty = touch.clientY - rect.top;

    keys.forEach(key => {
      const cx = lanes[key];
      const cy = hitY;

      const dx = tx - cx;
      const dy = ty - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        console.log("TOUCH:", key); // DEBUG
        handleKeyPress(key);
      }
    });
  }
}, { passive: false });
function restartLevel() {


    chartIndex = 0;
    notes = [];
    score = 0;
    combo = 0;
    multiplier = 1;
    hitNotes = 0;
    totalgoods = 0;
    totalperfects = 0;
    misscount = 0;
    trackcombos = 0;
    hidescorecombo = 0;
    scoreposition = 60;
	comboposition = 66;
	bossscoreposition = -66
    songFinished = false;

    audio.pause();
    audio.currentTime = 0;
    audio.play();

    gameStarted = true;
    menuActive = false;
	playPlayerAnimation(1); // lose
	playBossAnimation(1); // lose
	
	scoreposition = 25;
	comboposition = 25;
	bossscoreposition = 25
	    audio.pause();
    audio.currentTime = 0;
    audio.play();
	songFinished = false;

}

//Restart Level -==================   THIS IS NOW NOT VALID =================================================
function restartSong() {

    audio.pause();
    audio.currentTime = 0;

    chartIndex = 0;
    notes = [];
hidescorecombo = 0;
    score = 0;
    combo = 0;
    multiplier = 1;

    audio.play();
}
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        togglePause();
    }
});
let resultAnimationPlayed = false;
let playerCurrentAction = null;

function playBossAnimation(index) {
    if (!bossMixer || !bossAnimations[index]) return;

    const action = bossMixer.clipAction(bossAnimations[index]);

    if (bossCurrentAction === action) return;

    if (bossCurrentAction) {
        bossCurrentAction.fadeOut(0.2);
    }

    action.reset().fadeIn(0.2).play();
    bossCurrentAction = action;
}


function playPlayerAnimation(index) {
    if (!playerMixer || !playerAnimations[index]) return;

    const action = playerMixer.clipAction(playerAnimations[index]);

    if (playerCurrentAction === action) return;

    if (playerCurrentAction) {
        playerCurrentAction.fadeOut(0.2);
    }

    action.reset().fadeIn(0.2).play();
    playerCurrentAction = action;
}

for (let i = 1; i <= totalFrames; i++) {
  const img = new Image();
  img.src = `images/loading/${i}.png`;
  loadingFrames.push(img);
}

function handlePausePress(e) {
    const now = Date.now();

    if (now - lastButtonPress < buttonCooldown) {
        return;
    }

    lastButtonPress = now;
    e.preventDefault();

    const rect = uiCanvas.getBoundingClientRect();

    let x;
    let y;

    // Touch
    if (e.touches && e.touches.length > 0) {

        x = (e.touches[0].clientX - rect.left) *
            (uiCanvas.width / rect.width);

        y = (e.touches[0].clientY - rect.top) *
            (uiCanvas.height / rect.height);

    } else {

        x = (e.clientX - rect.left) *
            (uiCanvas.width / rect.width);

        y = (e.clientY - rect.top) *
            (uiCanvas.height / rect.height);
    }

    console.log("pause click", x, y);
    console.log(pauseButton);

    if (!pauseButton) return;

    if (
        x >= pauseButton.x &&
        x <= pauseButton.x + pauseButton.w &&
        y >= pauseButton.y &&
        y <= pauseButton.y + pauseButton.h
    ) {
        console.log("PAUSE PRESSED");
        togglePause();
    }
}

let lastOrientation = "";

function detectOrientationChange() {

    const currentOrientation =
        window.innerWidth > window.innerHeight
            ? "landscape"
            : "portrait";

    if (currentOrientation !== lastOrientation) {

        lastOrientation = currentOrientation;

        if (currentOrientation === "landscape") {
            updateCharacterPositions();
        } else {
            updateCharacterPositions();
        }
    }
}

window.addEventListener("resize", detectOrientationChange);

detectOrientationChange();
// --------------------
// GAME LOOP
// --------------------
const clock = new THREE.Clock();



// Loading Images




function animate() {


  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  
  
  loadingTimer += 1 / 60; // assume 60fps

if (loadingTimer > 1 / loadingFPS) {
  loadingTimer = 0;
  
  loadingFrameIndex = (loadingFrameIndex + 1) % loadingFrames.length;
}
  
  
  
  
  
  if (playerModel) {
    playerModel.rotation.set(pitch, yaw + Math.PI / 2 + 5.3, 0);
}

if (bossModel) {
    bossModel.rotation.set(pitch, -yaw - Math.PI / 2 - 5.3, 0);
}

  
if (score < 0) {

score = 0;

}
  if (playerMixer) playerMixer.update(delta);
  if (bossMixer) bossMixer.update(delta);

  // SCREEN SHAKE
  if (shakeTime > 0) {
    camera.position.x += (Math.random() - 0.5) * shakeIntensity * 0.02;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.02;
    shakeTime--;
  }

  updateChart();
  
  
  
  // SONG FINISHED CHECK
if (gameStarted && !songFinished && audio.ended) {
    songFinished = true;

    // calculate accuracy
    accuracy = Math.round((hitNotes / totalNotes) * 100);
}

  
  
  
  
  renderer.render(scene, camera);
  drawUI();
}
animate();

// --------------------
// DRAW UI
// --------------------
function drawUI() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

  const hitY = uiCanvas.height - 25;

// LOADING SCREEN
if (!assetsReady) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);



  // text
  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.fillText("LOADING...", uiCanvas.width / 2 - 120, uiCanvas.height / 2 + 100);


  // draw animated frame
  const frame = loadingFrames[loadingFrameIndex];
  if (frame && frame.complete) {
    const size = 250;
    ctx.drawImage(
      frame,
      uiCanvas.width / 2 - size / 2,
      uiCanvas.height / 2 - size / 2 - 50,
      size,
      size
    );
  }



  return;
}

  // MENU SCREEN
  if (menuActive) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);


  // draw animated frame
  const frame = loadingFrames[loadingFrameIndex];
  if (frame && frame.complete) {
    const size = 250;
    ctx.drawImage(
      frame,
      uiCanvas.width / 2 - size / 2,
      uiCanvas.height / 2 - size / 2 - 50,
      size,
      size
    );
  }

    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText("LEVEL READY", uiCanvas.width / 2 - 160, uiCanvas.height / 2 - 120);

    const btnX = uiCanvas.width / 2 - 150;
    const btnY = uiCanvas.height / 2 + 50;

    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(btnX, btnY, 300, 80);

    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("START LEVEL", btnX + 50, btnY + 50);

    return;
  }


if (combo == 0) {
if (combonotsure == 1) {

playBossAnimation(1);
combonotsure = 0;
}
}








  // GAME UI
  if (hidescorecombo == 0) {
  keys.forEach(key => {
    const x = lanes[key];
// FULL BOARD MISS FLASH
if (missFlash > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255,0,0,0.25)";
    ctx.globalAlpha = missFlash / 10;
    ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
    ctx.restore();

    missFlash--;
    playPlayerAnimation(3); // lose
	    playPlayerAnimation(1); // lose
		
		
		
		
}

// LANE FLASH
if (laneFlash[key] > 0) {
    ctx.save();

    // choose flash color based on feedback
    if (feedbackText === "PERFECT!") ctx.fillStyle = "rgba(0,255,255,0.25)";
    else if (feedbackText === "GOOD") ctx.fillStyle = "rgba(255,255,0,0.25)";
    else if (feedbackText === "MISS") ctx.fillStyle = "rgba(255,0,0,0.25)";
    else ctx.fillStyle = "rgba(255,255,255,0.2)";

    ctx.globalAlpha = laneFlash[key] / 8;

    // draw full lane rectangle
    ctx.fillRect(x - spacing / 2, 0, spacing, uiCanvas.height);

    ctx.restore();

    laneFlash[key]--;
}

// lane line
ctx.strokeStyle = "#333";
ctx.beginPath();
ctx.moveTo(x, 0);
ctx.lineTo(x, uiCanvas.height);
ctx.stroke();


const glow = laneGlow[key];
if (glow > 0) {
  ctx.save();

  // dynamic glow color
  if (feedbackText === "PERFECT!") ctx.shadowColor = "cyan";
  else if (feedbackText === "GOOD") ctx.shadowColor = "yellow";
  else if (feedbackText === "MISS") ctx.shadowColor = "red";
  else ctx.shadowColor = "white"; // fallback

  ctx.shadowBlur = 20;
  ctx.globalAlpha = glow / 10;

  ctx.beginPath();
  ctx.arc(x, hitY, 20, 0, Math.PI * 2);

  // matching fill color
  if (feedbackText === "PERFECT!") ctx.fillStyle = "rgba(0,255,255,0.3)";
  else if (feedbackText === "GOOD") ctx.fillStyle = "rgba(255,255,0,0.3)";
  else if (feedbackText === "MISS") ctx.fillStyle = "rgba(255,0,0,0.3)";
  else ctx.fillStyle = "rgba(255,255,255,0.3)";

  ctx.fill();
  ctx.restore();

  laneGlow[key]--;
}



ctx.beginPath();
ctx.arc(x, hitY, 20, 0, Math.PI * 2);
ctx.strokeStyle = "white";
ctx.stroke();

  });

  // NOTES
// NOTES
notes.forEach(note => {
if (isPaused) return;   // freeze gameplay

  if (!note.hit) {

    const currentTime = audio.currentTime * 1000;

    const progress =
      (currentTime - (note.time - travelTime)) / travelTime;

    note.y = -50 + progress * (hitY + 50);

    if (progress > 1.2) {
      combo = 0;
      multiplier = 1;

      if (score > 0) score -= 10;

      triggerFeedback("MISS", "red", 25);
      //triggerScreenShake(8, 12);
	  playSlice();
combonotsure = 1;
      missFlash = 10;
      misscount++;
comboinaction = 0;
      note.hit = true;
    }

    const img = noteImages[note.key];

    if (img && img.complete) {
      ctx.drawImage(img, note.x - 20, note.y - 20, 40, 40);
    } else {
      ctx.fillStyle = "cyan";
      ctx.beginPath();
      ctx.arc(note.x, note.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
});

// cleanup
notes = notes.filter(n => !n.hit);

}

// Trigger Combo Animation
  if (combo > 19) {
    if (comboinaction == 0) {
playPlayerAnimation(0); // win
playBossAnimation(0); // lose
comboinaction = 1;
}
}


// UI TEXT
if (hidescorecombo == 0) {
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "left";

  ctx.fillText("Score: " + score, scoreposition, 40);
  ctx.fillText("Combo: " + combo, comboposition, 70);
}

if (hidescorecombo == 0) {
  const bossText = "Boss Target: " + targetScore;
  ctx.font = "24px Arial";
  ctx.textAlign = "right";

  const textWidth = ctx.measureText(bossText).width;
  const bossX = uiCanvas.width - bossscoreposition; // right-aligned anchor
  const bossY = 40;

  // Draw boss text
  ctx.fillText(bossText, bossX, bossY);

  // ==== PAUSE BUTTON UNDER BOSS TARGET ====
  const pauseSize = 30;
  const pauseX = bossX - pauseSize; // right side under boss text
  const pauseY = bossY + 20;        // a bit below the text

  // Button background
  ctx.fillStyle = "white";
  ctx.fillRect(pauseX, pauseY, pauseSize, pauseSize);

  // Pause icon (two bars)
  ctx.fillStyle = "black";
  ctx.fillRect(pauseX + 7,  pauseY + 5, 5, 20);
  ctx.fillRect(pauseX + 18, pauseY + 5, 5, 20);

  // Store for click/touch detection
  pauseButton = { x: pauseX, y: pauseY, w: pauseSize, h: pauseSize };
}

// FEEDBACK TEXT
if (feedbackTimer > 0) {
  ctx.save();
  ctx.globalAlpha = feedbackAlpha;

  ctx.fillStyle = feedbackColor;
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText(feedbackText, uiCanvas.width / 2, uiCanvas.height / 2 - 100);

  ctx.restore();

  feedbackTimer--;
  feedbackAlpha -= 0.03;
}


  // COMBO POPUP
  if (comboAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = comboAlpha;

    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(comboPopup, uiCanvas.width / 2, uiCanvas.height / 2 - 160);

    ctx.restore();

    comboAlpha -= 0.02;
  }

// END OF SONG RESULTS
if (songFinished) {

hidescorecombo = 1;
	if (score > highScore) {
    highScore = score;
    setCookie("highscore_" + levelName, highScore);
}

      pauseMenuVisible = false;
      isPaused = false;

// ===============================
// RESULTS SCREEN TEXT LAYOUT
// ===============================

// Center X
const cx = uiCanvas.width / 2;

// Vertical layout control
let startY = 90;       // top position for WIN/LOSE
const lineHeight = 30; // spacing between lines

// -------------------------------
// WIN / LOSE TITLE
// -------------------------------
ctx.textAlign = "center";
ctx.font = "60px Arial";

if (score >= targetScore) {
    ctx.fillStyle = "lime";
    ctx.fillText("YOU WIN!", cx, startY);
    playPlayerAnimation(4);
    playBossAnimation(2);
} else {
    ctx.fillStyle = "red";
    ctx.fillText("YOU LOSE!", cx, startY);
    playPlayerAnimation(2);
    playBossAnimation(4);
}

// Move down for next lines
startY += 70; // extra spacing after big title

// -------------------------------
// STATS (all white, uniform spacing)
// -------------------------------
ctx.fillStyle = "white";
ctx.font = "24px Arial";

// Boss Score
ctx.fillText("Boss Score: " + targetScore, cx, startY);
startY += lineHeight;

// Your Score
ctx.fillText("Your Score: " + score, cx, startY);
startY += lineHeight;

// Accuracy
ctx.fillText("Accuracy: " + accuracy + "%", cx, startY);
startY += lineHeight;

// Best Combo
ctx.fillText("Best Combo: " + trackcombos, cx, startY);
startY += lineHeight;

// Good
ctx.fillText("Good: " + totalgoods, cx, startY);
startY += lineHeight;

// Perfect
ctx.fillText("Perfect: " + totalperfects, cx, startY);
startY += lineHeight;

// Missed
ctx.fillText("Missed: " + misscount, cx, startY);
startY += lineHeight;

// Optional High Score
if (highScore > 0) {
    startY += 20; // small gap before high score
    ctx.fillText("High Score: " + highScore, cx, startY);
}


// --------------------
// RESULTS BUTTONS
// --------------------
const btnWidth = 110;
const btnHeight = 60;

const okX = uiCanvas.width / 2 - btnWidth - 20;   // left button
const restartX = uiCanvas.width / 2 + 20;         // right button
const btnY = startY + 40;

// OK BUTTON
ctx.fillStyle = "#00ffcc";
ctx.fillRect(okX, btnY, btnWidth, btnHeight);

ctx.fillStyle = "black";
ctx.font = "28px Arial";
ctx.textAlign = "center";
ctx.fillText("OK", okX + btnWidth / 2, btnY + 38);

// RESTART BUTTON
ctx.fillStyle = "#ffaa00";
ctx.fillRect(restartX, btnY, btnWidth, btnHeight);

ctx.fillStyle = "black";
ctx.font = "28px Arial";
ctx.fillText("Restart", restartX + btnWidth / 2, btnY + 38);

// store for click detection
okButton = { x: okX, y: btnY, w: btnWidth, h: btnHeight };
restartButton = { x: restartX, y: btnY, w: btnWidth, h: btnHeight };

}



if (pauseMenuVisible) {


    // dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);

    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Paused", uiCanvas.width / 2, 120);

    // buttons
    const btnWidth = 200;
    const btnHeight = 60;

    const quitX = uiCanvas.width / 2 - btnWidth - 20;
    const retryX = uiCanvas.width / 2 + 20;
    const btnY = uiCanvas.height / 2;

    // Quit button
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(quitX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = "black";
    ctx.font = "28px Arial";
    ctx.fillText("Quit", quitX + btnWidth / 2, btnY + 38);

    // Retry button
    ctx.fillStyle = "#ffaa00";
    ctx.fillRect(retryX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = "black";
    ctx.fillText("Retry", retryX + btnWidth / 2, btnY + 38);

    // store for click detection
    quitButton = { x: quitX, y: btnY, w: btnWidth, h: btnHeight };
    retryButton = { x: retryX, y: btnY, w: btnWidth, h: btnHeight };



    ctx.restore();
    return; // stop drawing gameplay UI
}



}

// --------------------
// INIT
// --------------------
async function init() {
  await loadLevel();
  loadLevelCharacters();
}
init();

// --------------------
// START BUTTON CLICK
// --------------------
document.addEventListener("click", (e) => {
  if (!assetsReady || !menuActive) return;
  
  
  loadSound();
  audioCtx.resume();

  const rect = uiCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const btnX = uiCanvas.width / 2 - 150;
  const btnY = uiCanvas.height / 2 + 50;
  const btnW = 300;
  const btnH = 80;

  if (x > btnX && x < btnX + btnW && y > btnY && y < btnY + btnH) {
    startLevel();
  }
});

let okButton = null;

document.addEventListener("click", (e) => {
  if (!okButton) return;

  const rect = uiCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (
    x > okButton.x &&
    x < okButton.x + okButton.w &&
    y > okButton.y &&
    y < okButton.y + okButton.h
  ) {
    window.location.href = "index.html";
  }
});

window.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener("touchend", () => {
    isDragging = false;
});

window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];

    const dx = touch.clientX - lastX;
    const dy = touch.clientY - lastY;

    yaw -= dx * 0.01;
    pitch -= dy * 0.01;

    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));

    lastX = touch.clientX;
    lastY = touch.clientY;
});

document.addEventListener("click", (e) => {
    if (!restartButton) return;

    const rect = uiCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (
        x > restartButton.x &&
        x < restartButton.x + restartButton.w &&
        y > restartButton.y &&
        y < restartButton.y + restartButton.h
    ) {
        restartLevel();
    }
});

document.addEventListener("click", (e) => {
    if (!pauseMenuVisible) return;

    const rect = uiCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Quit
    if (
        x > quitButton.x &&
        x < quitButton.x + quitButton.w &&
        y > quitButton.y &&
        y < quitButton.y + quitButton.h
    ) {
        window.location.href = "index.html";
    }

    // Retry
    if (
        x > retryButton.x &&
        x < retryButton.x + retryButton.w &&
        y > retryButton.y &&
        y < retryButton.y + retryButton.h
    ) {
        pauseMenuVisible = false;
        isPaused = false;
        restartLevel();
    }
});
window.addEventListener("touchstart", (e) => {

    const rect = uiCanvas.getBoundingClientRect();

    for (let touch of e.touches) {

        const x = (touch.clientX - rect.left) *
            (uiCanvas.width / rect.width);

        const y = (touch.clientY - rect.top) *
            (uiCanvas.height / rect.height);

        handlePointer(x, y);
    }

}, { passive: false });