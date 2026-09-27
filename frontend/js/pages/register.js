import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateRequired,
  validateMatch
} from '../utils/validation.js';

const form = document.getElementById('register-form');
const errorEl = document.getElementById('auth-error');

const nameInput = document.getElementById('name');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

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

  shell.classList.remove(
    'is-valid',
    'is-invalid'
  );

  if (state) {
    shell.classList.add(`is-${state}`);
  }
}

function setupPasswordToggles() {
  const toggles = document.querySelectorAll(
    '[data-password-toggle]'
  );

  toggles.forEach((toggle) => {
    const inputId = toggle.dataset.passwordToggle;
    const input = document.getElementById(inputId);

    if (!input) {
      return;
    }

    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';

      input.type = showing ? 'password' : 'text';

      toggle.setAttribute(
        'aria-pressed',
        String(!showing)
      );

      const passwordName = inputId === 'password'
        ? 'password'
        : 'confirmation password';

      toggle.setAttribute(
        'aria-label',
        showing
          ? `Show ${passwordName}`
          : `Hide ${passwordName}`
      );

      const icon = toggle.querySelector('i');

      if (icon) {
        icon.className = showing
          ? 'ri-eye-line'
          : 'ri-eye-off-line';
      }

      input.focus({
        preventScroll: true
      });
    });
  });
}

function setupInputListeners() {
  const inputs = [
    nameInput,
    usernameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput
  ];

  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      hideError();
      setFieldState(input, null);
    });
  });
}

function validateForm() {
  const name = nameInput.value.trim();
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  [
    nameInput,
    usernameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput
  ].forEach((input) => {
    setFieldState(input, null);
  });

  if (!validateRequired(name)) {
    setFieldState(nameInput, 'invalid');

    return 'Please enter your full name.';
  }

  setFieldState(nameInput, 'valid');

  if (!validateUsername(username)) {
    setFieldState(usernameInput, 'invalid');

    return (
      'Username must be 3\u201330 characters ' +
      'and contain only letters, numbers, ' +
      'and underscores.'
    );
  }

  setFieldState(usernameInput, 'valid');

  if (!validateEmail(email)) {
    setFieldState(emailInput, 'invalid');

    return 'Please enter a valid email address.';
  }

  setFieldState(emailInput, 'valid');

  if (!validatePassword(password)) {
    setFieldState(passwordInput, 'invalid');

    return 'Password must be at least 8 characters.';
  }

  setFieldState(passwordInput, 'valid');

  if (!validateMatch(password, confirmPassword)) {
    setFieldState(confirmPasswordInput, 'invalid');

    return 'Passwords do not match.';
  }

  setFieldState(confirmPasswordInput, 'valid');

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

  const name = nameInput.value.trim();
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {
    const response = await auth.register({
      name,
      username,
      email,
      password
    });

    if (response.success) {
      const emailVerificationToken = response.data?.emailVerificationToken;
      const emailVerificationExpires = response.data?.emailVerificationExpires;
      
      if (emailVerificationToken) {
        // Store token for verify-email page
        sessionStorage.setItem('emailVerificationToken', emailVerificationToken);
        sessionStorage.setItem('emailVerificationExpires', emailVerificationExpires);
        sessionStorage.setItem('verifyEmail', email);
      }

      showToast(
        'Account created successfully! Please verify your email.',
        'success'
      );

      window.location.href = '/frontend/verify-email.html';

      return;
    }

    showError(
      response.error?.message ||
      'Registration failed. Please try again.'
    );

    setLoading(false);

  } catch (error) {
    showError(
      error.message ||
      'An unexpected error occurred. Please try again.'
    );

    setLoading(false);
  }
}

function init() {
  setupPasswordToggles();
  setupInputListeners();

  form.addEventListener(
    'submit',
    handleSubmit
  );

  nameInput.focus({
    preventScroll: true
  });
}

init();