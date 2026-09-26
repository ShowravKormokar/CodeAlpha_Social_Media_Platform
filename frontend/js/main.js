import {
  renderNavbar
} from './components/Navbar.js';

import {
  auth
} from './state/auth.js';


/* =========================================================
   PUBLIC PAGES
   ========================================================= */

const publicPages = [
  'login.html',
  'register.html'
];


const currentPage =
  window.location.pathname
    .split('/')
    .pop() ||
  'index.html';


const isPublicPage =
  publicPages.includes(
    currentPage
  );


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

    window.location.href =
      '/login.html';

    return;
  }


  /* =======================================================
     AUTHENTICATED USER ON AUTH PAGE
     ======================================================= */

  if (
    authenticated &&
    (
      currentPage === 'login.html' ||
      currentPage === 'register.html'
    )
  ) {

    window.location.href =
      '/feed.html';

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

        window.location.href =
          '/login.html';
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

            window.location.href =
              '/login.html';
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


  toast.className =
    `toast ${type}`;


  toast.innerHTML = `
    <span>${message}</span>

    <button
      class="toast-close"
      type="button"
      aria-label="Dismiss"
    >
      <i
        class="ri-close-line"
        aria-hidden="true"
      ></i>
    </button>
  `;


  const closeButton =
    toast.querySelector(
      '.toast-close'
    );


  closeButton.addEventListener(
    'click',
    () => {
      toast.remove();
    }
  );


  container.appendChild(
    toast
  );


  window.setTimeout(
    () => {

      if (!toast.isConnected) {
        return;
      }


      toast.style.animation =
        'slideOut 0.3s ease forwards';


      window.setTimeout(
        () => {
          toast.remove();
        },
        300
      );

    },
    5000
  );
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