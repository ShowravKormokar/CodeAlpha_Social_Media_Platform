import { createElement } from '../utils/dom.js';


export function Navbar({
  currentUser,
  onLogout
}) {

  const nav = createElement(
    'nav',
    {
      class: 'navbar',
      role: 'navigation',
      'aria-label': 'Main navigation'
    }
  );


  /* =========================================================
     BRAND
     ========================================================= */

  const brand = createElement(
    'a',
    {
      class: 'navbar-brand',
      href: '/feed.html',
      'aria-label': 'SocialApp home'
    }
  );

  brand.innerHTML = `
    <span class="brand-mark" aria-hidden="true">
      <i class="ri-chat-3-fill"></i>
    </span>

    <span>SocialApp</span>
  `;


  /* =========================================================
     NAV LINKS
     ========================================================= */

  const navLinks = createElement(
    'div',
    {
      class: 'navbar-nav'
    }
  );


  const homeLink = createElement(
    'a',
    {
      class: 'nav-link',
      href: '/feed.html',
      title: 'Home',
      'aria-label': 'Home',
      'aria-current': 'page'
    }
  );

  homeLink.innerHTML = `
    <i
      class="ri-home-5-line"
      aria-hidden="true"
    ></i>

    <span>Home</span>
  `;


  const notificationsLink = createElement(
    'a',
    {
      class: 'nav-link',
      href: '/notifications.html',
      title: 'Notifications',
      'aria-label': 'Notifications'
    }
  );

  notificationsLink.innerHTML = `
    <i
      class="ri-notification-3-line"
      aria-hidden="true"
    ></i>

    <span>Notifications</span>
  `;


  navLinks.append(
    homeLink,
    notificationsLink
  );


  /* =========================================================
     USER AREA
     ========================================================= */

  const userMenu = createElement(
    'div',
    {
      class: 'navbar-user'
    }
  );


  if (currentUser) {

    const menuContainer = createElement(
      'div',
      {
        class: 'user-menu'
      }
    );


    const userTrigger = createElement(
      'button',
      {
        class: 'user-menu-trigger',
        type: 'button',
        'aria-expanded': 'false',
        'aria-haspopup': 'true',
        'aria-label': 'Open account menu'
      }
    );


    const displayName =
      currentUser.name ||
      currentUser.username ||
      'User';


    const initial =
      displayName
        .charAt(0)
        .toUpperCase();


    userTrigger.innerHTML = `
      <span class="avatar avatar-sm">
        ${initial}
      </span>

      <span>
        ${displayName}
      </span>

      <i
        class="ri-arrow-down-s-line"
        aria-hidden="true"
      ></i>
    `;


    /* =======================================================
       DROPDOWN
       ======================================================= */

    const dropdown = createElement(
      'div',
      {
        class: 'user-menu-dropdown',
        role: 'menu'
      }
    );


    dropdown.innerHTML = `
      <a
        href="/profile.html"
        class="user-menu-item"
        role="menuitem"
      >
        <i
          class="ri-user-3-line"
          aria-hidden="true"
        ></i>

        <span>Profile</span>
      </a>

      <a
        href="/settings.html"
        class="user-menu-item"
        role="menuitem"
      >
        <i
          class="ri-settings-3-line"
          aria-hidden="true"
        ></i>

        <span>Settings</span>
      </a>

      <div
        class="user-menu-divider"
        aria-hidden="true"
      ></div>

      <button
        class="user-menu-item"
        id="logout-btn"
        type="button"
        role="menuitem"
      >
        <i
          class="ri-logout-box-r-line"
          aria-hidden="true"
        ></i>

        <span>Logout</span>
      </button>
    `;


    menuContainer.append(
      userTrigger,
      dropdown
    );


    /* =======================================================
       TOGGLE
       ======================================================= */

    userTrigger.addEventListener(
      'click',
      (event) => {

        event.stopPropagation();

        const isOpen =
          menuContainer.classList.toggle(
            'open'
          );

        userTrigger.setAttribute(
          'aria-expanded',
          String(isOpen)
        );
      }
    );


    /* =======================================================
       LOGOUT
       ======================================================= */

    const logoutButton =
      dropdown.querySelector(
        '#logout-btn'
      );


    logoutButton?.addEventListener(
      'click',
      async () => {

        menuContainer.classList.remove(
          'open'
        );

        userTrigger.setAttribute(
          'aria-expanded',
          'false'
        );

        await onLogout?.();
      }
    );


    /* =======================================================
       OUTSIDE CLICK
       ======================================================= */

    const handleOutsideClick =
      (event) => {

        if (
          !menuContainer.contains(
            event.target
          )
        ) {

          menuContainer.classList.remove(
            'open'
          );

          userTrigger.setAttribute(
            'aria-expanded',
            'false'
          );
        }
      };


    document.addEventListener(
      'click',
      handleOutsideClick
    );


    userMenu.append(
      menuContainer
    );

  } else {

    const loginLink = createElement(
      'a',
      {
        class: 'btn btn-ghost btn-sm',
        href: '/login.html'
      },
      'Sign In'
    );


    const registerLink = createElement(
      'a',
      {
        class: 'btn btn-primary btn-sm',
        href: '/register.html'
      },
      'Sign Up'
    );


    userMenu.append(
      loginLink,
      registerLink
    );
  }


  /* =========================================================
     FINAL NAV
     ========================================================= */

  nav.append(
    brand,
    navLinks,
    userMenu
  );


  return nav;
}


export function renderNavbar(
  container,
  props
) {

  if (typeof container === 'string') {
    container =
      document.querySelector(container);
  }


  if (!container) {
    return;
  }


  const navbar =
    Navbar(props);


  container.replaceChildren(
    navbar
  );
}