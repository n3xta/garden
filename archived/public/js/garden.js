const AmbientSoundManager = {
  player: null,
  
  currentSound: null,
  
  pendingAutoplay: false,
  
  init: function() {
    // Wait until the document is fully loaded and interacted with (for autoplay policies)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupListeners());
    } else {
      this.setupListeners();
    }
    
    // Add additional event for ensuring audio can play after user interaction
    document.addEventListener('click', () => {

      // wbrowsers require for autoplay
      if (this.pendingAutoplay && this.currentSound) {
        this.playCurrentSound();
        this.pendingAutoplay = false;
      }
    }, { once: true });
    
    // if Tone.js is started, also start our ambient sound
    document.addEventListener('tone.start', () => {
      if (this.pendingAutoplay && this.currentSound) {
        this.playCurrentSound();
        this.pendingAutoplay = false;
      }
    });
  },
  
  setupListeners: function() {
    const ambientIcons = document.querySelectorAll('.ambient-icon');
    
    ambientIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        const soundNumber = icon.dataset.sound;
        this.switchSound(soundNumber);
        
        ambientIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });
    
    document.querySelector('.ambient-icon[data-sound="none"]').classList.add('active');
  },
  
  playCurrentSound: function() {
    if (!this.player) return;
    
    const playPromise = this.player.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Autoplay prevented. Will play after user interaction:', error);
        this.pendingAutoplay = true;
      });
    }
  },
  
  switchSound: function(soundNumber) {
    if (this.player) {
      this.player.pause();
      this.player = null;
    }
    
    if (!soundNumber || soundNumber === 'none') {
      this.currentSound = null;
      return;
    }
    
    // Create a new audio player
    this.player = new Audio(`/samples/ambient/${soundNumber}.wav`);
    this.player.loop = true;
    this.player.volume = 0.4; // Lower volume to blend better with garden sounds
    this.currentSound = soundNumber;
    
    this.playCurrentSound();
  }
};

AmbientSoundManager.init();

// Dispatch a custom event when Tone.js starts
// This helps coordinate our audio with Tone.js
document.addEventListener('DOMContentLoaded', () => {
  const originalToneStart = Tone.start;
  if (originalToneStart) {
    Tone.start = async function() {
      await originalToneStart.apply(this, arguments);
      // After Tone.js starts, dispatch our custom event
      document.dispatchEvent(new Event('tone.start'));
      return;
    };
  }
});

