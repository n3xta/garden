import { auth, db } from "../config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

// Global variables from original garden.js
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
let editHandles = [];
let dragControls = null;
const loader = new THREE.GLTFLoader();
let plantsArray = [];
let bpm = 80;
let currentStep = 0;
let beats = 0;
let ambientLight, directionalLight;
const nSteps = 16;
const nTracks = 28;
const baseOctave = 1;
const noteNames = ["C", "D", "E", "F", "G", "A", "B"];
const minSize = 1.0;
const maxSize = 2.0;

// State
let currentUser = null;
let gardenOwnerId = null;
let gardenData = { plants: [], tempo: 80 };
let isReadOnly = false;
let backgroundId = 1;

const sampleMap = {
  D2: "/samples/melody/SO_CG_guzheng_note_low_D.wav",
  E2: "/samples/melody/SO_CG_guzheng_note_low_E.wav",
  G2: "/samples/melody/SO_CG_guzheng_note_low_G.wav",
  A2: "/samples/melody/SO_CG_guzheng_note_low_A.wav",

  D3: "/samples/melody/SO_CG_guzheng_note_midlow_D.wav",
  E3: "/samples/melody/SO_CG_guzheng_note_midlow_E.wav",
  G3: "/samples/melody/SO_CG_guzheng_note_midlow_G.wav",
  A3: "/samples/melody/SO_CG_guzheng_note_midlow_A.wav",
  B3: "/samples/melody/SO_CG_guzheng_note_midlow_B.wav",

  D4: "/samples/melody/SO_CG_guzheng_note_midhigh_D.wav",
  E4: "/samples/melody/SO_CG_guzheng_note_midhigh_E.wav",
  G4: "/samples/melody/SO_CG_guzheng_note_midhigh_G.wav",
  A4: "/samples/melody/SO_CG_guzheng_note_midhigh_A.wav",
  B4: "/samples/melody/SO_CG_guzheng_note_midhigh_B.wav",

  D5: "/samples/melody/SO_CG_guzheng_note_high_D.wav",
  E5: "/samples/melody/SO_CG_guzheng_note_high_E.wav",
  G5: "/samples/melody/SO_CG_guzheng_note_high_G.wav",
  A5: "/samples/melody/SO_CG_guzheng_note_high_A.wav",
  B5: "/samples/melody/SO_CG_guzheng_note_high_B.wav",
};

// Elements
const playButton = document.getElementById("play-button");
const tempoSlider = document.getElementById("tempo-slider");
const randomButton = document.getElementById("random-note");
const saveButton = document.getElementById("save-button");
const saveNotification = document.getElementById("save-notification");
const nameButton = document.getElementById("name-button");
const nameModal = document.getElementById("name-modal");
const nameInput = document.getElementById("garden-name-input");
const gardenNameDisplay = document.getElementById("garden-name-display");
const gardenNameText = document.getElementById("garden-name-text");
const readonlyBanner = document.getElementById("readonly-banner");
const ownerNameSpan = document.getElementById("owner-name");
const editControls = document.getElementById("edit-controls");
const randomNoteContainer = document.getElementById("random-note-container");
const backToMyGardenContainer = document.getElementById(
  "back-to-my-garden-container"
);

// Editor UI Elements
const editorUI = document.getElementById("editor-ui");
const closeEditorBtn = document.getElementById("close-editor-btn");
let editorSpotlight; // New light for editor mode

// Audio Effects Helper
const AudioEffects = {
  play: (url) => {
    const audio = new Audio(url);
    audio.play().catch((e) => console.warn("Audio play failed", e));
  },
};

async function init() {
  // 1. Auth & Routing Logic
  // Check if we are viewing a specific garden via URL param ?id=...
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = urlParams.get("id");

  // Wait for auth to resolve
  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      currentUser = user;
      unsubscribe();
      resolve();
    });
  });

  if (viewId) {
    // Viewing someone else's garden (or my own via link)
    gardenOwnerId = viewId;
    if (currentUser && currentUser.uid === viewId) {
      isReadOnly = false;
    } else {
      isReadOnly = true;
    }
  } else {
    // /garden.html without params -> My Garden
    if (!currentUser) {
      window.location.href = "/login.html";
      return;
    }
    gardenOwnerId = currentUser.uid;
    isReadOnly = false;
  }

  // 2. Load Data
  await loadGardenData(gardenOwnerId);

  // 3. Update UI based on state
  updateUI();

  // 4. Initialize 3D Scene
  initThree();

  // 5. Load Assets and Plants
  loadPlantModels(() => {
    initializeGardenFromData();
  });

  // 6. Event Listeners
  initEvents();
  AmbientSoundManager.init();

  // Tone.js loop
  Tone.Transport.scheduleRepeat(onBeat, "16n");
}

