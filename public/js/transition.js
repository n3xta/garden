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
      
      // 添加loading文字
      var loadingText = document.createElement('div');
      loadingText.className = 'loading-text';
      loadingText.textContent = 'loading...';
      preloader.appendChild(loadingText);
      
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
                    
  var isIndexPage = window.location.pathname === '/' || 
                   window.location.pathname === '/index.html';
                   
  var isAuthPage = window.location.pathname.includes('/login') || 
                  window.location.pathname.includes('/register');
                    
  console.log('当前页面:', window.location.pathname);
  console.log('检测为Garden页面:', isGardenPage);
  console.log('检测为首页:', isIndexPage);
  console.log('检测为认证页面:', isAuthPage);
                    
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
  
  // 如果是认证页面（login/register），无需特殊处理，直接移除预加载遮罩
  if (isAuthPage) {
    console.log('认证页面 - 不使用ink效果');
    removePreloader();
    return; // 提前退出，不执行后续代码
  }
  
  // 如果是首页或Garden页面需要特殊处理 - 强制执行ink out效果
  if (isGardenPage || isIndexPage) {
    console.log((isGardenPage ? 'Garden' : 'Index') + '页面 - 强制启用Ink Out效果');
    // 不管sessionStorage如何，都尝试执行ink out动画
    initInkOutAnimation(true);
    
    // 如果是首页，预加载login和register页面资源
    if (isIndexPage) {
      preloadAuthResources();
    }
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
  
  // 预加载认证页面所需资源
  function preloadAuthResources() {
    console.log('预加载登录/注册页面资源');
    
    // 预加载图片
    var imagesToPreload = [
      '/img/login_form.png',
      '/img/save.png',
      '/img/letter.png',
      '/img/login.png',
      '/img/signup.png'
    ];
    
    imagesToPreload.forEach(function(src) {
      var img = new Image();
      img.src = src;
    });
    
    // 预加载音频文件
    if (typeof AudioEffects !== 'undefined') {
      // 如果音频模块已加载，使用它预加载
      AudioEffects.preload(['/samples/ui/click.wav']);
    } else {
      // 如果音效模块未加载，使用原生Audio API
      var audio = new Audio();
      audio.preload = 'auto';
      audio.src = '/samples/ui/click.wav';
    }
    
    // 预加载JS
    var scriptsToPreload = [
      '/js/auth.js',
      '/lib/vanilla-tilt.js'
    ];
    
    scriptsToPreload.forEach(function(src) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.rel = 'preload';
      script.as = 'script';
      document.head.appendChild(script);
    });
    
    // 预加载CSS
    var cssToPreload = [
      '/css/auth.css'
    ];
    
    cssToPreload.forEach(function(href) {
      var link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    });
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
    
    // 如果目标是login或register，不使用墨水特效
    if (url.includes('/login') || url.includes('/register')) {
      console.log('跳转到认证页面 - 不使用ink效果');
      window.location.href = url; // 直接跳转
      return;
    }
    
    // 清除任何现有动画状态
    transitionLayer.classList.remove('closing');
    
    // 播放过渡音效
    if (url.includes('/explore')) {
      // 播放explore音效
      if (typeof AudioEffects !== 'undefined') {
        AudioEffects.play('/samples/ui/explore.wav');
      } else {
        const exploreSound = new Audio('/samples/ui/explore.wav');
        exploreSound.play().catch(err => console.warn('音效播放失败:', err));
      }
    } else if (url.includes('/garden') || url.includes('/mygarden') || url.includes('/view')) {
      // 播放garden音效
      if (typeof AudioEffects !== 'undefined') {
        AudioEffects.play('/samples/ui/garden.wav');
      } else {
        const gardenSound = new Audio('/samples/ui/garden.wav');
        gardenSound.play().catch(err => console.warn('音效播放失败:', err));
      }
    }
    
    // 设置标记，表示下一个页面需要执行"ink out"动画
    sessionStorage.setItem('pageIsEntering', 'true');
    
    // 使用requestAnimationFrame确保DOM更新节奏一致
    requestAnimationFrame(function() {
      // 先添加visible类
      transitionLayer.classList.add('visible');
      
      // 使用另一个requestAnimationFrame确保前一个类已应用
      requestAnimationFrame(function() {
        // 再添加opening类启动动画
        transitionLayer.classList.add('opening');
        console.log('Added visible and opening classes');
        
        // 创建一次性事件监听器
        function onAnimationEnd(event) {
          // 确保是bg-layer的动画结束
          if (event.target !== transitionBackground) return;
          
          console.log('Animation ended, navigating to:', url);
          
          // 清理监听器
          transitionBackground.removeEventListener('animationend', onAnimationEnd);
          
          // 跳转到目标URL
          window.location.href = url;
        }
        
        // 确保只添加一次监听器
        transitionBackground.removeEventListener('animationend', onAnimationEnd);
        transitionBackground.addEventListener('animationend', onAnimationEnd, {once: true});
      });
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
    
    // 清除任何已有的类和监听器，确保干净的状态
    transitionLayer.classList.remove('closing');
    var oldEndListener = transitionBackground.onanimationend;
    if (oldEndListener) {
      transitionBackground.removeEventListener('animationend', oldEndListener);
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
        setTimeout(resolve, 2000); // 给3D内容更多加载时间
      } else if (isIndexPage && forceAnimation) {
        // 首页也需要足够时间加载和预加载资源
        console.log('首页 - 使用延迟等待资源加载');
        setTimeout(resolve, 1500);
      } else if (document.readyState === 'complete') {
        resolve();
      } else {
        // 否则等待页面加载
        window.addEventListener('load', resolve);
      }
    });
    
    // 使用标志防止多次触发动画
    var animationStarted = false;
    
    // 等待重要内容加载完成
    pageReady.then(function() {
      console.log('页面内容准备就绪，开始准备动画');
      // 准备显示页面内容
      body.classList.remove('has-ink-transition');
      body.classList.add('ink-transition-complete');
      
      // 短暂延迟以允许内容渲染
      setTimeout(function() {
        // 检查是否已经开始动画，防止重复触发
        if (animationStarted) {
          console.log('动画已经开始，跳过重复触发');
          return;
        }
        
        animationStarted = true;
        console.log('开始执行ink out动画');
        
        // 淡出预加载遮罩
        removePreloader();
        
        // 确保类的稳定状态，避免频闪
        requestAnimationFrame(function() {
          // 添加closing类开始反向动画
          transitionLayer.classList.add('closing');
          
          // 创建一个新的一次性事件监听器
          function onAnimationEnd(event) {
            // 确保是bg-layer的动画结束，而不是其他元素
            if (event.target !== transitionBackground) return;
            
            console.log('Ink out动画完成');
            
            // 移除监听器，防止多次触发
            transitionBackground.removeEventListener('animationend', onAnimationEnd);
            
            // 在下一帧再移除类，确保动画完全完成
            requestAnimationFrame(function() {
              transitionLayer.classList.remove('visible');
              transitionLayer.classList.remove('closing');
              
              // 重置transform需要延迟一帧，避免可见的跳跃
              requestAnimationFrame(function() {
                transitionBackground.style.transform = '';
              });
            });
          }
          
          // 确保只添加一次监听器
          transitionBackground.removeEventListener('animationend', onAnimationEnd);
          transitionBackground.addEventListener('animationend', onAnimationEnd, {once: true});
        });
      }, isGardenPage ? 1000 : 200); // Garden页面给更长时间
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