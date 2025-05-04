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
let raycaster, mouse;
let isEditing = false;
let selectedPlant = null;
let originalCameraPos, originalControlsTarget;
let isCameraAnimating = false;
let targetCameraPos = new THREE.Vector3();
let targetControlsTarget = new THREE.Vector3();
let originalAmbientIntensity, originalDirectionalIntensity, originalFog;

// Editor related globals
const minSize = 1.0;
const maxSize = 2.0;
let editHandles = [];
let dragControls = null;

const loader = new THREE.GLTFLoader();
let plantsArray = [];

// Define the sample map once
const sampleMap = {
  "D2": "/samples/melody/SO_CG_guzheng_note_low_D.wav",
  "E2": "/samples/melody/SO_CG_guzheng_note_low_E.wav",
  "G2": "/samples/melody/SO_CG_guzheng_note_low_G.wav",
  "A2": "/samples/melody/SO_CG_guzheng_note_low_A.wav",

  "D3": "/samples/melody/SO_CG_guzheng_note_midlow_D.wav",
  "E3": "/samples/melody/SO_CG_guzheng_note_midlow_E.wav",
  "G3": "/samples/melody/SO_CG_guzheng_note_midlow_G.wav",
  "A3": "/samples/melody/SO_CG_guzheng_note_midlow_A.wav",
  "B3": "/samples/melody/SO_CG_guzheng_note_midlow_B.wav",

  "D4": "/samples/melody/SO_CG_guzheng_note_midhigh_D.wav",
  "E4": "/samples/melody/SO_CG_guzheng_note_midhigh_E.wav",
  "G4": "/samples/melody/SO_CG_guzheng_note_midhigh_G.wav",
  "A4": "/samples/melody/SO_CG_guzheng_note_midhigh_A.wav",
  "B4": "/samples/melody/SO_CG_guzheng_note_midhigh_B.wav",

  "D5": "/samples/melody/SO_CG_guzheng_note_high_D.wav",
  "E5": "/samples/melody/SO_CG_guzheng_note_high_E.wav",
  "G5": "/samples/melody/SO_CG_guzheng_note_high_G.wav",
  "A5": "/samples/melody/SO_CG_guzheng_note_high_A.wav",
  "B5": "/samples/melody/SO_CG_guzheng_note_high_B.wav"
};

Tone.Transport.scheduleRepeat(onBeat, "16n");

const playButton = document.getElementById('play-button');
const tempoSlider = document.getElementById('tempo-slider');
const randomButton = document.getElementById('random-note');

// Add references for new elements
const saveButton = document.getElementById('save-button');
const saveNotification = document.getElementById('save-notification');

setup();

