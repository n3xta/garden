// Ambient Sound Manager
const AmbientSoundManager = {
  // The current ambient sound player
  player: null,
  
  // The currently active sound (null means no sound)
  currentSound: null,
  
  // Flag to track if we're waiting for user interaction to play
  pendingAutoplay: false,
  
  // Initialize the ambient sound manager
  init: function() {
    // Wait until the document is fully loaded and interacted with (for autoplay policies)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupListeners());
    } else {
      this.setupListeners();
    }
    
    // Add additional event for ensuring audio can play after user interaction
    document.addEventListener('click', () => {
      // This empty function ensures we've had user interaction,
      // which browsers require for autoplay
      if (this.pendingAutoplay && this.currentSound) {
        this.playCurrentSound();
        this.pendingAutoplay = false;
      }
    }, { once: true });
    
    // Listen for Tone.js start events - if Tone.js is started, we can also start our ambient sound
    document.addEventListener('tone.start', () => {
      if (this.pendingAutoplay && this.currentSound) {
        this.playCurrentSound();
        this.pendingAutoplay = false;
      }
    });
  },
  
  // Set up event listeners for ambient icons
  setupListeners: function() {
    const ambientIcons = document.querySelectorAll('.ambient-icon');
    
    // Add click event listeners to all ambient icons
    ambientIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        const soundNumber = icon.dataset.sound;
        this.switchSound(soundNumber);
        
        // Update active state for all icons
        ambientIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });
    
    // Initialize with no sound active
    document.querySelector('.ambient-icon[data-sound="none"]').classList.add('active');
  },
  
  // Play the current sound (handles browser autoplay restrictions)
  playCurrentSound: function() {
    if (!this.player) return;
    
    const playPromise = this.player.play();
    
    // Handle the play promise to catch autoplay restrictions
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Autoplay prevented. Will play after user interaction:', error);
        this.pendingAutoplay = true;
      });
    }
  },
  
  // Switch to a different ambient sound
  switchSound: function(soundNumber) {
    // Stop the current sound if playing
    if (this.player) {
      this.player.pause();
      this.player = null;
    }
    
    // If soundNumber is null or 'none', don't play anything
    if (!soundNumber || soundNumber === 'none') {
      this.currentSound = null;
      return;
    }
    
    // Create a new audio player
    this.player = new Audio(`/samples/ambient/${soundNumber}.wav`);
    this.player.loop = true;
    this.player.volume = 0.4; // Lower volume to blend better with garden sounds
    this.currentSound = soundNumber;
    
    // Try to play, but handle autoplay restrictions
    this.playCurrentSound();
  }
};

// Initialize the ambient sound manager
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