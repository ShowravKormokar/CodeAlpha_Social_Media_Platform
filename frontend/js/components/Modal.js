import { createElement } from '../utils/dom.js';

export function Modal({ title, children, onClose, showClose = true, footer }) {
  const overlay = createElement('div', { class: 'modal-overlay' });
  
  const modal = createElement('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' });
  
  const header = createElement('div', { class: 'modal-header' });
  const titleEl = createElement('h2', { class: 'modal-title', id: 'modal-title' }, title);
  header.appendChild(titleEl);
  
  if (showClose) {
    const closeBtn = createElement('button', { class: 'modal-close', 'aria-label': 'Close modal' }, '×');
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => onClose?.(), 200);
    });
    header.appendChild(closeBtn);
  }
  
  const body = createElement('div', { class: 'modal-body' });
  if (typeof children === 'string') {
    body.innerHTML = children;
  } else if (children instanceof Node) {
    body.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(c => body.appendChild(c));
  }
  
  modal.append(header, body);
  
  if (footer) {
    const footerEl = createElement('div', { class: 'modal-footer' });
    if (typeof footer === 'string') {
      footerEl.innerHTML = footer;
    } else if (footer instanceof Node) {
      footerEl.appendChild(footer);
    } else if (Array.isArray(footer)) {
      footer.forEach(c => footerEl.appendChild(c));
    }
    modal.appendChild(footerEl);
  }
  
  overlay.appendChild(modal);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      setTimeout(() => onClose?.(), 200);
    }
  });
  
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      overlay.classList.remove('open');
      setTimeout(() => onClose?.(), 200);
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  
  requestAnimationFrame(() => {
    overlay.classList.add('open');
  });
  
  return {
    element: overlay,
    close: () => {
      overlay.classList.remove('open');
      setTimeout(() => {
        overlay.remove();
        onClose?.();
      }, 200);
      document.removeEventListener('keydown', handleKeydown);
    }
  };
}

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) {
  const footer = createElement('div', { class: 'modal-footer' });
  
  const cancelBtn = createElement('button', { class: 'btn btn-secondary' }, cancelText);
  cancelBtn.addEventListener('click', () => onCancel?.());
  
  const confirmBtn = createElement('button', { class: `btn btn-${variant}` }, confirmText);
  confirmBtn.addEventListener('click', () => onConfirm?.());
  
  footer.append(cancelBtn, confirmBtn);
  
  return Modal({ title, children: message, footer });
}