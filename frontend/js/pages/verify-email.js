import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import { validateRequired } from '../utils/validation.js';
import { appUrl } from '../utils/routes.js';

const form = document.getElementById('verify-form');
const errorEl = document.getElementById('auth-error');
const tokenInput = document.getElementById('token');
const submitButton = form.querySelector('.auth-submit');
const resendBtn = document.getElementById('resend-btn');
const resendMessage = document.getElementById('resend-message');

// Load token from sessionStorage (set during registration)
const storedToken = sessionStorage.getItem('emailVerificationToken');
const storedEmail = sessionStorage.getItem('verifyEmail');
const storedExpires = sessionStorage.getItem('emailVerificationExpires');

if (storedToken && storedExpires) {
  const expiresAt = new Date(storedExpires);
  if (expiresAt > new Date()) {
    tokenInput.value = storedToken;
  }
}

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
  if (!shell) return;
  shell.classList.remove('is-valid', 'is-invalid');
  if (state) shell.classList.add(`is-${state}`);
}

function showResendMessage(message, isError = false) {
  resendMessage.textContent = message;
  resendMessage.hidden = false;
  resendMessage.className = `auth-resend-message ${isError ? 'is-error' : 'is-success'}`;
}

function setupInputListeners() {
  tokenInput.addEventListener('input', () => {
    hideError();
    setFieldState(tokenInput, null);
  });
}

function validateForm() {
  const token = tokenInput.value.trim();
  setFieldState(tokenInput, null);

  if (!validateRequired(token)) {
    setFieldState(tokenInput, 'invalid');
    return 'Please enter the verification code.';
  }

  setFieldState(tokenInput, 'valid');
  return null;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (form.getAttribute('aria-busy') === 'true') return;

  hideError();

  const validationError = validateForm();
  if (validationError) {
    showError(validationError);
    return;
  }

  const token = tokenInput.value.trim();
  setLoading(true);

  try {
    const response = await auth.verifyEmail(token);

    if (response.success) {
      // Clear stored token
      sessionStorage.removeItem('emailVerificationToken');
      sessionStorage.removeItem('emailVerificationExpires');
      sessionStorage.removeItem('verifyEmail');

      showToast('Email verified successfully! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = appUrl('login.html');
      }, 1500);
      return;
    }

    showError(response.error?.message || 'Verification failed. Please try again.');
    setLoading(false);

  } catch (error) {
    showError(error.message || 'An error occurred. Please try again.');
    setLoading(false);
  }
}

async function handleResend() {
  if (!storedEmail) {
    showResendMessage('Email not found. Please register again.', true);
    return;
  }

  resendBtn.disabled = true;
  resendBtn.textContent = 'Sending...';

  try {
    const response = await auth.resendVerification(storedEmail);

    if (response.success) {
      const token = response.data?.token;
      if (token) {
        // Store new token
        sessionStorage.setItem('emailVerificationToken', token);
        sessionStorage.setItem('emailVerificationExpires', response.data?.expiresAt);

        // Show token in alert for easy copy-paste (dev/testing)
        alert(`🔐 New Verification Token (copy this):\n\n${token}\n\nPaste into the field above and click "Verify Email"`);
        // Also auto-fill the input
        tokenInput.value = token;
        setFieldState(tokenInput, 'valid');
      }
      showResendMessage('New verification token generated! Check alert above.', false);
    } else {
      showResendMessage(response.error?.message || 'Failed to resend. Please try again.', true);
    }
  } catch (error) {
    showResendMessage(error.message || 'An error occurred. Please try again.', true);
  } finally {
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend verification';
  }
}

function init() {
  setupInputListeners();
  form.addEventListener('submit', handleSubmit);
  resendBtn.addEventListener('click', handleResend);
  tokenInput.focus({ preventScroll: true });
}

init();