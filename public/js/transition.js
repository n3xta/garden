// 立即执行创建预加载遮罩，确保最早优先级
(function() {
  // 先将html/body添加loading类，确保内容不可见
  document.documentElement.classList.add('loading');
  document.body && document.body.classList.add('loading');
  
  // 创建遮罩并插入为body的第一个子元素
  function createAndInsertPreloader() {
    if (!document.querySelector('.page-preloader')) {
      var preloader = document.createElement('div');
      preloader.className = 'page-preloader';
      
      // 始终将遮罩插入为body的第一个子元素
      if (document.body.firstChild) {
        document.body.insertBefore(preloader, document.body.firstChild);
      } else {
        document.body.appendChild(preloader);
      }
      
      // 阻止点击穿透
      preloader.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
      
      // 恢复页面可见性
      document.body.classList.add('js-loading-ready');
      document.body.classList.remove('loading');
    }
  }

  // 立即执行，确保尽早创建预加载遮罩
  if (document.body) {
    createAndInsertPreloader();
  } else {
    // 如果DOM还没准备好，等待DOMContentLoaded事件
    document.addEventListener('DOMContentLoaded', createAndInsertPreloader);
    
    // 备用方案：如果DOMContentLoaded已经发生，使用setTimeout
    setTimeout(function() {
      if (document.body && !document.querySelector('.page-preloader')) {
        createAndInsertPreloader();
      }
    }, 0);
  }
})();

