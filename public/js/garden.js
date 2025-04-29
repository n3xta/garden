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
let floorBuffer; // Group to hold floor panels

const loader = new THREE.GLTFLoader();
let plantsArray = [];

const player = new Tone.Sampler({
  "C2": "/samples/melody/SO_CG_guzheng_note_low_E.wav",
  "E2": "/samples/melody/SO_CG_guzheng_note_midlow_E.wav",
  "G2": "/samples/melody/SO_CG_guzheng_note_midlow_G.wav",
  "A2": "/samples/melody/SO_CG_guzheng_note_midlow_A.wav",
  "C3": "/samples/melody/SO_CG_guzheng_note_mid_D.wav",
  "D3": "/samples/melody/SO_CG_guzheng_note_midhigh_D.wav",
  "E3": "/samples/melody/SO_CG_guzheng_note_midhigh_E.wav",
  "G3": "/samples/melody/SO_CG_guzheng_note_midhigh_G.wav",
  "A3": "/samples/melody/SO_CG_guzheng_note_midhigh_A.wav",
  "B3": "/samples/melody/SO_CG_guzheng_note_midhigh_B.wav",
  "C4": "/samples/melody/SO_CG_guzheng_note_high_D.wav",
  "E4": "/samples/melody/SO_CG_guzheng_note_high_E.wav",
  "G4": "/samples/melody/SO_CG_guzheng_note_high_G.wav",
  "A4": "/samples/melody/SO_CG_guzheng_note_high_A.wav",
  "B4": "/samples/melody/SO_CG_guzheng_note_high_B.wav"
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
      for (let i = 0; i < 50; i++) {
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

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(22, 18, 27);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('three-container').appendChild(renderer.domElement);

  // Enable Shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // --- Camera Control Limits ---
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;


  // Softer ambient light, slightly increased intensity
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased intensity
  scene.add(ambientLight);

  // Directional light from directly above
  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)// Slightly reduced intensity
  directionalLight.position.set(0, 50, 0); // Position directly overhead
  directionalLight.target.position.set(0, 0, 0); // Point straight down
  scene.add(directionalLight);
  scene.add(directionalLight.target); // Add target to scene

  // Configure shadow properties (adjust if needed)
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  // Optional: Adjust shadow camera bounds if needed for top-down view
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;

  const hemiLight = new THREE.HemisphereLight( 0xaaaaff, 0x444466, 0.5 ); // Sky color, ground color, intensity
  hemiLight.position.set( 0, 20, 0 );
  scene.add( hemiLight );


  // Create a group to hold the floor panels
  floorBuffer = new THREE.Group();
  floorBuffer.position.y = -1.3;
  scene.add(floorBuffer);

  const panelSize = 12.5;
  const panelScale = 40; // Scale for each individual panel

  loader.load('/3dassets/wooden_floor_panels_mid.glb', (gltf) => {
    const panelModel = gltf.scene;
    panelModel.scale.set(panelScale, panelScale, panelScale);

    // Enable shadows on the panel model before cloning
    panelModel.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    // Create 4 panels in a 2x2 grid
    const positions = [
      { x: -panelSize / 2, z: -panelSize / 2 },
      { x:  panelSize / 2, z: -panelSize / 2 },
      { x: -panelSize / 2, z:  panelSize / 2 },
      { x:  panelSize / 2, z:  panelSize / 2 },
    ];

    positions.forEach(pos => {
      const panelInstance = panelModel.clone();
      panelInstance.position.set(pos.x, 0, pos.z); // Position relative to floorBuffer
      panelInstance.rotation.y = -Math.PI / 5.6; // it just works
      floorBuffer.add(panelInstance);
    });

  }, undefined, (error) => {
    console.error('Error loading wooden floor:', error);
    // Fallback: Create 4 simple plane geometries if model fails
    const fallbackGeometry = new THREE.PlaneGeometry(panelSize, panelSize);
    const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });

    const positions = [
        { x: -panelSize / 2, z: -panelSize / 2 },
        { x:  panelSize / 2, z: -panelSize / 2 },
        { x: -panelSize / 2, z:  panelSize / 2 },
        { x:  panelSize / 2, z:  panelSize / 2 },
    ];

    positions.forEach(pos => {
        const fallbackPanel = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        fallbackPanel.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        fallbackPanel.position.set(pos.x, 0, pos.z); // Position relative to floorBuffer
        // Enable shadows for fallback panels
        fallbackPanel.castShadow = true;
        fallbackPanel.receiveShadow = true;
        floorBuffer.add(fallbackPanel);
    });
  });

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
      // Enable shadows for each mesh part
      child.castShadow = true;
      child.receiveShadow = true;

      const originalMaterial = child.material;
      // Use MeshStandardMaterial for better shadow interaction
      child.material = new THREE.MeshStandardMaterial({
        color: originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0xffffff, 0.5),
        map: originalMaterial.map || null,
        transparent: true,
        alphaTest: 0.5, // Keep alphaTest if needed for transparency 
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