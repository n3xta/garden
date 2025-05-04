const nSteps = 16;
const nTracks = 28;
const baseOctave = 1;
const noteNames = ["C", "D", "E", "F", "G", "A", "B"];
let bpm = 80;
let currentStep = 0;
let beats = 0;
let ambientLight, directionalLight;

let scene, camera, renderer, controls;
let floor;
let plantedItems = [];
let floorBuffer;

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
  loadPlantModels(() => {
    initializeGardenFromData();
  });
  initEvents();
}

function initializeGardenFromData() {
  console.log("Initializing garden with data:", initialGardenData);
  
  plantedItems.forEach(item => scene.remove(item));
  plantedItems = [];

  bpm = initialGardenData.tempo || 80;
  tempoSlider.value = bpm;
  Tone.Transport.bpm.value = bpm;

  if (initialGardenData.plants && initialGardenData.plants.length > 0) {
    initialGardenData.plants.forEach(plantData => {
      if (plantData.plantModelIndex !== undefined) { 
        createPlant(plantData.track, plantData.step, plantData.plantModelIndex);
      } else {
          console.warn("Plant data missing model index, creating random plant instead:", plantData);
          createPlant(plantData.track, plantData.step); 
      }
    });
  } else {
    console.log("No initial plant data found, starting empty garden.");
  }
}

