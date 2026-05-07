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

        scene.add(model);

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
			
        } else {
            bossMixer = mixer;
            bossModel = model;
			bossAnimations = object.animations;

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
  updateLanes();
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
window.addEventListener("keydown", (e) => {
  if (!gameStarted) return;
    if (!allowedKeys.includes(e.code)) return;
	 if (isPaused) return;           // no gameplay input while paused
  let hitSomething = false;
  const hitY = uiCanvas.height - 150;

  notes.forEach(note => {
    if (!note.hit && note.key === e.code) {
      const distance = Math.abs(note.y - hitY);

      if (distance < 20) {
        note.hit = true;
        combo++;
        updateMultiplier();
        score += 10 * multiplier;

        triggerFeedback("PERFECT!", "cyan", 25);
        triggerComboPopup(combo);
        hitSomething = true;
laneGlow[e.code] = 10; // glow for 10 frames
laneFlash[e.code] = 8; // flash for 8 frames
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
		laneGlow[e.code] = 10; // glow for 10 frames
		laneFlash[e.code] = 8; // flash for 8 frames
hitNotes++;
totalgoods++;
      }
    }
  });
if (hidescorecombo == 0) {
  if (!hitSomething) {
    combo = 0;
    multiplier = 1;
    if (score > 0) score -= 10;

    triggerFeedback("MISS", "red", 25);
    //triggerScreenShake(8, 12);
	    missFlash = 10;
		misscount++;
		playSlice();
		combonotsure = 1;
	    comboinaction = 0;
  }
  }
});
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

  const hitY = uiCanvas.height - 150;

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
ctx.arc(x, hitY, 15, 0, Math.PI * 2);
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
  ctx.fillText("Score: " + score, scoreposition, 40);
  ctx.fillText("Combo: " + combo, comboposition, 70);
}
  if (hidescorecombo == 0) {
  const bossText = "Boss Target: " + targetScore;
  const textWidth = ctx.measureText(bossText).width;
  ctx.fillText(bossText, uiCanvas.width - textWidth - bossscoreposition, 40);
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

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
	    ctx.textAlign = "center";

    ctx.fillText("Boss Score: " + targetScore, uiCanvas.width / 2, 380);


    ctx.font = "60px Arial";
    ctx.textAlign = "center";
	

    if (score >= targetScore) {
        ctx.fillStyle = "lime";
        ctx.fillText("YOU WIN!", uiCanvas.width / 2, 90);
        playPlayerAnimation(4); // win
		playBossAnimation(2); // lose
		
    } else {
        ctx.fillStyle = "red";
        ctx.fillText("YOU LOSE!", uiCanvas.width / 2, 90);
        playPlayerAnimation(2); // lose
		playBossAnimation(4); // lose
    }

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
	
	
    ctx.fillText("Missed: " + misscount, uiCanvas.width / 2, 170);	
    ctx.fillText("Perfect: " + totalperfects, uiCanvas.width / 2, 200);
    ctx.fillText("Good: " + totalgoods, uiCanvas.width / 2, 230);	
    ctx.fillText("Accuracy: " + accuracy + "%", uiCanvas.width / 2, 260);
    ctx.fillText("Score: " + score, uiCanvas.width / 2, 290);	
	ctx.fillText("Best Combo: " + trackcombos, uiCanvas.width / 2, 320);	
	
	
if (highScore > 0) {
    ctx.fillText("High Score: " + highScore, uiCanvas.width / 2, 410);
}


// --------------------
// RESULTS BUTTONS
// --------------------
const btnWidth = 200;
const btnHeight = 60;

const okX = uiCanvas.width / 2 - btnWidth - 20;   // left button
const restartX = uiCanvas.width / 2 + 20;         // right button
const btnY = uiCanvas.height - 120;

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
    scoreposition = 60;
	comboposition = 66;
	bossscoreposition = -66

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

window.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener("mouseup", () => {
    isDragging = false;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    yaw -= dx * 0.01;      // horizontal spin
    pitch -= dy * 0.01;    // vertical tilt

    // clamp pitch so model never flips
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));

    lastX = e.clientX;
    lastY = e.clientY;
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
