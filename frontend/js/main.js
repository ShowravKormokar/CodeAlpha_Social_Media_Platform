import {
  renderNavbar
} from './components/Navbar.js';

import {
  auth
} from './state/auth.js';
import { appUrl } from './utils/routes.js';


/* =========================================================
   PUBLIC PAGES
   ========================================================= */

const publicPages = [
  'login.html',
  'register.html',
  'verify-email.html',
  'forgot-password.html',
  'reset-password.html'
];


const pathParts = window.location.pathname.split('/').filter(Boolean);
const currentPage = pathParts[pathParts.length - 1] || 'index.html';

const isPublicPage = publicPages.includes(currentPage);

window.addEventListener('auth:expired', () => {
  if (!isPublicPage && currentPage !== 'index.html') {
    window.location.href = appUrl('login.html');
  }
});


/* =========================================================
   APP INITIALIZATION
   ========================================================= */

async function initApp() {

  const navbarContainer =
    document.getElementById(
      'navbar'
    );


  if (!navbarContainer) {
    return;
  }


  const authenticated =
    await auth.init();


  /* =======================================================
     AUTH GUARD
     ======================================================= */

  if (
    !authenticated &&
    !isPublicPage &&
    currentPage !== 'index.html'
  ) {

    window.location.href = appUrl('login.html');

    return;
  }


  /* =======================================================
     AUTHENTICATED USER ON AUTH PAGE
     ======================================================= */

  if (
    authenticated &&
    (
      currentPage === 'login.html' ||
      currentPage === 'register.html' ||
      currentPage === 'verify-email.html' ||
      currentPage === 'forgot-password.html' ||
      currentPage === 'reset-password.html'
    )
  ) {

    window.location.href = appUrl('feed.html');

    return;
  }


  /* =======================================================
     NAVBAR
     ======================================================= */

  renderNavbar(
    navbarContainer,
    {
      currentUser: auth.user,

      onLogout: async () => {

        await auth.logout();

        window.location.href = appUrl('login.html');
      }
    }
  );


  /* =======================================================
     AUTH STATE SUBSCRIPTION
     ======================================================= */

  auth.subscribe(
    (user) => {

      const container =
        document.getElementById(
          'navbar'
        );


      if (!container) {
        return;
      }


      renderNavbar(
        container,
        {
          currentUser: user,

          onLogout: async () => {

            await auth.logout();

            window.location.href = appUrl('login.html');
          }
        }
      );
    }
  );
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = 'info'
) {

  const container =
    getOrCreateToastContainer();

  const toast =
    document.createElement(
      'div'
    );

  const toastType =
    ['success', 'error', 'info'].includes(type)
      ? type
      : 'info';

  toast.className = `toast toast-${toastType}`;
  toast.setAttribute(
    'role',
    toastType === 'error' ? 'alert' : 'status'
  );

  const icon =
    document.createElement('i');
  icon.className = {
    success: 'ri-checkbox-circle-line',
    error: 'ri-error-warning-line',
    info: 'ri-information-line'
  }[toastType];
  icon.setAttribute('aria-hidden', 'true');

  const text =
    document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;

  const closeButton =
    document.createElement('button');
  closeButton.className = 'toast-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Dismiss notification');
  closeButton.innerHTML = '<i class="ri-close-line" aria-hidden="true"></i>';

  toast.append(icon, text, closeButton);
  container.appendChild(toast);

  let removeTimer;
  const dismiss = () => {
    if (!toast.isConnected || toast.classList.contains('is-dismissing')) {
      return;
    }

    window.clearTimeout(removeTimer);
    toast.classList.add('is-dismissing');
    window.setTimeout(() => toast.remove(), 220);
  };

  closeButton.addEventListener('click', dismiss);
  removeTimer = window.setTimeout(dismiss, 5000);
}


/* =========================================================
   TOAST CONTAINER
   ========================================================= */

function getOrCreateToastContainer() {

  let container =
    document.querySelector(
      '.toast-container'
    );


  if (!container) {

    container =
      document.createElement(
        'div'
      );

    container.className =
      'toast-container';
    container.setAttribute('aria-label', 'Notifications');


    document.body.appendChild(
      container
    );
  }


  return container;
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  initApp
);


export {
  showToast
};