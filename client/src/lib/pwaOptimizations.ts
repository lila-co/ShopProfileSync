
// PWA-specific optimizations for mobile app experience
export class PWAOptimizer {
  // Enhanced mobile gestures and interactions
  static setupMobileGestures() {
    // Swipe gestures for navigation
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // Horizontal swipe detection
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right - go back
          window.history.back();
        } else {
          // Swipe left - could trigger context menu
          document.dispatchEvent(new CustomEvent('swipe-left'));
        }
      }
    });
  }

  // Native app-like loading states
  static setupAppLoading() {
    // Show loading screen immediately
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'app-loading';
    loadingScreen.innerHTML = `
      <div style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100vw; 
        height: 100vh; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex; 
        flex-direction: column;
        align-items: center; 
        justify-content: center;
        z-index: 9999;
        color: white;
        font-family: system-ui;
      ">
        <div style="
          width: 60px; 
          height: 60px; 
          border: 3px solid rgba(255,255,255,0.3); 
          border-top: 3px solid white; 
          border-radius: 50%; 
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        "></div>
        <h2 style="margin: 0; font-weight: 300;">SmartCart</h2>
        <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 14px;">Loading your shopping experience...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(loadingScreen);
    
    // Remove loading screen when app is ready
    window.addEventListener('load', () => {
      setTimeout(() => {
        loadingScreen.remove();
      }, 1000);
    });
  }

  // Install prompt for PWA
  static setupPWAInstall() {
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install button
      const installBanner = document.createElement('div');
      installBanner.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1000;
          animation: slideUp 0.3s ease;
        ">
          <div>
            <strong>Install SmartCart</strong>
            <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">Get the full app experience</p>
          </div>
          <button id="install-btn" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
          ">Install</button>
          <button id="dismiss-btn" style="
            background: none;
            border: none;
            color: #999;
            padding: 8px;
            margin-left: 8px;
          ">×</button>
        </div>
        <style>
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        </style>
      `;
      
      document.body.appendChild(installBanner);
      
      document.getElementById('install-btn')?.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted PWA install');
          }
          installBanner.remove();
          deferredPrompt = null;
        });
      });
      
      document.getElementById('dismiss-btn')?.addEventListener('click', () => {
        installBanner.remove();
      });
    });
  }

  // Background sync for offline functionality
  static setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Register background sync
        return registration.sync.register('background-sync');
      }).catch((error) => {
        console.log('SW registration failed: ', error);
      });
    }
  }

  // Push notifications setup
  static async setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'your-vapid-public-key' // Replace with actual VAPID key
        });
        
        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      }
    }
  }

  // Initialize all PWA optimizations
  static init() {
    this.setupAppLoading();
    this.setupMobileGestures();
    this.setupPWAInstall();
    this.setupBackgroundSync();
    this.setupPushNotifications();
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PWAOptimizer.init());
} else {
  PWAOptimizer.init();
}