// Garden Name Manager
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('name-modal');
  const nameButton = document.getElementById('name-button');
  const closeButton = document.querySelector('.close-button');
  const nameInput = document.getElementById('garden-name-input');
  const nameDisplay = document.getElementById('garden-name-display');
  const nameDisplayText = nameDisplay ? nameDisplay.querySelector('h3') : null;
  const nameNotification = document.getElementById('name-notification');
  const gardenDataElement = document.getElementById('garden-data');

  const savedName = gardenDataElement ? gardenDataElement.getAttribute('data-garden-name') : '';
  
  if (nameDisplayText && savedName) {
    nameDisplayText.textContent = savedName;
    if (nameInput) nameInput.value = savedName;
  }

  function openModal() {
    if (modal) {
      if (savedName) {
        nameInput.value = savedName;
      }
      modal.style.display = 'flex';
      nameInput.focus();
      
      if (typeof AudioEffects !== 'undefined') {
        AudioEffects.play('/samples/ui/paper.wav');
      }
    }
  }

  function closeModal() {
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function saveGardenName() {
    const newName = nameInput.value.trim();
    if (!newName) return;
    
    if (typeof AudioEffects !== 'undefined') {
      AudioEffects.play('/samples/ui/save.wav');
    }
    
    fetch('/api/garden/name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to save garden name');
      }
      return response.json();
    })
    .then(data => {
      console.log('Garden name saved:', data);
      
      if (nameDisplayText) {
        nameDisplayText.textContent = newName;
      }
      
      if (gardenDataElement) {
        gardenDataElement.setAttribute('data-garden-name', newName);
      }
      
      closeModal();
      
      showNameSavedNotification();
    })
    .catch(error => {
      console.error('Error saving garden name:', error);
      alert('Failed to save garden name. Please try again.');
    });
  }

  function showNameSavedNotification() {
    if (nameNotification) {
      nameNotification.classList.add('show');
      setTimeout(() => {
        nameNotification.classList.remove('show');
      }, 1500);
    }
  }

  if (nameButton) {
    nameButton.addEventListener('click', function(e) {
      e.preventDefault();
      openModal();
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  if (nameInput) {
    nameInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        saveGardenName();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
});

// 获取garden数据
document.addEventListener('DOMContentLoaded', function() {
  const gardenDataElement = document.getElementById('garden-data');
  
  if (gardenDataElement) {
    window.initialGardenData = JSON.parse(gardenDataElement.getAttribute('data-garden'));
    window.isReadOnly = gardenDataElement.getAttribute('data-readonly') === 'true';
    
    console.log("页面加载 - transition状态检查:");
    console.log("- pageIsEntering值:", sessionStorage.getItem('pageIsEntering'));
    console.log("- Transition层可见性:", document.querySelector('.cd-transition-layer').classList.contains('visible'));
    
    setup();
  } else {
    console.error("Garden data element not found!");
  }
});

window.addEventListener('load', function() {
  console.log("页面完全加载后 - transition状态:");
  console.log("- Transition层可见性:", document.querySelector('.cd-transition-layer').classList.contains('visible'));
  console.log("- Body类列表:", document.body.classList);
});

const TOTAL_BACKGROUNDS = 41;

function getGardenBackgroundId() {
  const gardenDataElement = document.getElementById('garden-data');
  if (!gardenDataElement) return null;
  
  const backgroundId = gardenDataElement.getAttribute('data-background-id');
  
  if (backgroundId && !isNaN(backgroundId) && parseInt(backgroundId) >= 1 && parseInt(backgroundId) <= TOTAL_BACKGROUNDS) {
    return parseInt(backgroundId);
  }
  
  return null;
}

function setGardenBackground() {
  const backgroundId = getGardenBackgroundId();
  document.documentElement.style.setProperty('--garden-background', `url('/img/garden_bg/${backgroundId}.jpg')`);
}

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

// Initialize garden background when DOM is loaded
document.addEventListener('DOMContentLoaded', setGardenBackground);

function setup() {
  initThree();
  
  // 播放garden音效
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/garden.wav');
  } else {
    // 如果音效模块未加载，使用原生Audio API
    const gardenSound = new Audio('/samples/ui/garden.wav');
    gardenSound.play().catch(err => console.warn('音效播放失败:', err));
  }
  
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
            if (plant.userData.effects) {
                const filterFreq = plantData.audioParams.filterFreq !== undefined ? plantData.audioParams.filterFreq : 0;
                plant.userData.effects.filter.frequency.value = filterFreq === 0 ? 20000 : (3000 - filterFreq + 300);
                plant.userData.effects.chorus.depth.value = plantData.audioParams.chorusDepth !== undefined ? plantData.audioParams.chorusDepth : 0;
                plant.userData.effects.delay.feedback.value = plantData.audioParams.delayFeedback !== undefined ? plantData.audioParams.delayFeedback : 0;
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

  loader.load('/3d/pack1.glb', (gltf) => {
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

  loader.load('/3d/pack2.glb', (gltf) => {
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

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  floorBuffer = new THREE.Group();
  floorBuffer.position.y = -1.3;
  scene.add(floorBuffer);

  const panelSize = 12.5;
  const panelScale = 40;

  loader.load('/3d/wooden_floor_panels_mid.glb', (gltf) => {
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

function pitchToRadius(pitch) {
    const midi = Tone.Frequency(pitch).toMidi();
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
  
  const notePos = (nTracks - 1) - track;
  const octave = baseOctave + Math.floor(notePos / 7);
  const noteName = noteNames[notePos % 7];
  const pitch = noteName + octave;

  const radius = pitchToRadius(pitch);
  const angle = (step / nSteps) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const defaultScale = 1.0;
  selectedPlant.scale.set(defaultScale, defaultScale, defaultScale);
  selectedPlant.position.set(x, 0, z);
  
  const plantSampler = new Tone.Sampler(sampleMap).toDestination();
  
  const plantFilter = new Tone.Filter(20000, "lowpass");
  const plantChorus = new Tone.Chorus(4, 2.5, 0).start();
  const plantDelay = new Tone.FeedbackDelay("8n", 0);
  const plantGain = new Tone.Gain(0.3);

  plantSampler.disconnect(Tone.Destination);
  plantSampler.chain(plantFilter, plantChorus, plantDelay, plantGain, Tone.Destination);

  selectedPlant.userData = {
    track: track,
    step: step,
    plantModelIndex: plantModelIndex,
    originalY: 0,
    sampler: plantSampler,
    effects: {
        filter: plantFilter,
        chorus: plantChorus,
        delay: plantDelay,
        gain: plantGain
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
    tempoSlider.disabled = true;
  }
}

async function togglePlay() {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
  if (Tone.Transport.state === 'started') {
    Tone.Transport.pause();
    playButton.style.backgroundImage = "url('/img/play.webp')";
  } else {
    Tone.Transport.start();
    playButton.style.backgroundImage = "url('/img/pause.webp')";
  }
}

function updateTempo() {
  bpm = parseInt(tempoSlider.value);
  Tone.Transport.bpm.rampTo(bpm, 0.1);
}

function getCurrentGardenState() {
    const plantsData = plantedItems.map(item => {
        const currentAudioParams = {};
        if (item.userData.effects) {
            currentAudioParams.filterFreq = item.userData.effects.filter.frequency.value;
            currentAudioParams.chorusDepth = item.userData.effects.chorus.depth.value;
            currentAudioParams.delayFeedback = item.userData.effects.delay.feedback.value;
        } else {
            console.warn("Plant missing effects during save, using defaults.", item.userData);
            currentAudioParams.filterFreq = 800;
            currentAudioParams.chorusDepth = 0.3;
            currentAudioParams.delayFeedback = 0.3;
        }

        return {
            track: item.userData.track,
            step: item.userData.step,
            plantModelIndex: item.userData.plantModelIndex,
            audioParams: currentAudioParams,
            scale: item.scale.clone()
        }
    });
    const currentTempo = parseInt(tempoSlider.value);
    
    return {
        plants: plantsData,
        tempo: currentTempo
    };
}

function manualSaveGarden() {
    AudioEffects.play('/samples/ui/save.wav');
    
    const gardenState = getCurrentGardenState();
    console.log("Manually saving garden state:", gardenState);

    fetch('/api/garden', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(gardenState),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { 
                throw new Error(`Save failed: ${response.status} ${response.statusText} - ${text}`) 
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Save successful:', data);
        showSaveNotification();
    })
    .catch(error => {
        console.error('Error saving garden:', error);
        alert(`Failed to save garden: ${error.message}`); 
    });
}

function showSaveNotification() {
    saveNotification.classList.add('show');
    setTimeout(() => {
        saveNotification.classList.remove('show');
    }, 1500);
}

function onDocumentMouseClick(event) {
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

  createHandles(selectedPlant);
  if (editHandles.length > 0) {
    dragControls = new THREE.DragControls(editHandles, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', onHandleDragStart);
    dragControls.addEventListener('drag', onHandleDrag);
    dragControls.addEventListener('dragend', onHandleDragEnd);
  } else {
    console.error("Failed to create edit handles.");
  }
}

function exitPlantEditor() {
  if (!isEditing || isCameraAnimating) return;
  console.log("Exiting editor mode.");

  if (dragControls) {
    dragControls.removeEventListener('dragstart', onHandleDragStart);
    dragControls.removeEventListener('drag', onHandleDrag);
    dragControls.removeEventListener('dragend', onHandleDragEnd);
    dragControls.dispose();
    dragControls = null;
  }
  removeHandles();

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
}

function createHandles(object) {
    removeHandles();

    const handleSize = 0.15;
    const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize);
    const colors = { x: 0xff0000, y: 0x00ff00, z: 0x0000ff };
    const axes = ['x', 'y', 'z'];

    const bbox = new THREE.Box3().setFromObject(object);
    const objectSize = bbox.getSize(new THREE.Vector3());
    const objectCenter = bbox.getCenter(new THREE.Vector3());

    axes.forEach(axis => {
        const handleMaterial = new THREE.MeshBasicMaterial({ color: colors[axis], transparent: true, opacity: 0.8 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.userData.axis = axis;

        const position = objectCenter.clone();
        position[axis] += objectSize[axis] / 2 + handleSize * 2;
        handle.position.copy(position);
        
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
}

function updateHandlePositions(object, handles) {
    if (!handles || handles.length === 0) return;
    
    const bbox = new THREE.Box3().setFromObject(object);
    const objectSize = bbox.getSize(new THREE.Vector3());
    const objectCenter = bbox.getCenter(new THREE.Vector3());
    const handleSize = handles[0].geometry.parameters.width;

    handles.forEach(handle => {
        const axis = handle.userData.axis;
        if (!axis) return;
        
        const position = objectCenter.clone();
        position[axis] += objectSize[axis] / 2 + handleSize * 2;
        handle.position.copy(position);
    });
}

function onHandleDragStart(event) {
    console.log("Drag Start");
    controls.enableRotate = false;
    event.object.userData.startDragPosition = event.object.position.clone();
    if (selectedPlant) {
        event.object.userData.startPlantScale = selectedPlant.scale.clone();
    }
}

function onHandleDrag(event) {
    const dragObject = event.object;
    if (!selectedPlant || !editHandles.includes(dragObject) || !dragObject.userData.axis || !dragObject.userData.startDragPosition || !dragObject.userData.startPlantScale) {
        return;
    }

    const axis = dragObject.userData.axis;
    
    const currentPosition = dragObject.position;
    const startPosition = dragObject.userData.startDragPosition;
    const deltaPosition = currentPosition.clone().sub(startPosition);

    const displacement = deltaPosition[axis]; 
    
    const sensitivity = 3.0;
    const scaleChange = displacement * sensitivity;

    const startScaleValue = dragObject.userData.startPlantScale[axis];
    const newScaleValue = startScaleValue + scaleChange;
    const clampedScaleValue = Math.max(minSize, Math.min(newScaleValue, maxSize));

    selectedPlant.scale[axis] = clampedScaleValue;
    
    updateHandlePositions(selectedPlant, editHandles);
    
    const updatedHandleData = editHandles.find(h => h === dragObject);
    if (updatedHandleData) {
        dragObject.position.copy(updatedHandleData.position);
    }

    const scale = selectedPlant.scale;
    
    const freq = scale.x <= 1.05 ? 0 : map(scale.x, minSize, maxSize, 0, 3000);
    const chorDepth = map(scale.y, minSize, maxSize, 0, 0.9);
    const delayFb = map(scale.z, minSize, maxSize, 0, 0.7);

    if (selectedPlant && selectedPlant.userData.effects) {
        selectedPlant.userData.effects.filter.frequency.value = freq === 0 ? 20000 : (3000 - freq + 300);
        selectedPlant.userData.effects.chorus.depth.value = chorDepth;
        selectedPlant.userData.effects.delay.feedback.value = delayFb;
    }

    selectedPlant.userData.audioParams = {
        filterFreq: freq,
        chorusDepth: chorDepth,
        delayFeedback: delayFb
    };
}

function onHandleDragEnd(event) {
    console.log("Drag End");
    if (event.object.userData) {
        delete event.object.userData.startPlantScale;
        delete event.object.userData.startDragPosition;
    }
    if (isEditing) {
        controls.enableRotate = true;
    }
}

function map(value, inMin, inMax, outMin, outMax) {
  if (Math.abs(value - 1.0) < 0.05) {
    return outMin;
  }
  
  const clampedValue = Math.max(inMin, Math.min(value, inMax));
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
        }
        controls.update();
    }
}

function applyReadOnlyMode() {
  console.log('Applying read-only mode restrictions');
  
  if (randomButton) {
    randomButton.style.display = 'none';
  }
  
  if (tempoSlider) {
    tempoSlider.disabled = true;
  }
  
  document.body.classList.add('readonly-mode');
}