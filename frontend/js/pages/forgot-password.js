import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import { validateEmail, validateRequired } from '../utils/validation.js';

const form = document.getElementById('forgot-form');
const errorEl = document.getElementById('auth-error');
const successEl = document.getElementById('auth-success');
const emailInput = document.getElementById('email');
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

function setupInputListeners() {
  emailInput.addEventListener('input', () => {
    hideMessages();
    setFieldState(emailInput, null);
  });
}

function validateForm() {
  const email = emailInput.value.trim();
  setFieldState(emailInput, null);

  if (!validateRequired(email)) {
    setFieldState(emailInput, 'invalid');
    return 'Please enter your email address.';
  }

  if (!validateEmail(email)) {
    setFieldState(emailInput, 'invalid');
    return 'Please enter a valid email address.';
  }

  setFieldState(emailInput, 'valid');
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

  const email = emailInput.value.trim();
  setLoading(true);

  try {
    const response = await auth.forgotPassword(email);

    if (response.success) {
      // Always show success for security (don't reveal if email exists)
      showSuccess('If the email exists, a password reset link has been sent.');
      form.reset();
      setLoading(false);
      return;
    }

    showError(response.error?.message || 'Failed to send reset link. Please try again.');
    setLoading(false);

  } catch (error) {
    showError(error.message || 'An error occurred. Please try again.');
    setLoading(false);
  }
}

function init() {
  setupInputListeners();
  form.addEventListener('submit', handleSubmit);
  emailInput.focus({ preventScroll: true });
}

init();