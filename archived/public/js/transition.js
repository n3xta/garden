(function() {
  document.documentElement.classList.add('loading');
  document.body && document.body.classList.add('loading');
  
  function createAndInsertPreloader() {
    if (!document.querySelector('.page-preloader')) {
      var preloader = document.createElement('div');
      preloader.className = 'page-preloader';
      
      var loadingText = document.createElement('div');
      loadingText.className = 'loading-text';
      loadingText.textContent = 'loading...';
      preloader.appendChild(loadingText);
      
      if (document.body.firstChild) {
        document.body.insertBefore(preloader, document.body.firstChild);
      } else {
        document.body.appendChild(preloader);
      }
      
      preloader.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
      
      document.body.classList.add('js-loading-ready');
      document.body.classList.remove('loading');
    }
  }

  if (document.body) {
    createAndInsertPreloader();
  } else {
    document.addEventListener('DOMContentLoaded', createAndInsertPreloader);
    
    setTimeout(function() {
      if (document.body && !document.querySelector('.page-preloader')) {
        createAndInsertPreloader();
      }
    }, 0);
  }
})();

document.addEventListener('DOMContentLoaded', function() {
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
                    
  var preloader = document.querySelector('.page-preloader');
  
  var transitionLayer = document.querySelector('.cd-transition-layer');
  var transitionBackground = document.querySelector('.cd-transition-layer .bg-layer');
  var body = document.body;
  
  console.log('Transition layer found:', transitionLayer !== null);
  console.log('Transition background found:', transitionBackground !== null);
  console.log('Preloader found:', preloader !== null);
  
  var frameProportion = 1.78;
  var frames = 25;
  var resize = false;
  
  var pageIsEntering = sessionStorage.getItem('pageIsEntering');
  console.log('SessionStorage pageIsEntering值:', pageIsEntering);
  
  if (isAuthPage) {
    console.log('认证页面 - 不使用ink效果');
    removePreloader();
    return;
  }
  
  if (isGardenPage || isIndexPage) {
    console.log((isGardenPage ? 'Garden' : 'Index') + '页面 - 强制启用Ink Out效果');
    initInkOutAnimation(true);
    
    if (isIndexPage) {
      preloadAuthResources();
    }
  } else if (pageIsEntering === 'true') {
    body.classList.add('has-ink-transition');
    initInkOutAnimation();
    sessionStorage.removeItem('pageIsEntering');
  } else {
    removePreloader();
  }
  
  if (transitionLayer && transitionBackground) {
    setLayerDimensions();
    
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
    removePreloader();
  }
  
  function removePreloader() {
    if (preloader) {
      preloader.classList.add('fade-out');
      setTimeout(function() {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 300);
    }
  }
  
  function preloadAuthResources() {
    console.log('预加载登录/注册页面资源');
    
    var imagesToPreload = [
      '/img/login_form.webp',
      '/img/save.webp',
      '/img/letter.webp',
      '/img/login.webp',
      '/img/signup.webp',
      '/img/wood.jpg'
    ];
    
    imagesToPreload.forEach(function(src) {
      var img = new Image();
      img.src = src;
    });
    
    if (typeof AudioEffects !== 'undefined') {
      AudioEffects.preload(['/samples/ui/click.wav']);
    } else {
      var audio = new Audio();
      audio.preload = 'auto';
      audio.src = '/samples/ui/click.wav';
    }
    
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
  
  function startTransition(url) {
    console.log('Starting transition to:', url);
    if (!transitionLayer || !transitionBackground) {
      console.error('Cannot start transition - elements not found');
      window.location.href = url;
      return;
    }
    
    if (url.includes('/login') || url.includes('/register')) {
      console.log('跳转到认证页面 - 不使用ink效果');
      window.location.href = url;
      return;
    }
    
    transitionLayer.classList.remove('closing');
    
    if (url.includes('/explore')) {
      if (typeof AudioEffects !== 'undefined') {
        AudioEffects.play('/samples/ui/explore.wav');
      } else {
        const exploreSound = new Audio('/samples/ui/explore.wav');
        exploreSound.play().catch(err => console.warn('音效播放失败:', err));
      }
    } else if (url.includes('/garden') || url.includes('/mygarden') || url.includes('/view')) {
      if (typeof AudioEffects !== 'undefined') {
        AudioEffects.play('/samples/ui/garden.wav');
      } else {
        const gardenSound = new Audio('/samples/ui/garden.wav');
        gardenSound.play().catch(err => console.warn('音效播放失败:', err));
      }
    }
    
    sessionStorage.setItem('pageIsEntering', 'true');
    
    requestAnimationFrame(function() {
      transitionLayer.classList.add('visible');
      
      requestAnimationFrame(function() {
        transitionLayer.classList.add('opening');
        console.log('Added visible and opening classes');
        
        function onAnimationEnd(event) {
          if (event.target !== transitionBackground) return;
          
          console.log('Animation ended, navigating to:', url);
          
          transitionBackground.removeEventListener('animationend', onAnimationEnd);
          
          window.location.href = url;
        }
        
        transitionBackground.removeEventListener('animationend', onAnimationEnd);
        transitionBackground.addEventListener('animationend', onAnimationEnd, {once: true});
      });
    });
  }
  
  function initInkOutAnimation(forceAnimation) {
    console.log('初始化Ink Out动画, 强制执行:', forceAnimation);
    
    if (!transitionLayer || !transitionBackground) {
      console.error('Cannot init ink out animation - elements not found');
      body.classList.remove('has-ink-transition');
      body.classList.add('ink-transition-complete');
      removePreloader();
      return;
    }
    
    transitionLayer.classList.remove('closing');
    var oldEndListener = transitionBackground.onanimationend;
    if (oldEndListener) {
      transitionBackground.removeEventListener('animationend', oldEndListener);
    }
    
    transitionLayer.classList.add('visible');
    transitionBackground.style.transform = 'translateY(-50%) translateX(-98%)';
    console.log('已设置墨水层初始状态为覆盖');
    
    var pageReady = new Promise(function(resolve) {
      if (isGardenPage && forceAnimation) {
        console.log('Garden页面 - 使用额外延迟等待3D内容加载');
        setTimeout(resolve, 4000);
      } else if (isIndexPage && forceAnimation) {
        console.log('首页 - 使用延迟等待资源加载');
        setTimeout(resolve, 2500);
      } else if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
    
    var animationStarted = false;
    
    pageReady.then(function() {
      console.log('页面内容准备就绪，开始准备动画');
      body.classList.remove('has-ink-transition');
      body.classList.add('ink-transition-complete');
      
      setTimeout(function() {
        if (animationStarted) {
          console.log('动画已经开始，跳过重复触发');
          return;
        }
        
        animationStarted = true;
        console.log('开始执行ink out动画');
        
        removePreloader();
        
        requestAnimationFrame(function() {
          transitionLayer.classList.add('closing');
          
          function onAnimationEnd(event) {
            if (event.target !== transitionBackground) return;
            
            console.log('Ink out动画完成');
            
            transitionBackground.removeEventListener('animationend', onAnimationEnd);
            
            requestAnimationFrame(function() {
              transitionLayer.classList.remove('visible');
              transitionLayer.classList.remove('closing');
              
              requestAnimationFrame(function() {
                transitionBackground.style.transform = '';
              });
            });
          }
          
          transitionBackground.removeEventListener('animationend', onAnimationEnd);
          transitionBackground.addEventListener('animationend', onAnimationEnd, {once: true});
        });
      }, isGardenPage ? 1000 : 200);
    });
  }
  
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