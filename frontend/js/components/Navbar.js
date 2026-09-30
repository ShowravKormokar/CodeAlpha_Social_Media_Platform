import { createElement } from '../utils/dom.js';
import { appUrl } from '../utils/routes.js';
import { getUserAvatarMarkup } from '../utils/media.js';


export function Navbar({
  currentUser,
  onLogout
}) {
  const currentPage = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';

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
      href: appUrl('feed.html'),
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


  const navigationItems = [
    { label: 'Home', icon: 'ri-home-5-line', page: 'feed.html', href: appUrl('feed.html') },
    { label: 'Search', icon: 'ri-search-line', page: 'search.html', href: appUrl('search.html') },
    { label: 'Create', icon: 'ri-add-circle-line', page: null, href: `${appUrl('feed.html')}#create-post`, prominent: true },
  ];

  navigationItems.forEach(({ label, icon, page, href, prominent }) => {
    const link = createElement('a', {
      class: `nav-link${prominent ? ' nav-link-create' : ''}`,
      href,
      title: label,
      'aria-label': label,
      ...(page === currentPage ? { 'aria-current': 'page' } : {})
    });

    link.innerHTML = `
      <i class="${icon}" aria-hidden="true"></i>
      <span>${label}</span>
    `;

    navLinks.append(link);
  });


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
      currentUser.profile?.displayName ||
      currentUser.name ||
      currentUser.username ||
      'User';

    const avatar = getUserAvatarMarkup(currentUser);


    userTrigger.innerHTML = `
      <span class="avatar avatar-sm">
        ${avatar}
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
        href="${appUrl('profile.html')}"
        class="user-menu-item"
        role="menuitem"
      >
        <i class="ri-user-3-line" aria-hidden="true"></i>
        <span>Profile</span>
      </a>

      <a
        href="${appUrl('settings.html')}"
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

    menuContainer.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menuContainer.classList.remove('open');
        userTrigger.setAttribute('aria-expanded', 'false');
        userTrigger.focus();
      }
    });


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
        href: appUrl('login.html')
      },
      'Sign In'
    );


    const registerLink = createElement(
      'a',
      {
        class: 'btn btn-primary btn-sm',
        href: appUrl('register.html')
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

  nav.append(brand, navLinks, userMenu);


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