import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import { validatePassword, validateRequired, validateMatch } from '../utils/validation.js';

const form = document.getElementById('reset-form');
const errorEl = document.getElementById('auth-error');
const successEl = document.getElementById('auth-success');
const tokenInput = document.getElementById('token');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const submitButton = form.querySelector('.auth-submit');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  errorEl.classList.add('is-visible');
  successEl.hidden = true;
}

function showSuccess(message) {
  successEl.textContent = message;
  successEl.hidden = false;
  errorEl.hidden = true;
  errorEl.classList.remove('is-visible');
}

function hideMessages() {
  errorEl.textContent = '';
  errorEl.hidden = true;
  errorEl.classList.remove('is-visible');
  successEl.textContent = '';
  successEl.hidden = true;
}

function setLoading(loading) {
  submitButton.disabled = loading;
  form.setAttribute('aria-busy', String(loading));
  submitButton.classList.toggle('is-loading', loading);
}

function setFieldState(input, state) {
  const shell = input.closest('.auth-input-shell');
  if (!shell) return;
  shell.classList.remove('is-valid', 'is-invalid');
  if (state) shell.classList.add(`is-${state}`);
}

function setupPasswordToggles() {
  const toggles = document.querySelectorAll('[data-password-toggle]');
  toggles.forEach((toggle) => {
    const inputId = toggle.dataset.passwordToggle;
    const input = document.getElementById(inputId);
    if (!input) return;

    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!showing));
      const passwordName = inputId === 'newPassword' ? 'password' : 'confirmation password';
      toggle.setAttribute('aria-label', showing ? `Show ${passwordName}` : `Hide ${passwordName}`);
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.className = showing ? 'ri-eye-line' : 'ri-eye-off-line';
      }
      input.focus({ preventScroll: true });
    });
  });
}

function setupInputListeners() {
  [newPasswordInput, confirmNewPasswordInput].forEach((input) => {
    input.addEventListener('input', () => {
      hideMessages();
      setFieldState(input, null);
    });
  });
}

function validateForm() {
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  [newPasswordInput, confirmNewPasswordInput].forEach((input) => {
    setFieldState(input, null);
  });

  if (!validatePassword(newPassword)) {
    setFieldState(newPasswordInput, 'invalid');
    return 'Password must be at least 8 characters.';
  }

  setFieldState(newPasswordInput, 'valid');

  if (!validateMatch(newPassword, confirmNewPassword)) {
    setFieldState(confirmNewPasswordInput, 'invalid');
    return 'Passwords do not match.';
  }

  setFieldState(confirmNewPasswordInput, 'valid');
  return null;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (form.getAttribute('aria-busy') === 'true') return;

  hideMessages();

  const validationError = validateForm();
  if (validationError) {
    showError(validationError);
    return;
  }

  const token = tokenInput.value;
  const newPassword = newPasswordInput.value;

  if (!validateRequired(token)) {
    showError('Invalid reset link. Please request a new one.');
    return;
  }

  setLoading(true);

  try {
    const response = await auth.resetPassword(token, newPassword);

    if (response.success) {
      showSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/frontend/login.html';
      }, 1500);
      return;
    }

    showError(response.error?.message || 'Failed to reset password. Please try again.');
    setLoading(false);

  } catch (error) {
    showError(error.message || 'An error occurred. Please try again.');
    setLoading(false);
  }
}

// Extract token from URL query string
function getTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

function init() {
  const token = getTokenFromURL();
  if (token) {
    tokenInput.value = token;
  } else {
    showError('Invalid reset link. Please request a new one from the forgot password page.');
    submitButton.disabled = true;
  }

  setupPasswordToggles();
  setupInputListeners();
  form.addEventListener('submit', handleSubmit);
  newPasswordInput.focus({ preventScroll: true });
}

init();