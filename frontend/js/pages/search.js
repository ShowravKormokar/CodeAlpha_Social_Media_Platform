import { auth } from '../state/auth.js';
import { usersApi, followsApi } from '../api/index.js';
import { showToast } from '../main.js';
import { getInitials, formatRelativeTime, formatNumber } from '../utils/format.js';
import { renderFollowerBadge, getFollowerBadge } from '../utils/followerBadge.js';
import { appUrl } from '../utils/routes.js';
import { resolveMediaSource } from '../utils/media.js';

const searchPage = document.getElementById('search-page');

let searchDebounceTimer = null;
let currentSearchQuery = '';
let searchPageNum = 1;
let searchLoading = false;
let searchHasMore = true;
let currentResults = [];

async function initSearch() {
  await auth.init();
  renderSearchPage();
  setupEventListeners();
}

function renderSearchPage() {
  searchPage.innerHTML = `
    <div class="search-page">
      <header class="search-header">
        <h1 class="search-title">Search People</h1>
        <div class="search-input-wrapper">
          <input 
            type="text" 
            class="search-input" 
            id="search-input" 
            placeholder="Search by name or username..."
            autocomplete="off"
            spellcheck="false"
          >
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </header>
      <div class="search-results" id="search-results">
        <div class="search-empty">
          <div class="search-empty-icon">🔍</div>
          <h3 class="search-empty-title">Search for people</h3>
          <p class="search-empty-text">Enter a name or username to find users</p>
        </div>
      </div>
      <div class="search-load-more" id="search-load-more" style="display: none; text-align: center; padding: var(--spacing-lg);">
        <button class="btn btn-secondary" id="load-more-btn">Load more</button>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const resultsContainer = document.getElementById('search-results');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(searchDebounceTimer);

    if (query.length < 2) {
      if (query.length === 0) {
        renderEmptyState();
      }
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(searchDebounceTimer);
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      }
    }
  });

  loadMoreBtn.addEventListener('click', () => {
    if (!searchLoading && searchHasMore && currentSearchQuery) {
      performSearch(currentSearchQuery, false);
    }
  });

  // Focus search input on load
  searchInput.focus();
}

function renderEmptyState() {
  const resultsContainer = document.getElementById('search-results');
  const loadMoreContainer = document.getElementById('search-load-more');

  resultsContainer.innerHTML = `
    <div class="search-empty">
      <div class="search-empty-icon">🔍</div>
      <h3 class="search-empty-title">Search for people</h3>
      <p class="search-empty-text">Enter a name or username to find users</p>
    </div>
  `;
  loadMoreContainer.style.display = 'none';
  currentResults = [];
  searchPageNum = 1;
  searchHasMore = true;
}

function renderLoadingState() {
  const resultsContainer = document.getElementById('search-results');
  const loadMoreContainer = document.getElementById('search-load-more');

  if (searchPageNum === 1) {
    resultsContainer.innerHTML = `
      <div class="search-loading">
        <div class="search-loading-spinner"></div>
        <p>Searching...</p>
      </div>
    `;
  }
  loadMoreContainer.style.display = 'none';
}

function renderErrorState(message) {
  const resultsContainer = document.getElementById('search-results');
  const loadMoreContainer = document.getElementById('search-load-more');

  resultsContainer.innerHTML = `
    <div class="search-error">
      <div class="search-empty-icon">⚠️</div>
      <h3 class="search-empty-title">Unable to search</h3>
      <p class="search-empty-text">${escapeHtml(message)}</p>
      <div class="search-error-actions">
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    </div>
  `;
  loadMoreContainer.style.display = 'none';
}

async function performSearch(query, reset = true) {
  if (searchLoading) return;

  searchLoading = true;
  currentSearchQuery = query;

  if (reset) {
    searchPageNum = 1;
    searchHasMore = true;
    currentResults = [];
    renderLoadingState();
  }

  const loadMoreContainer = document.getElementById('search-load-more');
  const loadMoreBtn = document.getElementById('load-more-btn');
  loadMoreBtn.disabled = true;
  loadMoreBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';

  try {
    const response = await usersApi.search(query, { page: searchPageNum, limit: 20 });

    if (response.success && response.data) {
      const users = response.data;
      const pagination = response.pagination;

      searchHasMore = pagination.hasNext;
      searchPageNum++;

      if (reset && users.length === 0) {
        renderNoResults();
        return;
      }

      currentResults = reset ? users : [...currentResults, ...users];
      renderResults(currentResults);

      if (searchHasMore) {
        loadMoreContainer.style.display = 'block';
      } else {
        loadMoreContainer.style.display = 'none';
      }
    } else {
      throw new Error(response.error?.message || 'Search failed');
    }
  } catch (err) {
    if (reset) {
      renderErrorState(err.message || 'Failed to search users');
    } else {
      showToast(err.message || 'Failed to load more results', 'error');
    }
  } finally {
    searchLoading = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load more';
  }
}

function renderNoResults() {
  const resultsContainer = document.getElementById('search-results');
  const loadMoreContainer = document.getElementById('search-load-more');

  resultsContainer.innerHTML = `
    <div class="search-empty">
      <div class="search-empty-icon">👤</div>
      <h3 class="search-empty-title">No users found</h3>
      <p class="search-empty-text">Try a different search term</p>
    </div>
  `;
  loadMoreContainer.style.display = 'none';
}

function renderResults(users) {
  const resultsContainer = document.getElementById('search-results');

  if (users.length === 0) {
    renderNoResults();
    return;
  }

  resultsContainer.innerHTML = users.map(user => renderUserCard(user)).join('');

  // Add click handlers for follow buttons
  resultsContainer.querySelectorAll('.follow-btn').forEach(btn => {
    btn.addEventListener('click', handleFollowClick);
  });

  // Add click handlers for user cards (navigate to profile)
  resultsContainer.querySelectorAll('.user-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking on button
      if (e.target.closest('button')) return;
      const userId = card.dataset.userId;
      if (userId) {
        window.location.href = appUrl(`profile.html?userId=${userId}`);
      }
    });
  });
}

function renderUserCard(user) {
  const profile = user.profile || {};
  const isFollowing = user.isFollowing || false;
  const followsYou = user.followsYou || false;
  const mutualFollowersCount = user.mutualFollowersCount || 0;
  const displayName = profile.displayName || user.username;
  const avatarUrl = resolveMediaSource(profile.avatarMediaId, profile.avatarUrl);
  const bio = profile.bio;
  const followerBadge = user.followerBadge || getFollowerBadge(user.stats?.followers || 0);

  const badgeHtml = `
    <span class="profile-tier-badge profile-tier-${followerBadge.key} badge-sm"
          title="${followerBadge.label} — ${followerBadge.minFollowers.toLocaleString()}+ followers"
          aria-label="${followerBadge.label} follower badge">
      <i class="${followerBadge.icon}"></i>
    </span>
  `;

  return `
    <article class="user-card" data-user-id="${user.id}" style="cursor: pointer;">
      <div class="user-card-avatar">
        ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="">` : getInitials(displayName)}
      </div>
      <div class="user-card-info">
        <div class="user-card-name">${escapeHtml(displayName)} ${badgeHtml}</div>
        <div class="user-card-username">@${escapeHtml(user.username)}</div>
        ${bio ? `<div class="user-card-bio">${escapeHtml(bio)}</div>` : ''}
        <div class="user-card-stats">
          <span>${formatNumber(user.stats?.followers || 0)} followers</span>
          ${mutualFollowersCount > 0 ? `<span>${mutualFollowersCount} mutual follower${mutualFollowersCount !== 1 ? 's' : ''}</span>` : ''}
          ${followsYou ? '<span class="follows-you"><i class="ri-user-follow-line"></i> Follows you</span>' : ''}
        </div>
      </div>
      <div class="user-card-actions">
        ${auth.user && auth.user.id !== user.id ? `
          <button 
            class="btn btn-${isFollowing ? 'secondary' : 'primary'} btn-sm follow-btn" 
            data-user-id="${user.id}" 
            data-following="${isFollowing}"
          >
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

async function handleFollowClick(e) {
  e.stopPropagation();

  const btn = e.currentTarget;
  const userId = btn.dataset.userId;
  const isFollowing = btn.dataset.following === 'true';

  if (!auth.user) {
    showToast('Please log in to follow users', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = isFollowing ? 'Unfollowing...' : 'Following...';

  try {
    if (isFollowing) {
      await followsApi.unfollow(userId);
      btn.dataset.following = 'false';
      btn.textContent = 'Follow';
      btn.classList.replace('btn-secondary', 'btn-primary');
    } else {
      await followsApi.follow(userId);
      btn.dataset.following = 'true';
      btn.textContent = 'Following';
      btn.classList.replace('btn-primary', 'btn-secondary');
    }
    showToast(isFollowing ? 'Unfollowed' : 'Following!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update follow', 'error');
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', initSearch);