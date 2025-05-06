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

document.addEventListener('DOMContentLoaded', () => {
  // 检测当前页面类型
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
  const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index';
  
  // 初始化页面通用效果
  initTiltEffects();
  
  // 根据页面类型初始化特定功能
  if (isAuthPage) {
    initAuthPage();
  } else if (isIndexPage) {
    // 添加登录注册链接的事件监听
    initAuthTransitionLinks();
  }
});

// ===== 通用倾斜效果初始化 =====
function initTiltEffects() {
  // 初始化所有带有data-tilt属性的元素
  // 让它使用HTML中定义的参数，不在JS中设置
  const tiltElements = document.querySelectorAll('[data-tilt]');
  if (tiltElements.length > 0) {
    VanillaTilt.init(tiltElements);
  }
}

// ===== 认证页面初始化 =====
function initAuthPage() {
  // 检查是否来自另一个认证页面
  const fromAuthPage = document.referrer.includes('/login') || document.referrer.includes('/register');
  
  // 播放纸张声音效果
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/paper.wav');
  } else {
    const paperSound = new Audio('/samples/ui/paper.wav');
    paperSound.play();
  }
  
  // 立即显示表单
  const formWrapper = document.querySelector('.form-wrapper');
  const formContainer = document.querySelector('.form-container');
  
  if (formWrapper) {
    formWrapper.style.opacity = '1';
    
    // 如果来自另一个认证页面，添加从下方入场动画
    if (fromAuthPage && formContainer) {
      formContainer.classList.add('enter-from-below');
    }
  }
  
  // 添加登录/注册链接的事件监听器
  const loginLink = document.querySelector('.login-link');
  const signupLink = document.querySelector('.signup-link');
  
  if (loginLink) {
    loginLink.addEventListener('click', function(event) {
      handleAuthPageTransition(event, 'login');
    });
  }
  
  if (signupLink) {
    signupLink.addEventListener('click', function(event) {
      handleAuthPageTransition(event, 'signup');
    });
  }
}

// ===== 首页认证链接初始化 =====
function initAuthTransitionLinks() {
  // 添加首页上登录/注册链接的事件监听器
  const loginLink = document.querySelector('.login-link');
  const signupLink = document.querySelector('.signup-link');
  
  if (loginLink) {
    loginLink.addEventListener('click', function(event) {
      handleAuthTransition(event, 'login');
    });
  }
  
  if (signupLink) {
    signupLink.addEventListener('click', function(event) {
      handleAuthTransition(event, 'signup');
    });
  }
}

// ===== 从首页到认证页面的过渡动画 =====
function handleAuthTransition(event, formType) {
  event.preventDefault();
  
  // 创建木质背景过渡层
  if (!document.querySelector('.transition-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    document.body.appendChild(overlay);
    
    // 强制重排以确保初始状态应用
    overlay.offsetHeight;
  }
  
  // 获取过渡层
  const overlay = document.querySelector('.transition-overlay');
  
  // 播放木质声音
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/wood.wav');
  } else {
    const woodSound = new Audio('/samples/ui/wood.wav');
    woodSound.play();
  }
  
  // 开始动画
  overlay.classList.add('active');
  
  // 快速过渡 - 木材背景开始显示后立即导航
  setTimeout(() => {
    window.location.href = formType === 'login' ? '/login' : '/register';
  }, 300);
}

// ===== 认证页面之间的切换动画 =====
function handleAuthPageTransition(event, formType) {
  event.preventDefault();
  
  // 播放纸张声音
  if (typeof AudioEffects !== 'undefined') {
    AudioEffects.play('/samples/ui/paper.wav');
  } else {
    const paperSound = new Audio('/samples/ui/paper.wav');
    paperSound.play();
  }
  
  // 获取当前表单容器
  const currentFormContainer = document.querySelector('.form-container');
  const formWrapper = document.querySelector('.form-wrapper');
  
  // 添加上滑动画
  currentFormContainer.classList.add('exit-up');
  
  // 立即开始整体透明度渐变
  if (formWrapper) {
    formWrapper.style.transition = 'opacity 0.2s ease-out';
    formWrapper.style.opacity = '0';
  }
  
  // 立即导航到新页面
  window.location.href = formType === 'login' ? '/login' : '/register';
} 