async function loadGardenData(uid) {
  try {
    // Load Garden Data
    const gardenDocRef = doc(db, "gardens", uid);
    const gardenSnap = await getDoc(gardenDocRef);

    // Load User Data (for username backup)
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);
    let username = "Unknown";
    if (userSnap.exists()) {
      username = userSnap.data().username;
    }

    if (gardenSnap.exists()) {
      const data = gardenSnap.data();
      gardenData = {
        plants: data.plants || [],
        tempo: data.tempo || 80,
        ambientSound: data.ambientSound || null,
      };
      backgroundId = data.backgroundId || 1;
      const gName = data.name || "Untitled Garden";

      if (gardenNameText) gardenNameText.textContent = gName;
      if (nameInput) nameInput.value = gName;

      if (isReadOnly) {
        ownerNameSpan.textContent = data.ownerUsername || username;
      }

      // Set background
      document.documentElement.style.setProperty(
        "--garden-background",
        `url('/img/garden_bg/${backgroundId}.jpg')`
      );
    } else {
      // Legacy fallback: check if it's inside user doc (migration support)
      if (userSnap.exists() && userSnap.data().garden) {
        console.log("Found legacy garden data...");
        const data = userSnap.data();
        gardenData = data.garden;
        backgroundId = data.backgroundId || 1;
        if (gardenNameText)
          gardenNameText.textContent = data.gardenName || "Untitled Garden";
        document.documentElement.style.setProperty(
          "--garden-background",
          `url('/img/garden_bg/${backgroundId}.jpg')`
        );
      } else {
        console.error("No such garden!");
        // alert("Garden not found.");
      }
    }
  } catch (error) {
    console.error("Error loading garden:", error);
  }
}

function updateUI() {
  if (isReadOnly) {
    if (readonlyBanner) readonlyBanner.style.display = "flex";
    if (editControls) editControls.style.display = "none";
    if (randomNoteContainer) randomNoteContainer.style.display = "none";
    if (tempoSlider) tempoSlider.disabled = true;
    document.body.classList.add("readonly-mode");

    if (currentUser) {
      if (backToMyGardenContainer)
        backToMyGardenContainer.style.display = "block";
    }
  } else {
    if (readonlyBanner) readonlyBanner.style.display = "none";
    if (gardenNameDisplay) gardenNameDisplay.style.display = "block";
    if (editControls) editControls.style.display = "block"; // Save/Name buttons
    if (randomNoteContainer) randomNoteContainer.style.display = "block";
    if (tempoSlider) tempoSlider.disabled = false;
  }
}

function initializeGardenFromData() {
  console.log("Initializing garden with data:", gardenData);

  plantedItems.forEach((item) => scene.remove(item));
  plantedItems = [];

  bpm = gardenData.tempo || 80;
  tempoSlider.value = bpm;
  Tone.Transport.bpm.value = bpm;

  if (gardenData.ambientSound) {
    AmbientSoundManager.switchSound(gardenData.ambientSound);
    const ambientIcons = document.querySelectorAll(".ambient-icon");
    if (ambientIcons.length > 0) {
      ambientIcons.forEach((i) => i.classList.remove("active"));
      const activeIcon = document.querySelector(
        `.ambient-icon[data-sound="${gardenData.ambientSound}"]`
      );
      if (activeIcon) activeIcon.classList.add("active");
    }
  }

  if (gardenData.plants && gardenData.plants.length > 0) {
    gardenData.plants.forEach((plantData) => {
      if (plantData.plantModelIndex !== undefined) {
        const plant = createPlant(
          plantData.track,
          plantData.step,
          plantData.plantModelIndex
        );
        if (plant && plantData.audioParams) {
          if (plant.userData.effects) {
            // Load saved frequency directly (fallback to 20000 if undefined/0)
            const savedFreq = plantData.audioParams.filterFreq;
            const filterValue =
              savedFreq !== undefined && savedFreq !== 0 ? savedFreq : 20000;
            if (
              plant.userData.effects.filter.frequency &&
              typeof plant.userData.effects.filter.frequency === "object"
            ) {
              plant.userData.effects.filter.frequency.value = filterValue;
            } else {
              plant.userData.effects.filter.frequency = filterValue;
            }

            const chorusValue =
              plantData.audioParams.chorusDepth !== undefined
                ? plantData.audioParams.chorusDepth
                : 0;
            if (
              plant.userData.effects.chorus.depth &&
              typeof plant.userData.effects.chorus.depth === "object"
            ) {
              plant.userData.effects.chorus.depth.value = chorusValue;
            } else {
              plant.userData.effects.chorus.depth = chorusValue;
            }

            const delayValue =
              plantData.audioParams.delayFeedback !== undefined
                ? plantData.audioParams.delayFeedback
                : 0;
            if (
              plant.userData.effects.delay.feedback &&
              typeof plant.userData.effects.delay.feedback === "object"
            ) {
              plant.userData.effects.delay.feedback.value = delayValue;
            } else {
              plant.userData.effects.delay.feedback = delayValue;
            }
            
            // Set gain (volume) based on animation progress / Y-axis
            if (plantData.scale && plantData.scale.y !== undefined) {
              const volumeGain = map(plantData.scale.y, minSize, maxSize, 0.1, 0.6);
              if (
                plant.userData.effects.gain &&
                typeof plant.userData.effects.gain.gain === "object"
              ) {
                plant.userData.effects.gain.gain.value = volumeGain;
              }
            }
          }
          // Set animation time based on saved chorus depth
          if (
            plant.userData.animationAction &&
            plantData.audioParams &&
            plantData.audioParams.chorusDepth !== undefined
          ) {
            const action = plant.userData.animationAction;
            const duration = action.getClip().duration;
            const chorDepth = plantData.audioParams.chorusDepth;
            const animationTime = (chorDepth / 0.9) * duration;
            action.time = animationTime;
            if (plant.userData.animationMixer) {
              // Use a small delta to force the mixer to apply the animation at the current time
              plant.userData.animationMixer.update(0.001);
            }
          }
        }
        if (plant && plantData.scale) {
          // Load X and Z scale normally, Y scale becomes animationProgress
          plant.scale.x = plantData.scale.x || 1.0;
          plant.scale.z = plantData.scale.z || 1.0;
          plant.userData.animationProgress = plantData.scale.y || 1.0;
        }
      } else {
        const plant = createPlant(plantData.track, plantData.step);
      }
    });
  }
}