function setup() {
  initThree();
  loadPlantModels(() => {
    initializeGardenFromData();
  });
  initEvents();
  
  // Apply read-only mode restrictions if needed
  if (isReadOnly) {
    applyReadOnlyMode();
  }
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
        const plant = createPlant(plantData.track, plantData.step, plantData.plantModelIndex);
        if (plant && plantData.audioParams) {
            // Apply loaded params to the plant's specific effects
            if (plant.userData.effects) {
                plant.userData.effects.filter.frequency.value = plantData.audioParams.filterFreq !== undefined ? plantData.audioParams.filterFreq : 800;
                plant.userData.effects.chorus.depth.value = plantData.audioParams.chorusDepth !== undefined ? plantData.audioParams.chorusDepth : 0.3;
                plant.userData.effects.delay.feedback.value = plantData.audioParams.delayFeedback !== undefined ? plantData.audioParams.delayFeedback : 0.3;
                // Handle old param names if necessary (optional, adds robustness)
                if (plantData.audioParams.distortion !== undefined) { /* map to chorus/delay? */ }
                if (plantData.audioParams.reverbTime !== undefined) { /* map to delay? */}
            } else {
                console.warn("Plant created but effects object missing during load.");
            }
        }
        if (plant && plantData.scale) {
            plant.scale.copy(plantData.scale);
        }
      } else {
          console.warn("Plant data missing model index, creating random plant instead:", plantData);
          const plant = createPlant(plantData.track, plantData.step); 
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

  // Initialize raycaster and mouse vector
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

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

  if (isCameraAnimating) {
    updateCameraAnimation();
  } else if (controls.enabled) {
      controls.update();
  }

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
      if (item.userData.sampler) {
        item.userData.sampler.triggerAttack(pitch, time);
      } else {
        console.warn("Plant has no sampler!", item.userData);
      }
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

// Utility function to map pitch to radius
function pitchToRadius(pitch) {
    const midi = Tone.Frequency(pitch).toMidi();
    // Map MIDI range (adjust as needed based on your actual MIDI values)
    // Example: MIDI 38 (D2) to 71 (B5) maps to radius 5 to 12
    const minMidi = 38; 
    const maxMidi = 71; 
    const minRadius = 5;
    const maxRadius = 12;
    return map(midi, minMidi, maxMidi, minRadius, maxRadius);
}

function createPlant(track, step, plantModelIndex) {
  if (plantsArray.length === 0) {
    console.error("Attempted to create plant before models loaded.");
    return null;
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
  
  // Calculate pitch based on track
  const notePos = (nTracks - 1) - track;
  const octave = baseOctave + Math.floor(notePos / 7);
  const noteName = noteNames[notePos % 7];
  const pitch = noteName + octave;

  // Determine radius based on pitch
  const radius = pitchToRadius(pitch);
  const angle = (step / nSteps) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const plantScale = selectedPlantData.scale;
  selectedPlant.scale.set(plantScale, plantScale, plantScale);
  selectedPlant.position.set(x, 0, z);
  
  // --- Create Sampler and Effects PER PLANT ---
  const plantSampler = new Tone.Sampler(sampleMap).toDestination(); // Initial connection to destination
  const plantFilter = new Tone.Filter(800, "lowpass"); // Default freq
  const plantChorus = new Tone.Chorus(4, 2.5, 0.3).start(); // Default depth
  const plantDelay = new Tone.FeedbackDelay("8n", 0.3); // Default feedback

  // Chain: Sampler -> Filter -> Chorus -> Delay -> Destination
  plantSampler.disconnect(Tone.Destination); // Disconnect initial connection
  plantSampler.chain(plantFilter, plantChorus, plantDelay, Tone.Destination);
  // --- End Per-Plant Audio Setup ---

  selectedPlant.userData = {
    track: track,
    step: step,
    plantModelIndex: plantModelIndex,
    originalY: 0,
    // Store the sampler and effects instances
    sampler: plantSampler,
    effects: {
        filter: plantFilter,
        chorus: plantChorus,
        delay: plantDelay
    }
  };
  
  scene.add(selectedPlant);
  plantedItems.push(selectedPlant);
  return selectedPlant;
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
  
  // Only add these event listeners if not in read-only mode
  if (!isReadOnly) {
    randomButton.addEventListener('click', addRandomNote);
    tempoSlider.addEventListener('input', updateTempo);
    renderer.domElement.addEventListener('click', onDocumentMouseClick, false);
    window.addEventListener('keydown', onDocumentKeyDown, false);
    
    saveButton.addEventListener('click', (event) => {
      event.preventDefault();
      manualSaveGarden(); 
    });
  } else {
    // In read-only mode, tempo slider should be disabled but still show value
    tempoSlider.disabled = true;
  }
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
    const plantsData = plantedItems.map(item => {
        // Read current effect values from the plant's effects objects
        const currentAudioParams = {};
        if (item.userData.effects) {
            currentAudioParams.filterFreq = item.userData.effects.filter.frequency.value;
            currentAudioParams.chorusDepth = item.userData.effects.chorus.depth.value;
            currentAudioParams.delayFeedback = item.userData.effects.delay.feedback.value;
        } else {
            // Fallback defaults if effects somehow missing
            console.warn("Plant missing effects during save, using defaults.", item.userData);
            currentAudioParams.filterFreq = 800;
            currentAudioParams.chorusDepth = 0.3;
            currentAudioParams.delayFeedback = 0.3;
        }

        return {
            track: item.userData.track,
            step: item.userData.step,
            plantModelIndex: item.userData.plantModelIndex,
            audioParams: currentAudioParams, // Save the read values
            scale: item.scale.clone()
        }
    });
    const currentTempo = parseInt(tempoSlider.value);
    
    return {
        plants: plantsData,
        tempo: currentTempo
    };
}

// Remove or comment out the old saveGardenData function and its beacon/fetch logic 
// as it's replaced by manualSaveGarden and the new endpoint.
/* 
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
*/

// --- New Save Functionality ---
function manualSaveGarden() {
    const gardenState = getCurrentGardenState(); // Reuse existing function
    console.log("Manually saving garden state:", gardenState);

    fetch('/save-garden', { // Use a new endpoint for manual save
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(gardenState), // Send the state directly
    })
    .then(response => {
        if (!response.ok) {
            // Throw an error if response status is not 2xx
            return response.text().then(text => { 
                throw new Error(`Save failed: ${response.status} ${response.statusText} - ${text}`) 
            });
        }
        return response.json(); // Or response.text() if backend sends text
    })
    .then(data => {
        console.log('Save successful:', data);
        showSaveNotification();
    })
    .catch(error => {
        console.error('Error saving garden:', error);
        // Optionally: Show an error notification to the user
        alert(`Failed to save garden: ${error.message}`); 
    });
}

function showSaveNotification() {
    saveNotification.classList.add('show');
    setTimeout(() => {
        saveNotification.classList.remove('show');
    }, 2500); // Show for 2.5 seconds
}

function onDocumentMouseClick(event) {
  // Disable plant editing in read-only mode
  if (isReadOnly || isEditing) return;

  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(plantedItems, true);

  if (intersects.length > 0) {
    let clickedObject = intersects[0].object;
    while (clickedObject.parent && !plantedItems.includes(clickedObject)) {
        clickedObject = clickedObject.parent;
    }

    if (plantedItems.includes(clickedObject)) {
        console.log("Clicked on plant:", clickedObject.userData);
        enterPlantEditor(clickedObject);
    }
  }
}

function enterPlantEditor(plant) {
  if (isCameraAnimating) return;
  console.log("Entering editor for plant:", plant.userData);
  selectedPlant = plant;
  isEditing = true;

  originalCameraPos = camera.position.clone();
  originalControlsTarget = controls.target.clone();
  originalAmbientIntensity = ambientLight.intensity;
  originalDirectionalIntensity = directionalLight.intensity;
  originalFog = scene.fog;

  plant.getWorldPosition(targetControlsTarget);
  const plantSize = new THREE.Box3().setFromObject(plant).getSize(new THREE.Vector3());
  const cameraDistance = Math.max(plantSize.x, plantSize.y, plantSize.z) * 3 + 3;
  const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  targetCameraPos.copy(targetControlsTarget).addScaledVector(direction, cameraDistance);

  isCameraAnimating = true;
  controls.enabled = true;
  controls.enableRotate = false;
  controls.enableZoom = false;
  controls.enablePan = false;

  // Create handles and setup DragControls
  createHandles(selectedPlant);
  if (editHandles.length > 0) {
    dragControls = new THREE.DragControls(editHandles, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', onHandleDragStart);
    dragControls.addEventListener('drag', onHandleDrag);
    dragControls.addEventListener('dragend', onHandleDragEnd);

    // --- Dynamic Audio Routing & Effect Creation ---
    // console.log("Creating temporary effects chain for editing.");
    // Dispose previous effects if any lingered (safety check)
    // if (currentEditEffects) { ... }
    // currentEditEffects = { ... }; // ReferenceError occurs here if uncommented

    // console.log("Connecting player through temporary effects chain.");
    // player.disconnect(Tone.Destination);
    // player.chain(currentEditEffects.filter, currentEditEffects.chorus, currentEditEffects.delay, Tone.Destination); // ReferenceError occurs here if uncommented

    // Apply initial audio params to temporary effects *after* connecting // REMOVED
    // const params = selectedPlant.userData.audioParams; // These params don't exist anymore
    // currentEditEffects.filter.frequency.value = params.filterFreq; // ReferenceError occurs here if uncommented
    // currentEditEffects.chorus.depth.value = params.chorusDepth; // ReferenceError occurs here if uncommented
    // currentEditEffects.delay.feedback.value = params.delayFeedback; // ReferenceError occurs here if uncommented

    // NO audio graph changes needed on enter, plant has its own chain.
  } else {
    console.error("Failed to create edit handles.");
  }

  // TODO: Show editor UI
}

function exitPlantEditor() {
  if (!isEditing || isCameraAnimating) return;
  console.log("Exiting editor mode.");

  // Clean up editor state BEFORE animating back
  if (dragControls) {
    dragControls.removeEventListener('dragstart', onHandleDragStart);
    dragControls.removeEventListener('drag', onHandleDrag);
    dragControls.removeEventListener('dragend', onHandleDragEnd);
    dragControls.dispose();
    dragControls = null;
  }
  removeHandles();

  // console.log("Disconnecting effects chain, reconnecting player directly.");
  // if (selectedPlant && selectedPlant.userData.effects) { ... } // Removed in previous step

  // player.connect(Tone.Destination); // REMOVE THIS LINE - Causes ReferenceError

  // Restore scene immediately
  ambientLight.intensity = originalAmbientIntensity;
  directionalLight.intensity = originalDirectionalIntensity;
  scene.fog = originalFog;

  targetCameraPos.copy(originalCameraPos);
  targetControlsTarget.copy(originalControlsTarget);

  isCameraAnimating = true;
  controls.enabled = true;
  controls.enableRotate = false;
  controls.enableZoom = false;
  controls.enablePan = false;

  selectedPlant = null;
  isEditing = false;
  console.log("Started exit animation.");
  // TODO: Hide editor UI immediately
}

// Placeholder Handle Functions
function createHandles(object) {
    removeHandles(); // Clear any previous handles

    const handleSize = 0.15;
    const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize); // Use cubes
    const colors = { x: 0xff0000, y: 0x00ff00, z: 0x0000ff }; // R, G, B
    const axes = ['x', 'y', 'z'];

    const bbox = new THREE.Box3().setFromObject(object);
    const objectSize = bbox.getSize(new THREE.Vector3());
    const objectCenter = bbox.getCenter(new THREE.Vector3());

    axes.forEach(axis => {
        const handleMaterial = new THREE.MeshBasicMaterial({ color: colors[axis], transparent: true, opacity: 0.8 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.userData.axis = axis; // Store the axis

        // Position handle along the positive axis direction from the center
        const position = objectCenter.clone();
        position[axis] += objectSize[axis] / 2 + handleSize * 2; // Offset from the edge
        handle.position.copy(position);
        
        // TODO: Consider handle rotation for better visual alignment?
        
        scene.add(handle);
        editHandles.push(handle);
    });

    console.log("Created handles:", editHandles.length);
}

function removeHandles() {
    editHandles.forEach(handle => {
        scene.remove(handle);
        if (handle.geometry) handle.geometry.dispose();
        if (handle.material) handle.material.dispose();
    });
    editHandles = [];
    // console.log("Removed handles");
}

// Placeholder - needs proper implementation based on handle positions
function updateHandlePositions(object, handles) {
    if (!handles || handles.length === 0) return;
    
    const bbox = new THREE.Box3().setFromObject(object);
    const objectSize = bbox.getSize(new THREE.Vector3());
    const objectCenter = bbox.getCenter(new THREE.Vector3());
    const handleSize = handles[0].geometry.parameters.width; // Assuming all handles are same size cubes

    handles.forEach(handle => {
        const axis = handle.userData.axis;
        if (!axis) return;
        
        const position = objectCenter.clone();
        position[axis] += objectSize[axis] / 2 + handleSize * 2; // Same logic as creation
        handle.position.copy(position);
    });
}

// DragControls Event Handlers
function onHandleDragStart(event) {
    console.log("Drag Start");
    controls.enableRotate = false;
    // Store starting state on the dragged handle
    event.object.userData.startDragPosition = event.object.position.clone();
    if (selectedPlant) { // Ensure plant exists
        event.object.userData.startPlantScale = selectedPlant.scale.clone();
    }
}

function onHandleDrag(event) {
    const dragObject = event.object;
    if (!selectedPlant || !editHandles.includes(dragObject) || !dragObject.userData.axis || !dragObject.userData.startDragPosition || !dragObject.userData.startPlantScale) {
        // console.warn("Drag event skipped, missing data");
        return; // Exit if data wasn't properly initialized in dragStart
    }

    const axis = dragObject.userData.axis;
    
    // Calculate handle's position delta since drag start
    const currentPosition = dragObject.position;
    const startPosition = dragObject.userData.startDragPosition;
    const deltaPosition = currentPosition.clone().sub(startPosition);

    // Simple mapping: Use the delta along the handle's primary axis
    const displacement = deltaPosition[axis]; 
    
    const sensitivity = 3.0; // Adjust sensitivity as needed
    const scaleChange = displacement * sensitivity;

    // Apply scale change relative to the starting scale
    const startScaleValue = dragObject.userData.startPlantScale[axis];
    const newScaleValue = startScaleValue + scaleChange;
    const clampedScaleValue = Math.max(minSize, Math.min(newScaleValue, maxSize));

    selectedPlant.scale[axis] = clampedScaleValue;
    
    // Update handle positions visually based on the new plant scale
    updateHandlePositions(selectedPlant, editHandles);
    
    // --- Override DragControls position --- 
    // Find the updated position of *this specific* dragged handle
    const updatedHandleData = editHandles.find(h => h === dragObject);
    if (updatedHandleData) {
        // Reset the dragged object's position to where updateHandlePositions placed it.
        // This prevents DragControls internal logic from fighting our scaling logic.
        dragObject.position.copy(updatedHandleData.position);
        // We also need to update the startDragPosition incrementally IF we want smooth continuous dragging
        // OR reset startDragPosition/startPlantScale each frame (simpler, might feel less smooth)
        // Let's try resetting each frame for simplicity first:
        // dragObject.userData.startDragPosition = dragObject.position.clone();
        // dragObject.userData.startPlantScale = selectedPlant.scale.clone();
        // -- Alternative: More complex incremental approach needed for perfect smoothness --
    }
    // --- End Override --- 

    // Map potentially non-uniform scale to audio parameters
    const scale = selectedPlant.scale;
    const freq = map(scale.x, minSize, maxSize, 200, 3000); // X scale -> Filter Frequency
    const chorDepth = map(scale.y, minSize, maxSize, 0.1, 0.9); // Y scale -> Chorus Depth
    const delayFb = map(scale.z, minSize, maxSize, 0.1, 0.7); // Z scale -> Delay Feedback

    // Update Tone.js effects in real-time (if they exist)
    // Apply directly to the selected plant's persistent effects
    if (selectedPlant && selectedPlant.userData.effects) {
        selectedPlant.userData.effects.filter.frequency.value = freq;
        selectedPlant.userData.effects.chorus.depth.value = chorDepth;
        selectedPlant.userData.effects.delay.feedback.value = delayFb;
    }
    // if (currentEditEffects) { ... } // REMOVED - This block caused the ReferenceError
    // {
    //     currentEditEffects.filter.frequency.value = freq;
    //     currentEditEffects.chorus.depth.value = chorDepth; // Update chorus depth
    //     currentEditEffects.delay.feedback.value = delayFb; // Update delay feedback
    // }

    // Store current audio params back to userData (so they are saved on exit) // REMOVED - No longer needed, live in effects
    // Use new parameter names
    selectedPlant.userData.audioParams = {
        filterFreq: freq,
        chorusDepth: chorDepth,
        delayFeedback: delayFb
    };

    // Prevent DragControls from moving the handle itself (we reposition it manually)
    // This might require overriding DragControls update or resetting position here.
    // For now, updateHandlePositions() might visually correct it.
}

function onHandleDragEnd(event) {
    console.log("Drag End");
    // Clear starting drag data from handle
    if (event.object.userData) {
        delete event.object.userData.startPlantScale;
        delete event.object.userData.startDragPosition; // Clear position too
    }
    // Re-enable OrbitControls rotation after handle drag (if still in editor mode)
    if (isEditing) {
        controls.enableRotate = true;
    }
}

// Utility function for mapping values
function map(value, inMin, inMax, outMin, outMax) {
  // Clamp value to input range
  const clampedValue = Math.max(inMin, Math.min(value, inMax));
  // Perform linear interpolation
  return (clampedValue - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function onDocumentKeyDown(event) {
  if (isEditing && event.key === "Escape") {
      exitPlantEditor();
  }
}

function updateCameraAnimation() {
    const lerpFactor = 0.07;
    const positionThreshold = 0.05;
    const targetThreshold = 0.05;

    camera.position.lerp(targetCameraPos, lerpFactor);
    controls.target.lerp(targetControlsTarget, lerpFactor);
    controls.update();

    const positionReached = camera.position.distanceTo(targetCameraPos) < positionThreshold;
    const targetReached = controls.target.distanceTo(targetControlsTarget) < targetThreshold;

    if (positionReached && targetReached) {
        isCameraAnimating = false;
        camera.position.copy(targetCameraPos);
        controls.target.copy(targetControlsTarget);

        if (isEditing) {
            controls.enabled = true;
            controls.enableZoom = false;
            controls.enablePan = false;
            controls.enableRotate = true;
            console.log("Camera animation finished - Editor entered.");

            ambientLight.intensity = 0.1;
            directionalLight.intensity = 0.2;
            const fogNear = camera.position.distanceTo(controls.target) * 0.8;
            const fogFar = fogNear + 15;
            scene.fog = new THREE.Fog(0x222233, fogNear, fogFar);
        } else {
            controls.enabled = true;
            controls.enableZoom = true;
            controls.enablePan = true;
            controls.enableRotate = true;
            console.log("Camera animation finished - Editor exited.");
            // TODO: Restore scene / show other plants
        }
        controls.update();
    }
}

function applyReadOnlyMode() {
  console.log('Applying read-only mode restrictions');
  
  // Hide any editing UI elements
  if (randomButton) {
    randomButton.style.display = 'none';
  }
  
  // Make tempo slider read-only
  if (tempoSlider) {
    tempoSlider.disabled = true;
  }
  
  // Add a class to body for CSS styling in read-only mode
  document.body.classList.add('readonly-mode');
}