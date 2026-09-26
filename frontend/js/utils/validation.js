export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateUsername(username) {
  const re = /^[a-zA-Z0-9_]{3,30}$/;
  return re.test(username);
}

export function validatePassword(password) {
  return password.length >= 8;
}

export function validateRequired(value) {
  return value !== null && value !== undefined && value !== '';
}

export function validateMinLength(value, min) {
  return value && value.length >= min;
}

export function validateMaxLength(value, max) {
  return value && value.length <= max;
}

export function validateMatch(value, matchValue) {
  return value === matchValue;
}

export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

export function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

export function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}