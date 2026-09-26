import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import { validateEmail, validateRequired } from '../utils/validation.js';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('auth-error');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}

function setLoading(loading) {
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = loading;
  submitBtn.innerHTML = loading 
    ? '<span class="loading-spinner"></span> Signing in...' 
    : 'Sign In';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  
  const formData = new FormData(form);
  const emailOrUsername = formData.get('emailOrUsername').trim();
  const password = formData.get('password');
  
  if (!validateRequired(emailOrUsername)) {
    showError('Please enter your email or username');
    return;
  }
  
  if (!validateRequired(password)) {
    showError('Please enter your password');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await auth.login({ emailOrUsername, password });
    
    if (response.success) {
      showToast('Welcome back!', 'success');
      window.location.href = '/feed.html';
    } else {
      showError(response.error?.message || 'Login failed');
    }
  } catch (err) {
    showError(err.message || 'An error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
});