// --- Saving ---
let hasUnsavedChanges = false;
let isSaving = false;

// Mark that changes have been made
function markUnsavedChanges() {
  hasUnsavedChanges = true;
}

async function manualSaveGarden() {
  if (isReadOnly) return;

  AudioEffects.play("/samples/ui/save.wav");

  const currentGardenState = getCurrentGardenState();
  console.log("Saving garden state:", currentGardenState);

  try {
    // Update separate garden document
    const gardenDocRef = doc(db, "gardens", currentUser.uid);

    // check if it exists first, if not create (migration)
    // simplify: setDoc with merge true or just updateDoc if we are sure it exists.
    // Safe bet: setDoc with merge, or checking.
    // Since we are in manual save, we can assume we want to write the new structure.

    // Prepare data to save
    const dataToSave = {
      plants: currentGardenState.plants,
      tempo: currentGardenState.tempo,
      ambientSound: currentGardenState.ambientSound || null,
      updatedAt: new Date().toISOString(),
    };

    // Attempt to get existing username from loaded gardenData or UI if possible to ensure it's preserved/set
    // Since we merged, existing fields like ownerUsername should persist.
    // But if this is a legacy migration, we might want to set it if we know it.
    // The loadGardenData function sets global `gardenData` which might contain ownerUsername.
    // Or we can check `currentUser.displayName` (if available)
    if (currentUser.displayName) {
      dataToSave.ownerUsername = currentUser.displayName;
    }

    await setDoc(gardenDocRef, dataToSave, { merge: true });

    hasUnsavedChanges = false;
    showSaveNotification();
  } catch (error) {
    console.error("Error saving garden:", error);
    alert("Failed to save garden.");
  }
}

// Auto-save function (silent, no UI notification)
async function autoSaveGarden() {
  if (isReadOnly || !currentUser || !hasUnsavedChanges || isSaving) return;

  isSaving = true;
  const currentGardenState = getCurrentGardenState();
  console.log("Auto-saving garden state:", currentGardenState);

  try {
    const gardenDocRef = doc(db, "gardens", currentUser.uid);

    const dataToSave = {
      plants: currentGardenState.plants,
      tempo: currentGardenState.tempo,
      ambientSound: currentGardenState.ambientSound || null,
      updatedAt: new Date().toISOString(),
    };

    if (currentUser.displayName) {
      dataToSave.ownerUsername = currentUser.displayName;
    }

    await setDoc(gardenDocRef, dataToSave, { merge: true });

    hasUnsavedChanges = false;
    console.log("Auto-save successful");
  } catch (error) {
    console.error("Error auto-saving garden:", error);
  } finally {
    isSaving = false;
  }
}

async function saveGardenName() {
  const newName = nameInput.value.trim();
  if (!newName) return;

  AudioEffects.play("/samples/ui/save.wav");

  try {
    const gardenDocRef = doc(db, "gardens", currentUser.uid);
    await setDoc(
      gardenDocRef,
      {
        name: newName,
      },
      { merge: true }
    );

    gardenNameText.textContent = newName;
    if (nameModal) nameModal.style.display = "none";

    const nameNotification = document.getElementById("name-notification");
    if (nameNotification) {
      nameNotification.classList.add("show");
      setTimeout(() => nameNotification.classList.remove("show"), 1500);
    }
    
    // Name is saved separately, so we don't need to mark changes for auto-save
    // But we can optionally trigger it for consistency
  } catch (error) {
    console.error("Error saving garden name:", error);
  }
}

function getCurrentGardenState() {
  const plantsData = plantedItems
    .filter(
      (item) =>
        item.userData &&
        item.userData.track !== undefined &&
        item.userData.step !== undefined
    )
    .map((item) => {
      const currentAudioParams = {};
      if (item.userData.effects) {
        currentAudioParams.filterFreq =
          item.userData.effects.filter.frequency.value !== undefined
            ? item.userData.effects.filter.frequency.value
            : 800;
        currentAudioParams.chorusDepth =
          item.userData.effects.chorus.depth.value !== undefined
            ? item.userData.effects.chorus.depth.value
            : 0.3;
        currentAudioParams.delayFeedback =
          item.userData.effects.delay.feedback.value !== undefined
            ? item.userData.effects.delay.feedback.value
            : 0.3;
      } else {
        currentAudioParams.filterFreq = 800;
        currentAudioParams.chorusDepth = 0.3;
        currentAudioParams.delayFeedback = 0.3;
      }

      return {
        track: item.userData.track,
        step: item.userData.step,
        plantModelIndex:
          item.userData.plantModelIndex !== undefined
            ? item.userData.plantModelIndex
            : 0,
        audioParams: currentAudioParams,
        scale: {
          x: item.scale.x,
          y: item.userData.animationProgress || 1.0,
          z: item.scale.z,
        },
      };
    });

  let currentTempo = parseInt(tempoSlider.value);
  if (isNaN(currentTempo)) currentTempo = 80;

  return {
    plants: plantsData,
    tempo: currentTempo,
    ambientSound: AmbientSoundManager.currentSound || null,
  };
}

function showSaveNotification() {
  saveNotification.classList.add("show");
  setTimeout(() => {
    saveNotification.classList.remove("show");
  }, 1500);
}

// --- Three.js & Game Logic (Ported from garden.js) ---

