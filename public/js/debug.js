const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('three-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

const loader = new THREE.GLTFLoader();

loader.load('/3d/lowpoly_indoor_plant_pack.glb', (gltf) => {
    const sketchfabModel = gltf.scene.children[0];
    const mainScene = sketchfabModel.children[0];
    const rootNode = mainScene.children[0];
    const plants = rootNode.children; // finally got the plants
  
    console.log('Extracted Real Real Plants:', plants);
  
    plants.forEach((plant, index) => {
      const clone = plant.clone();
      clone.position.set(index * 4 - (plants.length * 2), 0, 0);
      scene.add(clone);
  
      console.log(`Plant ${index}:`, plant.name);
    });
  }, undefined, (error) => {
    console.error('Error loading GLB', error);
  });
  
  

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
