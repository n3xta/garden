// Garden Name Manager
document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const modal = document.getElementById('name-modal');
  const nameButton = document.getElementById('name-button');
  const closeButton = document.querySelector('.close-button');
  const cancelButton = document.getElementById('cancel-name');
  const saveButton = document.getElementById('save-name');
  const nameInput = document.getElementById('garden-name-input');
  const nameDisplay = document.getElementById('garden-name-display');
  const nameDisplayText = nameDisplay ? nameDisplay.querySelector('h3') : null;
  const nameNotification = document.getElementById('name-notification');
  const gardenDataElement = document.getElementById('garden-data');

  // Get saved garden name if any
  const savedName = gardenDataElement ? gardenDataElement.getAttribute('data-garden-name') : '';
  
  // Set initial garden name in the display and form
  if (nameDisplayText && savedName) {
    nameDisplayText.textContent = savedName;
    if (nameInput) nameInput.value = savedName;
  }

  // Functions
  function openModal() {
    if (modal) {
      if (savedName) {
        nameInput.value = savedName;
      }
      modal.style.display = 'block';
      nameInput.focus();
      
      // Play UI sound effect
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
    if (!newName) return; // Don't save empty names
    
    // Play save sound
    if (typeof AudioEffects !== 'undefined') {
      AudioEffects.play('/samples/ui/save.wav');
    }
    
    // Send the name to the server
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
      
      // Update the displayed name
      if (nameDisplayText) {
        nameDisplayText.textContent = newName;
      }
      
      // Update the data attribute for future use
      if (gardenDataElement) {
        gardenDataElement.setAttribute('data-garden-name', newName);
      }
      
      // Show saved notification
      showNameSavedNotification();
      
      // Close the modal
      closeModal();
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
      }, 2500);
    }
  }

  // Event Listeners
  if (nameButton) {
    nameButton.addEventListener('click', function(e) {
      e.preventDefault();
      openModal();
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', closeModal);
  }

  if (saveButton) {
    saveButton.addEventListener('click', saveGardenName);
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

  // Close modal when clicking outside of it
  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}); 