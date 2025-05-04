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
  document.documentElement.style.setProperty('--garden-background', `url('/2dassets/garden_bg/${backgroundId}.jpg')`);
}

document.addEventListener('DOMContentLoaded', setGardenBackground); 