function loadPlantModels(callback) {
  // Configuration for individual files
  const numberOfPlants = 35; // Update this to the exact number of files you have
  const defaultScale = 1.6; // Unified scale for all plants

  const promises = [];

  for (let i = 1; i <= numberOfPlants; i++) {
    const promise = new Promise((resolve) => {
      loader.load(
        `/3d/plants/${i}.glb`,
        (gltf) => {
          const plantModel = gltf.scene;

          // Get bones and skinned meshes by traversing
          const bones = [];
          const skinnedMeshes = [];

          gltf.scene.traverse((child) => {
            if (child.isBone) {
              bones.push(child);
            }
            if (child.isSkinnedMesh) {
              skinnedMeshes.push(child);
            }
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Store animations if they exist
          const animations = gltf.animations || [];

          // Add to array with index matching the file number (1-based file -> 0-based index)
          plantsArray.push({
            model: plantModel,
            scale: defaultScale,
            originalIndex: i - 1,
            animations: animations,
            bones: bones,
            skinnedMeshes: skinnedMeshes,
          });

          resolve();
        },
        undefined,
        (error) => {
          console.warn(`Could not load plant file: /3d/plants/${i}.glb`, error);
          resolve(); // Resolve anyway to allow others to finish
        }
      );
    });
    promises.push(promise);
  }

  Promise.all(promises).then(() => {
    console.log(`Loaded ${plantsArray.length} plants.`);
    if (callback) callback();
  });
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(22, 24, 27); // Raised Y position from 18 to 24 for better view
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById("three-container").appendChild(renderer.domElement);

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

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(0, 50, 0);
  directionalLight.target.position.set(0, 0, 0);
  scene.add(directionalLight);
  scene.add(directionalLight.target);
  directionalLight.castShadow = true;
  // Shadow settings...
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;

  const hemiLight = new THREE.HemisphereLight(0xaaaaff, 0x444466, 0.5);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  floorBuffer = new THREE.Group();
  floorBuffer.position.y = -1.3;
  scene.add(floorBuffer);

  const panelSize = 12.5;
  const panelScale = 40;

  loader.load(
    "/3d/wooden_floor_panels_mid.glb",
    (gltf) => {
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
        { x: panelSize / 2, z: -panelSize / 2 },
        { x: -panelSize / 2, z: panelSize / 2 },
        { x: panelSize / 2, z: panelSize / 2 },
      ];
      positions.forEach((pos) => {
        const p = panelModel.clone();
        p.position.set(pos.x, 0, pos.z);
        p.rotation.y = -Math.PI / 5.6;
        floorBuffer.add(p);
      });
    },
    undefined,
    (e) => console.error(e)
  );

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  // Update animation mixers
  const delta = 0.016; // Approximate 60fps, can use a clock if needed
  plantedItems.forEach((item) => {
    if (item.userData.animationMixer) {
      // In edit mode, we manually control the time, so don't update automatically
      // Otherwise, mixers would be updated by Tone.js or other logic if needed
      // For now, animations are controlled manually in edit mode only
    }
  });

  if (isCameraAnimating) {
    updateCameraAnimation();
  } else if (controls.enabled) {
    controls.update();
  }

  renderer.render(scene, camera);
}

function onBeat(time) {
  const currentNotes = plantedItems.filter(
    (item) => item.userData.step === currentStep
  );
  currentNotes.forEach((item) => {
    const track = item.userData.track;
    const notePos = nTracks - 1 - track;
    const octave = baseOctave + Math.floor(notePos / 7);
    const noteName = noteNames[notePos % 7];
    const pitch = noteName + octave;
    if (item.userData.sampler) {
      item.userData.sampler.triggerAttack(pitch, time);
    }
    animatePlant(track, currentStep);
  });
  beats++;
  currentStep = beats % nSteps;
}

function addRandomNote() {
  if (plantsArray.length === 0) return;
  const occupiedCells = new Set();
  plantedItems.forEach((item) =>
    occupiedCells.add(`${item.userData.track},${item.userData.step}`)
  );

  let randomTime, randomTrack, cellKey;
  let attempts = 0;
  const maxAttempts = nTracks * nSteps;

  do {
    randomTime = Math.floor(Math.random() * nSteps);
    randomTrack = Math.floor(Math.random() * nTracks);
    cellKey = `${randomTrack},${randomTime}`;
    attempts++;
  } while (occupiedCells.has(cellKey) && attempts < maxAttempts);

  if (attempts < maxAttempts) {
    createPlant(randomTrack, randomTime);
    markUnsavedChanges();
  }
}

function pitchToRadius(pitch) {
  const midi = Tone.Frequency(pitch).toMidi();
  return map(midi, 38, 71, 5, 12);
}

function createPlant(track, step, plantModelIndex) {
  if (plantsArray.length === 0) return null;

  let selectedPlantData;
  if (
    plantModelIndex !== undefined &&
    plantsArray.find((p) => p.originalIndex === plantModelIndex)
  ) {
    selectedPlantData = plantsArray.find(
      (p) => p.originalIndex === plantModelIndex
    );
  } else {
    selectedPlantData =
      plantsArray[Math.floor(Math.random() * plantsArray.length)];
    plantModelIndex = selectedPlantData.originalIndex;
  }

  // Use SkeletonUtils for proper skeletal animation cloning
  // Line 617-645 approximately
  const selectedPlant = THREE.SkeletonUtils.clone(selectedPlantData.model);

  selectedPlant.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const originalMaterial = child.material;

      child.material = new THREE.MeshStandardMaterial({
        color: originalMaterial.color
          ? originalMaterial.color.clone()
          : new THREE.Color(0xffffff, 0.5),
        map: originalMaterial.map || null,
        transparent: true,
        alphaTest: 0.5,
        skinning: child.isSkinnedMesh ? true : false,
      });

      // Force material update for SkinnedMesh
      if (child.isSkinnedMesh && child.skeleton) {
        child.material.skinning = true;
        child.material.needsUpdate = true;
      }
    }
  });

  const notePos = nTracks - 1 - track;
  const octave = baseOctave + Math.floor(notePos / 7);
  const noteName = noteNames[notePos % 7];
  const pitch = noteName + octave;

  const radius = pitchToRadius(pitch);
  const angle = (step / nSteps) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  selectedPlant.scale.set(1.0, 1.0, 1.0);
  selectedPlant.position.set(x, 0, z);

  // Setup animation mixer if animations exist
  let animationMixer = null;
  let animationAction = null;
  if (selectedPlantData.animations && selectedPlantData.animations.length > 0) {
    animationMixer = new THREE.AnimationMixer(selectedPlant);
    // Use the first animation
    const clip = selectedPlantData.animations[0];
    animationAction = animationMixer.clipAction(clip);
    animationAction.paused = true; // Start paused, we'll control it manually
    animationAction.play();
  }

  const plantSampler = new Tone.Sampler(sampleMap).toDestination();

  const plantFilter = new Tone.Filter(20000, "lowpass");
  const plantChorus = new Tone.Chorus(4, 2.5, 0).start();
  const plantDelay = new Tone.FeedbackDelay("8n", 0);
  const plantGain = new Tone.Gain(0.3);

  plantSampler.disconnect(Tone.Destination);
  plantSampler.chain(
    plantFilter,
    plantChorus,
    plantDelay,
    plantGain,
    Tone.Destination
  );

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
      gain: plantGain,
    },
    animationMixer: animationMixer,
    animationAction: animationAction,
    animationProgress: 1.0, // Stores Y-axis handle position (1.0 = minSize default)
  };

  scene.add(selectedPlant);
  plantedItems.push(selectedPlant);
  return selectedPlant;
}