function loadPlantModels(callback) {
  let pack1Loaded = false;
  let pack2Loaded = false;
  let modelIndex = 0;

  function checkCompletion() {
      if (pack1Loaded && pack2Loaded) {
          console.log('Total plants loaded:', plantsArray.length);
          if (callback) callback();
      }
  }

  loader.load('/3dassets/pack1.glb', (gltf) => {
    const pack1Plants = gltf.scene.children[0].children[0].children[0].children;
    
    for (let plant of pack1Plants) {
      plantsArray.push({
        model: plant,
        scale: 1.5,
        originalIndex: modelIndex++
      });
    }
    console.log('Pack1 plants loaded:', pack1Plants.length);
    pack1Loaded = true;
    checkCompletion();
    
  }, undefined, (error) => {
    console.error('Error loading pack1 GLTF model:', error);
    pack1Loaded = true;
    checkCompletion();
  });

  loader.load('/3dassets/pack2.glb', (gltf) => {
    const pack2Plants = gltf.scene.children[0].children[0].children[0].children;
    
    for (let plant of pack2Plants) {
      plantsArray.push({
        model: plant,
        scale: 2.3,
        originalIndex: modelIndex++
      });
    }
    console.log('Pack2 plants loaded:', pack2Plants.length);
    pack2Loaded = true;
    checkCompletion();

  }, undefined, (error) => {
    console.error('Error loading pack2 GLTF model:', error);
    pack2Loaded = true;
    checkCompletion();
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

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;

  ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(0, 50, 0);
  directionalLight.target.position.set(0, 0, 0);
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;

  const hemiLight = new THREE.HemisphereLight( 0xaaaaff, 0x444466, 0.5 );
  hemiLight.position.set( 0, 20, 0 );
  scene.add( hemiLight );

  floorBuffer = new THREE.Group();
  floorBuffer.position.y = -1.3;
  scene.add(floorBuffer);

  const panelSize = 12.5;
  const panelScale = 40;

  loader.load('/3dassets/wooden_floor_panels_mid.glb', (gltf) => {
    const panelModel = gltf.scene;
    panelModel.scale.set(panelScale, panelScale, panelScale);

    panelModel.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const positions = [
      { x: -panelSize / 2, z: -panelSize / 2 },
      { x:  panelSize / 2, z: -panelSize / 2 },
      { x: -panelSize / 2, z:  panelSize / 2 },
      { x:  panelSize / 2, z:  panelSize / 2 },
    ];

    positions.forEach(pos => {
      const panelInstance = panelModel.clone();
      panelInstance.position.set(pos.x, 0, pos.z);
      panelInstance.rotation.y = -Math.PI / 5.6;
      floorBuffer.add(panelInstance);
    });

  }, undefined, (error) => {
    console.error('Error loading wooden floor:', error);
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
        fallbackPanel.rotation.x = -Math.PI / 2;
        fallbackPanel.position.set(pos.x, 0, pos.z);
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
  const currentNotes = plantedItems.filter(item => item.userData.step === currentStep);

  currentNotes.forEach(item => {
      const track = item.userData.track;
      const notePos = (nTracks - 1) - track;
      const octave = baseOctave + Math.floor(notePos / 7);
      const noteName = noteNames[notePos % 7];
      const pitch = noteName + octave;
      player.triggerAttack(pitch, time);
      animatePlant(track, currentStep);
  });

  beats++;
  currentStep = beats % nSteps;
}

function addRandomNote() {
  if (plantsArray.length === 0) {
      console.warn("Plant models not loaded yet, cannot add random note.");
      return; 
  }
  const occupiedCells = new Set();
  plantedItems.forEach(item => occupiedCells.add(`${item.userData.track},${item.userData.step}`));
  
  let randomTime, randomTrack, cellKey;
  let attempts = 0;
  const maxAttempts = nTracks * nSteps;

  do {
    randomTime = Math.floor(Math.random() * nSteps);
    randomTrack = Math.floor(Math.random() * nTracks);
    cellKey = `${randomTrack},${randomTime}`;
    attempts++;
  } while (occupiedCells.has(cellKey) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
      console.warn("Could not find empty spot to plant random note.");
      return; 
  }

  createPlant(randomTrack, randomTime); 
}

function createPlant(track, step, plantModelIndex) {
  if (plantsArray.length === 0) {
    console.error("Attempted to create plant before models loaded.");
    return;
  }
  
  let selectedPlantData;
  if (plantModelIndex !== undefined && plantsArray[plantModelIndex]) {
      selectedPlantData = plantsArray[plantModelIndex];
  } else {
      if (plantModelIndex !== undefined) {
          console.warn(`Invalid plantModelIndex ${plantModelIndex}, picking random model.`);
      }
      const randomArrayIndex = Math.floor(Math.random() * plantsArray.length);
      selectedPlantData = plantsArray[randomArrayIndex];
      plantModelIndex = selectedPlantData.originalIndex;
  }

  const selectedPlant = selectedPlantData.model.clone();

  selectedPlant.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const originalMaterial = child.material;
      child.material = new THREE.MeshStandardMaterial({
        color: originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0xffffff, 0.5),
        map: originalMaterial.map || null,
        transparent: true,
        alphaTest: 0.5,
      });
    }
  });
  
  const radius = 5 + Math.random() * 7;
  const angle = (step / nSteps) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const plantScale = selectedPlantData.scale;
  selectedPlant.scale.set(plantScale, plantScale, plantScale);
  selectedPlant.position.set(x, 0, z);
  
  selectedPlant.userData = {
    track: track,
    step: step,
    plantModelIndex: plantModelIndex,
    originalY: 0,
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

  window.addEventListener('beforeunload', saveGardenData);
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

function getCurrentGardenState() {
    const plantsData = plantedItems.map(item => ({
        track: item.userData.track,
        step: item.userData.step,
        plantModelIndex: item.userData.plantModelIndex
    }));
    const currentTempo = parseInt(tempoSlider.value);
    
    return {
        plants: plantsData,
        tempo: currentTempo
    };
}

function saveGardenData() {
    const gardenState = getCurrentGardenState();
    const dataToSend = JSON.stringify({ gardenData: gardenState });

    if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/savegarden', dataToSend);
        console.log("Attempting to save garden data via sendBeacon:", gardenState);
    } else {
        console.warn("navigator.sendBeacon not available. Saving might fail.");
        fetch('/api/savegarden', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: dataToSend,
            keepalive: true
        }).catch(error => console.error('Error saving garden data with fetch:', error));
    }
}