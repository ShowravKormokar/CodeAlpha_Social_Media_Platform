import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import { validateRequired } from '../utils/validation.js';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('auth-error');

const emailOrUsernameInput = document.getElementById('emailOrUsername');
const passwordInput = document.getElementById('password');
const submitButton = form.querySelector('.auth-submit');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  errorEl.classList.add('is-visible');
}

function hideError() {
  errorEl.textContent = '';
  errorEl.hidden = true;
  errorEl.classList.remove('is-visible');
}

function setLoading(loading) {
  submitButton.disabled = loading;
  form.setAttribute('aria-busy', String(loading));

  submitButton.classList.toggle('is-loading', loading);
}

function setFieldState(input, state) {
  const shell = input.closest('.auth-input-shell');

  if (!shell) {
    return;
  }

  shell.classList.remove('is-valid', 'is-invalid');

  if (state) {
    shell.classList.add(`is-${state}`);
  }
}

function setupPasswordToggle() {
  const toggle = document.querySelector(
    '[data-password-toggle="password"]'
  );

  if (!toggle) {
    return;
  }

  toggle.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';

    passwordInput.type = showing ? 'password' : 'text';

    toggle.setAttribute(
      'aria-pressed',
      String(!showing)
    );

    toggle.setAttribute(
      'aria-label',
      showing ? 'Show password' : 'Hide password'
    );

    const icon = toggle.querySelector('i');

    if (icon) {
      icon.className = showing
        ? 'ri-eye-line'
        : 'ri-eye-off-line';
    }

    passwordInput.focus({
      preventScroll: true
    });
  });
}

function setupInputListeners() {
  [emailOrUsernameInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => {
      hideError();
      setFieldState(input, null);
    });
  });
}

function validateForm() {
  const emailOrUsername = emailOrUsernameInput.value.trim();
  const password = passwordInput.value;

  setFieldState(emailOrUsernameInput, null);
  setFieldState(passwordInput, null);

  if (!validateRequired(emailOrUsername)) {
    setFieldState(emailOrUsernameInput, 'invalid');
    return 'Please enter your email or username.';
  }

  setFieldState(emailOrUsernameInput, 'valid');

  if (!validateRequired(password)) {
    setFieldState(passwordInput, 'invalid');
    return 'Please enter your password.';
  }

  setFieldState(passwordInput, 'valid');

  return null;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (form.getAttribute('aria-busy') === 'true') {
    return;
  }

  hideError();

  const validationError = validateForm();

  if (validationError) {
    showError(validationError);
    return;
  }

  const emailOrUsername = emailOrUsernameInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {
    const response = await auth.login({
      emailOrUsername,
      password
    });

    if (response.success) {
      showToast(
        'Welcome back!',
        'success'
      );

      window.location.href = '/frontend/feed.html';
      return;
    }

    // Check if email not verified
    if (response.error?.code === 'EMAIL_NOT_VERIFIED') {
      showError(response.error.message);
      window.location.href = '/frontend/verify-email.html';
      return;
    }

    showError(
      response.error?.message ||
      'Login failed. Please check your credentials.'
    );

    setLoading(false);

  } catch (error) {
    showError(
      error.message ||
      'An error occurred. Please try again.'
    );

    setLoading(false);
  }
}

function init() {
  setupPasswordToggle();
  setupInputListeners();

  form.addEventListener(
    'submit',
    handleSubmit
  );

  emailOrUsernameInput.focus({
    preventScroll: true
  });
}

init();