function animatePlant(track, step) {
  const plant = plantedItems.find(
    (p) => p.userData.track === track && p.userData.step === step
  );
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

// Event Handlers
function initEvents() {
  playButton.addEventListener("click", togglePlay);

  if (!isReadOnly) {
    randomButton.addEventListener("click", addRandomNote);
    tempoSlider.addEventListener("input", updateTempo);
    renderer.domElement.addEventListener("click", onDocumentMouseClick, false);
    window.addEventListener("keydown", onDocumentKeyDown, false);

    if (saveButton) {
      saveButton.addEventListener("click", (event) => {
        event.preventDefault();
        manualSaveGarden();
      });
    }
    if (nameButton) {
      nameButton.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
      });
    }

    if (closeEditorBtn) {
      closeEditorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Close editor button clicked, isEditing:", isEditing, "isCameraAnimating:", isCameraAnimating);
        exitPlantEditor();
      });
    }
  }

  // Modal events
  const closeButton = document.querySelector(".close-button");
  if (closeButton) closeButton.addEventListener("click", closeModal);
  if (nameInput) {
    nameInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") saveGardenName();
      if (e.key === "Escape") closeModal();
    });
  }
  window.addEventListener("click", (e) => {
    if (e.target === nameModal) closeModal();
  });

  // Auto-save event listeners
  setupAutoSave();
}

function setupAutoSave() {
  if (isReadOnly) return;

  // Expose save function globally for transition.js to use
  window.gardenAutoSave = async function() {
    if (hasUnsavedChanges && !isReadOnly) {
      console.log("Auto-saving before navigation...");
      await autoSaveGarden();
      console.log("Save complete");
      return true;
    }
    return false;
  };

  // Flag to prevent multiple saves
  let isSavingForNavigation = false;

  // Intercept navigation links to save before leaving
  document.addEventListener("click", async (e) => {
    // Don't intercept editor close button or other non-navigation buttons
    if (e.target.closest('#close-editor-btn') || e.target.closest('#editor-ui')) {
      return;
    }
    
    const link = e.target.closest('[data-transition="true"]');
    if (link && hasUnsavedChanges && !isReadOnly && !isSavingForNavigation) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      isSavingForNavigation = true;
      const targetUrl = link.getAttribute('href');
      
      console.log("Saving before navigation to:", targetUrl);
      
      // Show saving indicator
      if (saveNotification) {
        saveNotification.textContent = "Saving...";
        saveNotification.classList.add("show");
      }
      
      try {
        await autoSaveGarden();
        console.log("Save complete, navigating...");
        
        // Update indicator
        if (saveNotification) {
          saveNotification.textContent = "Saved!";
        }
        
        // Small delay to show the "Saved!" message
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error("Save failed, navigating anyway:", error);
        if (saveNotification) {
          saveNotification.textContent = "Save failed";
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (saveNotification) {
        saveNotification.classList.remove("show");
      }
      
      // Navigate after save completes (direct navigation, no transition)
      isSavingForNavigation = false;
      window.location.href = targetUrl;
    }
  }, true); // Use capture phase to intercept before transition.js

  // Auto-save when user is about to leave the page (fallback)
  window.addEventListener("beforeunload", (e) => {
    if (hasUnsavedChanges) {
      console.log("beforeunload - attempting to save");
      autoSaveGarden();
    }
  });

  // Auto-save when tab becomes hidden (user switches tabs)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && hasUnsavedChanges) {
      autoSaveGarden();
    }
  });

  // Auto-save periodically (every 30 seconds if there are changes)
  setInterval(() => {
    if (hasUnsavedChanges) {
      autoSaveGarden();
    }
  }, 30000); // 30 seconds
}

