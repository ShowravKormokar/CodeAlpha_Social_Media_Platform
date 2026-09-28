import { auth } from '../state/auth.js';
import { usersApi } from '../api/index.js';
import { showToast } from '../main.js';
import { getInitials } from '../utils/format.js';
import { appUrl } from '../utils/routes.js';

const settingsContainer = document.getElementById('settings-container');

let currentProfile = null;

async function loadSettings() {
  try {
    await auth.init();
    if (!auth.user) {
      window.location.href = appUrl('login.html');
      return;
    }

    const response = await usersApi.getProfile(auth.user.id);

    if (response.success && response.data) {
      currentProfile = response.data;
      renderSettings();
    } else {
      showToast('Failed to load profile', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to load settings', 'error');
  }
}

function renderSettings() {
  const profile = currentProfile.profile || {};

  settingsContainer.innerHTML = `
    <div class="settings-page">
      <h1 class="page-title">Settings</h1>
      
      <section class="settings-section">
        <h2 class="settings-section-title">Profile</h2>
        
        <div class="profile-preview">
          <div class="avatar-wrapper">
            ${profile.avatarUrl
      ? `<img src="${profile.avatarUrl}" alt="" class="avatar-preview" id="avatar-preview">`
      : `<div class="avatar-preview" id="avatar-preview" style="display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; color: var(--color-primary);">${getInitials(profile.displayName || auth.user.username)}</div>`
    }
          </div>
          <div class="cover-wrapper">
            ${profile.coverUrl
      ? `<img src="${profile.coverUrl}" alt="" class="cover-preview" id="cover-preview">`
      : `<div class="cover-preview" id="cover-preview" style="background: var(--color-bg-tertiary);"></div>`
    }
          </div>
        </div>
        
        <form class="settings-form" id="profile-form">
          <div class="form-group">
            <label class="form-label" for="displayName">Display Name</label>
            <input 
              type="text" 
              id="displayName" 
              name="displayName" 
              class="form-input" 
              value="${escapeHtml(profile.displayName || '')}"
              maxlength="100"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label" for="bio">Bio</label>
            <textarea 
              id="bio" 
              name="bio" 
              class="form-textarea" 
              maxlength="500"
              rows="4"
              placeholder="Tell us about yourself...">${escapeHtml(profile.bio || '')}</textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="avatarUrl">Avatar URL</label>
            <input 
              type="url" 
              id="avatarUrl" 
              name="avatarUrl" 
              class="form-input" 
              value="${escapeHtml(profile.avatarUrl || '')}"
              placeholder="https://example.com/avatar.jpg"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label" for="coverUrl">Cover URL</label>
            <input 
              type="url" 
              id="coverUrl" 
              name="coverUrl" 
              class="form-input" 
              value="${escapeHtml(profile.coverUrl || '')}"
              placeholder="https://example.com/cover.jpg"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label" for="websiteUrl">Website</label>
            <input 
              type="url" 
              id="websiteUrl" 
              name="websiteUrl" 
              class="form-input" 
              value="${escapeHtml(profile.websiteUrl || '')}"
              placeholder="https://example.com"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label" for="location">Location</label>
            <input 
              type="text" 
              id="location" 
              name="location" 
              class="form-input" 
              value="${escapeHtml(profile.location || '')}"
              maxlength="150"
              placeholder="San Francisco, CA"
            >
          </div>
          
          <div class="settings-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="save-btn">Save Changes</button>
          </div>
        </form>
      </section>
      
      <section class="settings-section">
        <h2 class="settings-section-title">Account</h2>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
          Username and email changes are not available in this version.
        </p>
        <div class="settings-actions">
          <a href="${appUrl(`profile.html?userId=${auth.user.id}`)}" class="btn btn-secondary">Back to Profile</a>
        </div>
      </section>
    </div>
  `;

  setupEventListeners();
}

function setupEventListeners() {
  const form = document.getElementById('profile-form');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const avatarInput = document.getElementById('avatarUrl');
  const coverInput = document.getElementById('coverUrl');
  const avatarPreview = document.getElementById('avatar-preview');
  const coverPreview = document.getElementById('cover-preview');

  // Preview avatar URL changes
  avatarInput.addEventListener('input', () => {
    const url = avatarInput.value.trim();
    if (url) {
      avatarPreview.innerHTML = `<img src="${url}" alt="" class="avatar-preview">`;
    } else {
      const profile = currentProfile.profile || {};
      avatarPreview.innerHTML = '';
      avatarPreview.textContent = getInitials(profile.displayName || auth.user.username);
      avatarPreview.style.display = 'flex';
      avatarPreview.style.alignItems = 'center';
      avatarPreview.style.justifyContent = 'center';
      avatarPreview.style.fontSize = '2.5rem';
      avatarPreview.style.fontWeight = 'bold';
      avatarPreview.style.color = 'var(--color-primary)';
    }
  });

  // Preview cover URL changes
  coverInput.addEventListener('input', () => {
    const url = coverInput.value.trim();
    if (url) {
      coverPreview.innerHTML = `<img src="${url}" alt="" class="cover-preview">`;
    } else {
      coverPreview.innerHTML = '';
      coverPreview.style.background = 'var(--color-bg-tertiary)';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      displayName: formData.get('displayName').trim(),
      bio: formData.get('bio').trim() || undefined,
      avatarUrl: formData.get('avatarUrl').trim() || undefined,
      coverUrl: formData.get('coverUrl').trim() || undefined,
      websiteUrl: formData.get('websiteUrl').trim() || undefined,
      location: formData.get('location').trim() || undefined,
    };

    // Remove empty strings
    Object.keys(data).forEach(key => {
      if (data[key] === '') {
        data[key] = undefined;
      }
    });

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    try {
      const response = await usersApi.updateProfile(data);

      if (response.success) {
        showToast('Profile updated successfully', 'success');
        currentProfile = response.data;
        renderSettings();
      } else {
        showToast(response.error?.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  cancelBtn.addEventListener('click', () => {
    window.location.href = appUrl(`profile.html?userId=${auth.user.id}`);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadSettings);