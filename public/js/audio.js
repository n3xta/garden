// 音效管理模块
// 提供统一的音效加载和播放功能

const AudioEffects = {
  // 已加载的音效缓存
  sounds: {},

  // 预加载音效
  preload: function(urls) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    urls.forEach(url => {
      if (!this.sounds[url]) {
        this.sounds[url] = new Audio(url);
      }
    });
  },

  // 播放音效
  play: function(url) {
    if (!this.sounds[url]) {
      this.sounds[url] = new Audio(url);
    }
    
    // 重置音效，以便可以多次播放
    this.sounds[url].currentTime = 0;
    this.sounds[url].play().catch(err => {
      console.warn('音效播放失败:', err);
    });
  }
};

// 预加载常用音效
document.addEventListener('DOMContentLoaded', () => {
  AudioEffects.preload([
    '/samples/ui/paper.wav',
    '/samples/ui/wood.wav',
    '/samples/ui/save.wav',
    '/samples/ui/explore.wav',
    '/samples/ui/garden.wav'
  ]);
}); 