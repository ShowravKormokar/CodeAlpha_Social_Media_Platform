import { auth } from '../state/auth.js';
import { showToast } from '../main.js';
import { validateEmail, validateUsername, validatePassword, validateRequired, validateMatch } from '../utils/validation.js';

const form = document.getElementById('register-form');
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
    ? '<span class="loading-spinner"></span> Creating account...' 
    : 'Create Account';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  
  const formData = new FormData(form);
  const name = formData.get('name').trim();
  const username = formData.get('username').trim();
  const email = formData.get('email').trim();
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  
  if (!validateRequired(name)) {
    showError('Please enter your full name');
    return;
  }
  
  if (!validateUsername(username)) {
    showError('Username must be 3-30 characters, letters, numbers, and underscores only');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }
  
  if (!validatePassword(password)) {
    showError('Password must be at least 8 characters');
    return;
  }
  
  if (!validateMatch(password, confirmPassword)) {
    showError('Passwords do not match');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await auth.register({ name, username, email, password });
    
    if (response.success) {
      showToast('Account created successfully!', 'success');
      window.location.href = '/feed.html';
    } else {
      showError(response.error?.message || 'Registration failed');
    }
  } catch (err) {
    showError(err.message || 'An error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
});