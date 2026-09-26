import { createElement } from '../utils/dom.js';
import { formatRelativeTime } from '../utils/format.js';

export function Navbar({ currentUser, onLogout }) {
  const nav = createElement('nav', { class: 'navbar', role: 'navigation', 'aria-label': 'Main navigation' });

  const brand = createElement('a', { class: 'navbar-brand', href: '/feed.html' }, 'SocialApp');

  const navLinks = createElement('div', { class: 'navbar-nav' });
  
  const homeLink = createElement('a', { class: 'nav-link', href: '/feed.html', title: 'Home' }, '🏠');
  const notificationsLink = createElement('a', { class: 'nav-link', href: '#', title: 'Notifications' }, '🔔');
  
  navLinks.append(homeLink, notificationsLink);

  const userMenu = createElement('div', { class: 'navbar-user' });
  
  if (currentUser) {
    const userTrigger = createElement('button', { class: 'user-menu-trigger', 'aria-expanded': 'false', 'aria-haspopup': 'true' });
    userTrigger.innerHTML = `
      <span class="avatar avatar-sm">${currentUser.name?.[0] || currentUser.username?.[0] || 'U'}</span>
      <span>${currentUser.name || currentUser.username}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    
    const dropdown = createElement('div', { class: 'user-menu-dropdown', role: 'menu' });
    dropdown.innerHTML = `
      <a href="/profile.html" class="user-menu-item" role="menuitem">Profile</a>
      <a href="/settings.html" class="user-menu-item" role="menuitem">Settings</a>
      <div class="user-menu-divider"></div>
      <button class="user-menu-item" id="logout-btn" role="menuitem">Logout</button>
    `;
    
    const menuContainer = createElement('div', { class: 'user-menu' });
    menuContainer.append(userTrigger, dropdown);
    
    userTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menuContainer.classList.toggle('open');
      userTrigger.setAttribute('aria-expanded', menuContainer.classList.contains('open'));
    });
    
    dropdown.querySelector('#logout-btn').addEventListener('click', () => {
      onLogout?.();
    });
    
    document.addEventListener('click', () => {
      menuContainer.classList.remove('open');
      userTrigger.setAttribute('aria-expanded', 'false');
    });
    
    userMenu.append(menuContainer);
  } else {
    const loginLink = createElement('a', { class: 'btn btn-ghost', href: '/login.html' }, 'Sign In');
    const registerLink = createElement('a', { class: 'btn btn-primary', href: '/register.html' }, 'Sign Up');
    userMenu.append(loginLink, registerLink);
  }

  nav.append(brand, navLinks, userMenu);
  return nav;
}

export function renderNavbar(container, props) {
  const navbar = Navbar(props);
  if (typeof container === 'string') container = document.querySelector(container);
  container.innerHTML = '';
  container.appendChild(navbar);
}