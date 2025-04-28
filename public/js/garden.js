const nSteps = 16;
const nTracks = 28;
const baseOctave = 1;
const noteNames = ["C", "D", "E", "F", "G", "A", "B"];
let bpm = 80;
let currentStep = 0;
let beats = 0;
const cells = Array.from({ length: nTracks }, () => Array(nSteps).fill(0));
let ambientLight, directionalLight;

let scene, camera, renderer, controls;
let floor;
const plants = []; // Will store plants from loaded model
const plantedItems = []; // Will store planted instances

const loader = new THREE.GLTFLoader();
let plantsArray = [];

const player = new Tone.Sampler({
  "A1": "/samples/casio/A1.mp3",
  "C2": "/samples/casio/C2.mp3",
  "E2": "/samples/casio/E2.mp3",
  "G2": "/samples/casio/G2.mp3"
}).toDestination();

Tone.Transport.scheduleRepeat(onBeat, "16n");

const playButton = document.getElementById('play-button');
const tempoSlider = document.getElementById('tempo-slider');
const randomButton = document.getElementById('random-note');

setup();

function setup() {
  initThree();
  loadPlantModels();
  initEvents();
  updateTempo();
}

function loadPlantModels() {
  // Load pack1
  loader.load('/3dassets/pack1.glb', (gltf) => {
    const pack1Plants = gltf.scene.children[0].children[0].children[0].children;
    
    // Add plants with scale metadata
    for (let plant of pack1Plants) {
      plantsArray.push({
        model: plant,
        scale: 1.5
      });
    }
    
    console.log('Pack1 plants loaded:', pack1Plants.length);
    
    // Load pack2
    loader.load('/3dassets/pack2.glb', (gltf) => {
      const pack2Plants = gltf.scene.children[0].children[0].children[0].children;
      
      // Add plants with scale metadata
      for (let plant of pack2Plants) {
        plantsArray.push({
          model: plant,
          scale: 2.3
        });
      }
      
      console.log('Pack2 plants loaded:', pack2Plants.length);
      console.log('Total plants loaded:', plantsArray.length);
      
      // Add some random notes after all plants are loaded
      for (let i = 0; i < 5; i++) {
        addRandomNote();
      }
    }, undefined, (error) => {
      console.error('Error loading pack2 GLTF model:', error);
    });
    
  }, undefined, (error) => {
    console.error('Error loading pack1 GLTF model:', error);
  });
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(15, 12, 18);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('three-container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  ambientLight.intensity = 0.6;
  scene.add(ambientLight);

  // const pointLight = new THREE.PointLight(0xffffff, 0.3);
  // pointLight.position.set(0, 10, 0);
  // scene.add(pointLight);

  // const pointLightHelper = new THREE.PointLightHelper(pointLight, 10);
  // scene.add(pointLightHelper);
  
  directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.intensity = 1.2;
  directionalLight.position.set(10, 10, 0);
  scene.add(directionalLight);  

  const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 3);
  scene.add(dirLightHelper);

  const floorGeometry = new THREE.CircleGeometry(15, 64);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  scene.add(floor);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onBeat(time) {
  for (let track = 0; track < nTracks; track++) {
    if (cells[track][currentStep] === 1) {
      const notePos = (nTracks - 1) - track;
      const octave = baseOctave + Math.floor(notePos / 7);
      const noteName = noteNames[notePos % 7];
      const pitch = noteName + octave;

      player.triggerAttack(pitch, time);
      animatePlant(track, currentStep);
    }
  }
  beats++;
  currentStep = beats % nSteps;
}

function addRandomNote() {
  const randomTime = Math.floor(Math.random() * nSteps);
  const randomTrack = Math.floor(Math.random() * nTracks);

  if (cells[randomTrack][randomTime] === 1) {
    return addRandomNote(); // Retry if occupied
  }

  cells[randomTrack][randomTime] = 1;
  createPlant(randomTrack, randomTime);
}

function createPlant(track, step) {
  const randomPlantIndex = Math.floor(Math.random() * plantsArray.length);
  const selectedPlantData = plantsArray[randomPlantIndex];
  const selectedPlant = selectedPlantData.model.clone();

  selectedPlant.traverse((child) => {
    if (child.isMesh) {
      const originalMaterial = child.material;
      child.material = new THREE.MeshToonMaterial({
        color: originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0xffffff),
        map: originalMaterial.map || null,
        transparent: true,
        alphaTest: 0.5, 
      });
    }
  });
  
  // Calculate position
  const radius = 5 + Math.random() * 7; // 还是会撞车！！
  const angle = (step / nSteps) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Apply scale from the plant data
  const plantScale = selectedPlantData.scale;
  selectedPlant.scale.set(plantScale, plantScale, plantScale);
  selectedPlant.position.set(x, 0, z);
  
  // Store track and step information
  selectedPlant.userData = {
    track: track,
    step: step,
    originalY: 0, // Base position for animation
  };
  
  scene.add(selectedPlant);
  plantedItems.push(selectedPlant);
}

function animatePlant(track, step) {
  const plant = plantedItems.find(p => p.userData.track === track && p.userData.step === step);
  if (!plant) return;

  const originalY = plant.position.y;
  let frame = 0;
  const frames = 20;

  function jump() {
    if (frame < frames) {
      const progress = frame / frames;
      plant.position.y = originalY + Math.sin(progress * Math.PI) * 0.3;
      frame++;
      requestAnimationFrame(jump);
    } else {
      plant.position.y = originalY;
    }
  }
  jump();
}

function initEvents() {
  playButton.addEventListener('click', togglePlay);
  randomButton.addEventListener('click', addRandomNote);
  tempoSlider.addEventListener('input', updateTempo);
}

async function togglePlay() {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
  if (Tone.Transport.state === 'started') {
    Tone.Transport.pause();
    playButton.innerText = 'PLAY';
  } else {
    Tone.Transport.start();
    playButton.innerText = 'PAUSE';
  }
}

function updateTempo() {
  bpm = parseInt(tempoSlider.value);
  Tone.Transport.bpm.rampTo(bpm, 0.1);
}