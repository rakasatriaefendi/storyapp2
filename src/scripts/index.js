import '../styles/styles.css';
import Shell from './pages/app';

document.addEventListener('DOMContentLoaded', () => {
  const contentEl = document.querySelector('#main-content');
  const toggleBtn = document.querySelector('.drawer-button');
  const navPane = document.querySelector('.navigation-drawer');
  const loginLink = document.getElementById('login-link');

  const shell = new Shell({
    content: contentEl,
    toggleBtn,
    navPane,
  });

  const getToken = () => localStorage.getItem('bt_token');

  const enforceAuthRedirect = () => {
    const token = getToken();
    const hash = window.location.hash;

    if (!token) {
      if (hash === '' || hash === '#/' || hash === '#/home') {
        window.location.hash = '#/login';
      }
    } else {
      if (hash === '#/login' || hash === '#/register') {
        window.location.hash = '#/';
      }
    }
  };

  const setupLoginLink = () => {
    const token = getToken();

    if (token) {
      loginLink.textContent = 'Keluar';
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('bt_token');
        localStorage.removeItem('bt_user');
        alert('Sukses keluar');
        window.location.hash = '#/login';
        window.location.reload();
      });
    } else {
      loginLink.textContent = 'Masuk';
      loginLink.href = '#/login';
    }
  };

  const handleRouteChange = async () => {
    if (!document.startViewTransition) {
      await shell.renderPage();
      return;
    }

    document.startViewTransition(async () => {
      await shell.renderPage();
    });
  };

  enforceAuthRedirect();
  setupLoginLink();

  (async () => {
    await shell.renderPage();
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('load', handleRouteChange);
  })();

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
});