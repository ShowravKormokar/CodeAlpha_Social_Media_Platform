export function $(selector, context = document) {
  return context.querySelector(selector);
}

export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });

  const childNodes = Array.isArray(children) ? children.flat(Infinity) : [children];

  childNodes.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  return element;
}

export function render(element, container) {
  if (typeof container === 'string') {
    container = $(container);
  }
  container.innerHTML = '';
  container.appendChild(element);
}

export function show(element) {
  element.hidden = false;
  element.style.display = '';
}

export function hide(element) {
  element.hidden = true;
}

export function toggle(element, force) {
  if (force !== undefined) {
    element.hidden = !force;
  } else {
    element.hidden = !element.hidden;
  }
}

export function addClass(element, ...classes) {
  element.classList.add(...classes);
}

export function removeClass(element, ...classes) {
  element.classList.remove(...classes);
}

export function toggleClass(element, className, force) {
  element.classList.toggle(className, force);
}

export function hasClass(element, className) {
  return element.classList.contains(className);
}