// 主要transition功能
document.addEventListener('DOMContentLoaded', function() {
  // 检测当前页面类型
  var isGardenPage = window.location.pathname.includes('/garden') || 
                    window.location.pathname.includes('/view') || 
                    window.location.pathname.includes('/mygarden');
                    
  console.log('当前页面:', window.location.pathname);
  console.log('检测为Garden页面:', isGardenPage);
                    
  // 获取预加载遮罩元素
  var preloader = document.querySelector('.page-preloader');
  
  // Cache some DOM elements
  var transitionLayer = document.querySelector('.cd-transition-layer');
  var transitionBackground = document.querySelector('.cd-transition-layer .bg-layer');
  var body = document.body;
  
  // 调试信息
  console.log('Transition layer found:', transitionLayer !== null);
  console.log('Transition background found:', transitionBackground !== null);
  console.log('Preloader found:', preloader !== null);
  
  // Set variables for the animation
  var frameProportion = 1.78; // png frame aspect ratio
  var frames = 25; // number of png frames
  var resize = false;
  
  // 检查sessionStorage状态
  var pageIsEntering = sessionStorage.getItem('pageIsEntering');
  console.log('SessionStorage pageIsEntering值:', pageIsEntering);
  
  // garden页面需要特殊处理 - 强制执行ink out效果
  if (isGardenPage) {
    console.log('Garden页面 - 强制启用Ink Out效果');
    // 如果是Garden页面，不管sessionStorage如何，都尝试执行ink out动画
    initInkOutAnimation(true);
  } else if (pageIsEntering === 'true') {
    // 其他页面正常处理
    body.classList.add('has-ink-transition'); // 临时隐藏页面内容
    initInkOutAnimation();
    // 重置状态
    sessionStorage.removeItem('pageIsEntering');
  } else {
    // 如果不需要过渡效果，移除预加载遮罩
    removePreloader();
  }
  
  // 只有在找到元素时才设置尺寸
  if (transitionLayer && transitionBackground) {
    // Set the transition layer dimensions
    setLayerDimensions();
    
    // Handle window resize
    window.addEventListener('resize', function() {
      if (!resize) {
        resize = true;
        (!window.requestAnimationFrame) 
          ? setTimeout(setLayerDimensions, 300) 
          : window.requestAnimationFrame(setLayerDimensions);
      }
    });
  } else {
    console.error('Transition elements not found!');
    // 如果找不到过渡元素，确保移除预加载遮罩
    removePreloader();
  }
  
  // 移除预加载遮罩的函数
  function removePreloader() {
    if (preloader) {
      preloader.classList.add('fade-out');
      setTimeout(function() {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 300); // 等待淡出动画
    }
  }
  
  // Add click event listeners to all links that should have transition
  var transitionLinks = document.querySelectorAll('[data-transition="true"]');
  console.log('Transition links found:', transitionLinks.length);
  
  transitionLinks.forEach(function(link, index) {
    console.log('Link', index, ':', link.getAttribute('href'));
    link.addEventListener('click', function(event) {
      console.log('Link clicked:', this.getAttribute('href'));
      event.preventDefault();
      var targetUrl = this.getAttribute('href');
      startTransition(targetUrl);
    });
  });
  
  // Function to start transition
  function startTransition(url) {
    console.log('Starting transition to:', url);
    if (!transitionLayer || !transitionBackground) {
      console.error('Cannot start transition - elements not found');
      window.location.href = url; // 直接跳转
      return;
    }
    
    // 设置标记，表示下一个页面需要执行"ink out"动画
    sessionStorage.setItem('pageIsEntering', 'true');
    
    transitionLayer.classList.add('visible', 'opening');
    console.log('Added visible and opening classes');
    
    // Wait for animation to complete before navigating
    transitionBackground.addEventListener('animationend', function onEnd() {
      console.log('Animation ended, navigating to:', url);
      window.location.href = url;
      transitionBackground.removeEventListener('animationend', onEnd);
    });
  }
  
  // 初始化页面进入时的"ink out"动画
  function initInkOutAnimation(forceAnimation) {
    console.log('初始化Ink Out动画, 强制执行:', forceAnimation);
    
    if (!transitionLayer || !transitionBackground) {
      console.error('Cannot init ink out animation - elements not found');
      // 即使没有动画也要显示内容并移除预加载遮罩
      body.classList.remove('has-ink-transition');
      body.classList.add('ink-transition-complete');
      removePreloader();
      return;
    }
    
    // 初始状态：墨水层应该完全覆盖屏幕
    transitionLayer.classList.add('visible');
    // 设置墨水层为最终帧位置（与opening动画结束的位置相同）
    transitionBackground.style.transform = 'translateY(-50%) translateX(-98%)';
    console.log('已设置墨水层初始状态为覆盖');
    
    // 创建一个promise来跟踪所有重要资源的加载
    var pageReady = new Promise(function(resolve) {
      if (isGardenPage && forceAnimation) {
        // Garden页面可能有复杂的3D加载，使用更长的延迟
        console.log('Garden页面 - 使用额外延迟等待3D内容加载');
        setTimeout(resolve, 1000); // 给3D内容更多加载时间
      } else if (document.readyState === 'complete') {
        resolve();
      } else {
        // 否则等待页面加载
        window.addEventListener('load', resolve);
      }
    });
    
    // 等待重要内容加载完成
    pageReady.then(function() {
      console.log('页面内容准备就绪，开始准备动画');
      // 准备显示页面内容
      body.classList.remove('has-ink-transition');
      body.classList.add('ink-transition-complete');
      
      // 短暂延迟以允许内容渲染
      setTimeout(function() {
        console.log('开始执行ink out动画');
        
        // 重要修改：同时移除预加载遮罩和启动ink out动画
        // 淡出预加载遮罩
        removePreloader();
        
        // 添加closing类开始反向动画
        transitionLayer.classList.add('closing');
        
        // 动画结束后移除所有类
        transitionBackground.addEventListener('animationend', function onClose() {
          console.log('Ink out动画完成');
          transitionLayer.classList.remove('visible', 'closing');
          // 重置transform
          transitionBackground.style.transform = '';
          transitionBackground.removeEventListener('animationend', onClose);
        });
      }, isGardenPage ? 500 : 200); // Garden页面给更长时间
    });
  }
  
  // Function to set layer dimensions based on window size
  function setLayerDimensions() {
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var layerHeight, layerWidth;
    
    if (windowWidth / windowHeight > frameProportion) {
      layerWidth = windowWidth;
      layerHeight = layerWidth / frameProportion;
    } else {
      layerHeight = windowHeight * 1.2;
      layerWidth = layerHeight * frameProportion;
    }
    
    transitionBackground.style.width = layerWidth * frames + 'px';
    transitionBackground.style.height = layerHeight + 'px';
    console.log('Set dimensions - width:', layerWidth * frames, 'height:', layerHeight);
    
    resize = false;
  }
}); 