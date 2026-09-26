import { Navbar, renderNavbar } from './components/Navbar.js';
import { auth } from './state/auth.js';
import { showToast } from './utils/toast.js';

const publicPages = ['login.html', 'register.html'];
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isPublicPage = publicPages.includes(currentPage);

async function initApp() {
  const navbarContainer = document.getElementById('navbar');
  if (navbarContainer) {
    const authenticated = await auth.init();
    
    if (!authenticated && !isPublicPage && currentPage !== 'index.html') {
      window.location.href = '/login.html';
      return;
    }
    
    if (authenticated && (currentPage === 'login.html' || currentPage === 'register.html')) {
      window.location.href = '/feed.html';
      return;
    }
    
    renderNavbar(navbarContainer, {
      currentUser: auth.user,
      onLogout: async () => {
        await auth.logout();
        window.location.href = '/login.html';
      }
    });
  }
  
  auth.subscribe((user) => {
    const navbarContainer = document.getElementById('navbar');
    if (navbarContainer) {
      renderNavbar(navbarContainer, {
        currentUser: user,
        onLogout: async () => {
          await auth.logout();
          window.location.href = '/login.html';
        }
      });
    }
  });
}

function showToast(message, type = 'info') {
  const container = getOrCreateToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function getOrCreateToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

document.addEventListener('DOMContentLoaded', initApp);

export { showToast };