async function togglePlay() {
  if (Tone.context.state !== "running") {
    await Tone.start();
    // Dispatch tone.start event for ambient manager
    document.dispatchEvent(new Event("tone.start"));
  }
  if (Tone.Transport.state === "started") {
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
  markUnsavedChanges();
}

function onDocumentMouseClick(event) {
  if (isReadOnly || isEditing) return;
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(plantedItems, true);
  if (intersects.length > 0) {
    let clickedObject = intersects[0].object;
    while (clickedObject.parent && !plantedItems.includes(clickedObject)) {
      clickedObject = clickedObject.parent;
    }
    if (plantedItems.includes(clickedObject)) {
      enterPlantEditor(clickedObject);
    }
  }
}

function enterPlantEditor(plant) {
  if (isCameraAnimating) return;
  selectedPlant = plant;
  isEditing = true;
  originalCameraPos = camera.position.clone();
  originalControlsTarget = controls.target.clone();
  originalAmbientIntensity = ambientLight.intensity;
  originalDirectionalIntensity = directionalLight.intensity;
  originalFog = scene.fog;

  plant.getWorldPosition(targetControlsTarget);
  const plantSize = new THREE.Box3()
    .setFromObject(plant)
    .getSize(new THREE.Vector3());
  const cameraDistance =
    Math.max(plantSize.x, plantSize.y, plantSize.z) * 3 + 3;
  const direction = new THREE.Vector3()
    .subVectors(camera.position, controls.target)
    .normalize();
  targetCameraPos
    .copy(targetControlsTarget)
    .addScaledVector(direction, cameraDistance);

  isCameraAnimating = true;
  controls.enabled = true; // Keep controls enabled
  controls.enableRotate = true;
  controls.enableZoom = false;
  controls.enablePan = false;

  // --- Lighting Improvements ---
  // Add Spotlight for the selected plant
  if (!editorSpotlight) {
    editorSpotlight = new THREE.SpotLight(0xffffff, 2);
    editorSpotlight.angle = Math.PI / 6;
    editorSpotlight.penumbra = 0.5;
    editorSpotlight.decay = 2;
    editorSpotlight.distance = 50;
    editorSpotlight.castShadow = true;
    scene.add(editorSpotlight);
  }

  // Position spotlight above the camera/viewer towards the plant
  const lightPos = new THREE.Vector3()
    .copy(targetCameraPos)
    .add(new THREE.Vector3(5, 10, 5));
  editorSpotlight.position.copy(lightPos);
  editorSpotlight.target = selectedPlant;
  editorSpotlight.visible = true;

  // Show UI
  if (editorUI) editorUI.style.display = "block";

  // Hide other UI elements during editing
  if (editControls) editControls.style.display = "none";
  if (randomNoteContainer) randomNoteContainer.style.display = "none";
  if (gardenNameDisplay) gardenNameDisplay.style.display = "none";
  if (tempoSlider) tempoSlider.style.display = "none";
  if (playButton) playButton.style.display = "none";
  document
    .querySelector(".ambient-selector")
    ?.style.setProperty("display", "none");
  document
    .querySelector(".explore-button")
    ?.style.setProperty("display", "none");
  document
    .querySelector(".back-button")
    ?.style.setProperty("display", "none");

  createHandles(selectedPlant);

  if (editHandles.length > 0) {
    dragControls = new THREE.DragControls(
      editHandles,
      camera,
      renderer.domElement
    );
    dragControls.addEventListener("dragstart", onHandleDragStart);
    dragControls.addEventListener("drag", onHandleDrag);
    dragControls.addEventListener("dragend", onHandleDragEnd);
  }
}

function exitPlantEditor() {
  console.log("exitPlantEditor called, isEditing:", isEditing, "isCameraAnimating:", isCameraAnimating);
  
  if (!isEditing) {
    console.log("Exit blocked - not in editing mode");
    return;
  }
  
  // If camera is still animating from entering, skip the check and proceed
  // The exit will trigger its own camera animation
  console.log("Exiting editor mode...");
  
  if (dragControls) {
    dragControls.dispose();
    dragControls = null;
  }
  removeHandles();

  // Reset Lights
  ambientLight.intensity = originalAmbientIntensity;
  directionalLight.intensity = originalDirectionalIntensity;
  scene.fog = originalFog;

  if (editorSpotlight) {
    editorSpotlight.visible = false;
  }

  // Hide UI
  if (editorUI) editorUI.style.display = "none";

  // Restore other UI elements
  if (!isReadOnly) {
    if (editControls) editControls.style.display = "block";
    if (randomNoteContainer) randomNoteContainer.style.display = "block";
  }
  if (gardenNameDisplay) gardenNameDisplay.style.display = "block";
  if (tempoSlider) tempoSlider.style.display = "block";
  if (playButton) playButton.style.display = "block";
  document
    .querySelector(".ambient-selector")
    ?.style.setProperty("display", "flex");
  document
    .querySelector(".explore-button")
    ?.style.setProperty("display", "block");
  document
    .querySelector(".back-button")
    ?.style.setProperty("display", "block");

  targetCameraPos.copy(originalCameraPos);
  targetControlsTarget.copy(originalControlsTarget);
  isCameraAnimating = true;

  // Re-enable controls after exiting (will be set properly in updateCameraAnimation)

  // Mark as changed since plant editing may have modified scales/animations
  markUnsavedChanges();

  selectedPlant = null;
  isEditing = false;
  
  console.log("Editor exit complete, camera animation started");
}

function createHandles(object) {
  removeHandles();
  const handleSize = 0.15; // Smaller size
  // Japanese Styled: Matte Spheres (Paper Lantern / Bead style)
  const handleGeometry = new THREE.SphereGeometry(handleSize, 32, 32);

  // Simple RGB colors
  const colors = {
    x: 0xff0000, // Red
    y: 0x00ff00, // Green
    z: 0x0000ff, // Blue
  };
  const axes = ["x", "y", "z"];
  const bbox = new THREE.Box3().setFromObject(object);
  const objectSize = bbox.getSize(new THREE.Vector3());
  const objectCenter = bbox.getCenter(new THREE.Vector3());

  axes.forEach((axis) => {
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: colors[axis],
      transparent: false,
      roughness: 1.0, // Completely matte (paper/wood like)
      metalness: 0.0, // No reflection
      emissive: colors[axis],
      emissiveIntensity: 0.2, // Slight inner glow
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.userData.axis = axis;
    const position = objectCenter.clone();

    // Position handles based on scale or animationProgress
    if (
      axis === "y" &&
      object.userData &&
      object.userData.animationProgress !== undefined
    ) {
      const baseDistance = objectSize[axis] / 2;
      const scaledDistance = baseDistance * object.userData.animationProgress;
      position[axis] += scaledDistance + handleSize * 4;
    } else {
      position[axis] += objectSize[axis] / 2 + handleSize * 4;
    }

    handle.position.copy(position);
    scene.add(handle);
    editHandles.push(handle);
  });
}

function removeHandles() {
  editHandles.forEach((handle) => {
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
  const handleSize = handles[0].geometry.parameters.radius; // Sphere uses radius (now 0.15)
  handles.forEach((handle) => {
    const axis = handle.userData.axis;
    if (!axis) return;
    const position = objectCenter.clone();

    // For Y-axis, position handle as if object were scaled by animationProgress
    if (
      axis === "y" &&
      object.userData &&
      object.userData.animationProgress !== undefined
    ) {
      const baseDistance = objectSize[axis] / 2;
      const scaledDistance = baseDistance * object.userData.animationProgress;
      position[axis] += scaledDistance + handleSize * 4;
    } else {
      // For X and Z, use actual object size (which reflects scale)
      position[axis] += objectSize[axis] / 2 + handleSize * 4;
    }

    handle.position.copy(position);
  });
}

function onHandleDragStart(event) {
  controls.enableRotate = false; // Temporarily disable rotation during drag
  event.object.userData.startDragPosition = event.object.position.clone();
  if (selectedPlant) {
    // Store scale values, but use animationProgress for Y axis
    const axis = event.object.userData.axis;
    if (axis === "y") {
      event.object.userData.startPlantScale = {
        x: selectedPlant.scale.x,
        y: selectedPlant.userData.animationProgress || 1.0,
        z: selectedPlant.scale.z,
      };
    } else {
      event.object.userData.startPlantScale = selectedPlant.scale.clone();
    }
  }
}

function onHandleDrag(event) {
  const dragObject = event.object;
  if (!selectedPlant || !editHandles.includes(dragObject)) return;
  const axis = dragObject.userData.axis;
  const currentPosition = dragObject.position;
  const startPosition = dragObject.userData.startDragPosition;
  const deltaPosition = currentPosition.clone().sub(startPosition);
  const displacement = deltaPosition[axis];
  const scaleChange = displacement * 3.0;
  const startScaleValue = dragObject.userData.startPlantScale[axis];
  let newScaleValue = Math.max(
    minSize,
    Math.min(startScaleValue + scaleChange, maxSize)
  );

  // Limit Y-axis handle to viewport bounds
  if (axis === "y") {
    const bbox = new THREE.Box3().setFromObject(selectedPlant);
    const plantCenter = bbox.getCenter(new THREE.Vector3());
    const maxYPosition = 8.0; // Maximum Y position for handle (adjust as needed)
    const minYPosition = plantCenter.y + 0.5; // Minimum Y position (slightly above plant center)

    // Calculate what the handle position would be
    const handleSize = editHandles[0].geometry.parameters.radius;
    const baseDistance = bbox.getSize(new THREE.Vector3()).y / 2;
    const projectedHandleY =
      plantCenter.y + baseDistance * newScaleValue + handleSize * 4;

    // Clamp the animation progress based on handle position limits
    if (projectedHandleY > maxYPosition) {
      newScaleValue =
        (maxYPosition - plantCenter.y - handleSize * 4) / baseDistance;
      newScaleValue = Math.max(minSize, Math.min(newScaleValue, maxSize));
    } else if (projectedHandleY < minYPosition) {
      newScaleValue =
        (minYPosition - plantCenter.y - handleSize * 4) / baseDistance;
      newScaleValue = Math.max(minSize, Math.min(newScaleValue, maxSize));
    }
  }

  // Apply scale to X and Z axes, store animation progress for Y
  if (axis === "y") {
    selectedPlant.userData.animationProgress = newScaleValue;
  } else {
    selectedPlant.scale[axis] = newScaleValue;
  }

  updateHandlePositions(selectedPlant, editHandles);
  const updatedHandleData = editHandles.find((h) => h === dragObject);
  if (updatedHandleData) dragObject.position.copy(updatedHandleData.position);

  // Update effects based on scale/progress
  const freq =
    selectedPlant.scale.x <= 1.05
      ? 0
      : map(selectedPlant.scale.x, minSize, maxSize, 0, 3000);
  const chorDepth = map(
    selectedPlant.userData.animationProgress || 1.0,
    minSize,
    maxSize,
    0,
    0.9
  );
  const delayFb = map(selectedPlant.scale.z, minSize, maxSize, 0, 0.7);
  
  // Y-axis also controls volume (gain)
  const volumeGain = map(
    selectedPlant.userData.animationProgress || 1.0,
    minSize,
    maxSize,
    0.1,  // Minimum volume
    0.6   // Maximum volume
  );
  
  if (selectedPlant.userData.effects) {
    const filterValue = freq === 0 ? 20000 : 3000 - freq + 300;
    if (
      selectedPlant.userData.effects.filter.frequency &&
      typeof selectedPlant.userData.effects.filter.frequency === "object"
    ) {
      selectedPlant.userData.effects.filter.frequency.value = filterValue;
    }

    if (
      selectedPlant.userData.effects.chorus.depth &&
      typeof selectedPlant.userData.effects.chorus.depth === "object"
    ) {
      selectedPlant.userData.effects.chorus.depth.value = chorDepth;
    }

    if (
      selectedPlant.userData.effects.delay.feedback &&
      typeof selectedPlant.userData.effects.delay.feedback === "object"
    ) {
      selectedPlant.userData.effects.delay.feedback.value = delayFb;
    }
    
    // Update volume based on Y-axis handle position
    if (
      selectedPlant.userData.effects.gain &&
      typeof selectedPlant.userData.effects.gain.gain === "object"
    ) {
      selectedPlant.userData.effects.gain.gain.value = volumeGain;
    }
  }

  // Update animation based on chorus depth (Y-axis handle)
  if (axis === "y" && selectedPlant.userData.animationAction) {
    const action = selectedPlant.userData.animationAction;
    const duration = action.getClip().duration;
    // Map chorus depth (0 to 0.9) to animation time (0 to duration)
    const animationTime = (chorDepth / 0.9) * duration;
    action.time = animationTime;
    // Force update the animation without actually playing
    if (selectedPlant.userData.animationMixer) {
      // Use a small delta to force the mixer to apply the animation at the current time
      selectedPlant.userData.animationMixer.update(0.001);
    }
  }
}

function onHandleDragEnd(event) {
  if (isEditing) controls.enableRotate = true; // Re-enable rotation after drag
  markUnsavedChanges(); // Plant was modified
}

function map(value, inMin, inMax, outMin, outMax) {
  if (Math.abs(value - 1.0) < 0.05) return outMin;
  const clampedValue = Math.max(inMin, Math.min(value, inMax));
  return (
    ((clampedValue - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
  );
}

function onDocumentKeyDown(event) {
  if (isEditing && event.key === "Escape") exitPlantEditor();
}

function updateCameraAnimation() {
  const lerpFactor = 0.07;
  camera.position.lerp(targetCameraPos, lerpFactor);
  controls.target.lerp(targetControlsTarget, lerpFactor);
  controls.update();
  if (
    camera.position.distanceTo(targetCameraPos) < 0.05 &&
    controls.target.distanceTo(targetControlsTarget) < 0.05
  ) {
    isCameraAnimating = false;
    camera.position.copy(targetCameraPos);
    controls.target.copy(targetControlsTarget);
    if (isEditing) {
      // Keep controls enabled but restrict
      controls.enableRotate = true;
      controls.enableZoom = false;
      controls.enablePan = false;
      // Lower global lighting significantly to focus on spotlight
      ambientLight.intensity = 0.05;
      directionalLight.intensity = 0.05;
      // Push fog back so it doesn't obscure the plant
      const dist = camera.position.distanceTo(controls.target);
      scene.fog = new THREE.Fog(0x111122, dist + 5, dist + 25);
    } else {
      controls.enabled = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
    }
  }
}

function openModal() {
  if (nameModal) nameModal.style.display = "flex";
  if (nameInput) nameInput.focus();
}
function closeModal() {
  if (nameModal) nameModal.style.display = "none";
}

const AmbientSoundManager = {
  player: null,
  currentSound: null,
  pendingAutoplay: false,
  init: function () {
    document.addEventListener(
      "click",
      () => {
        if (this.pendingAutoplay && this.currentSound) {
          this.playCurrentSound();
          this.pendingAutoplay = false;
        }
      },
      { once: true }
    );
    document.addEventListener("tone.start", () => {
      if (this.pendingAutoplay && this.currentSound) {
        this.playCurrentSound();
        this.pendingAutoplay = false;
      }
    });
    this.setupListeners();
  },
  setupListeners: function () {
    const ambientIcons = document.querySelectorAll(".ambient-icon");
    ambientIcons.forEach((icon) => {
      icon.addEventListener("click", () => {
        const soundNumber = icon.dataset.sound;
        this.switchSound(soundNumber);
        ambientIcons.forEach((i) => i.classList.remove("active"));
        icon.classList.add("active");
      });
    });
    const noneIcon = document.querySelector('.ambient-icon[data-sound="none"]');
    if (noneIcon) noneIcon.classList.add("active");
  },
  playCurrentSound: function () {
    if (!this.player) return;
    const playPromise = this.player.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        this.pendingAutoplay = true;
      });
    }
  },
  switchSound: function (soundNumber) {
    if (this.player) {
      this.player.pause();
      this.player = null;
    }
    if (!soundNumber || soundNumber === "none") {
      this.currentSound = null;
      markUnsavedChanges();
      return;
    }
    this.player = new Audio(`/samples/ambient/${soundNumber}.wav`);
    this.player.loop = true;
    this.player.volume = 0.4;
    this.currentSound = soundNumber;
    this.playCurrentSound();
    markUnsavedChanges();
  },
};

// Start
init();
