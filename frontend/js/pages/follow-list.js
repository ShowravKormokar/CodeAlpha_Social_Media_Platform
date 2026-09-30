import { auth } from '../state/auth.js';
import { usersApi, followsApi } from '../api/index.js';
import { showToast } from '../main.js';
import { getInitials, formatNumber } from '../utils/format.js';
import { renderFollowerBadge, getFollowerBadge } from '../utils/followerBadge.js';
import { appUrl } from '../utils/routes.js';
import { resolveMediaSource } from '../utils/media.js';

const followListPage = document.getElementById('follow-list-page');
const pageTitle = document.getElementById('page-title');

let currentMode = 'followers'; // 'followers' or 'following'
let currentUserId = null;
let currentPage = 1;
let loading = false;
let hasMore = true;
let currentResults = [];

async function initFollowList() {
  await auth.init();

  // Determine mode from URL
  const path = window.location.pathname;
  currentMode = path.includes('following') ? 'following' : 'followers';
  pageTitle.textContent = currentMode === 'followers' ? 'Followers' : 'Following';

  // Get userId from URL params
  const params = new URLSearchParams(window.location.search);
  currentUserId = params.get('userId') || auth.user?.id;

  if (!currentUserId) {
    showToast('User ID required', 'error');
    return;
  }

  renderFollowListPage();
  setupEventListeners();
  await loadFollowList(true);
}

function renderFollowListPage() {
  followListPage.innerHTML = `
    <div class="follow-list-page">
      <header class="follow-list-header">
        <h1 class="follow-list-title">${currentMode === 'followers' ? 'Followers' : 'Following'}</h1>
        <span class="follow-list-count" id="follow-count">Loading...</span>
      </header>
      <div class="follow-list" id="follow-list">
        <div class="follow-list-loading">
          <div class="follow-list-loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
      <div class="follow-list-load-more" id="load-more-container" style="display: none;">
        <button class="btn btn-secondary" id="load-more-btn">Load more</button>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  loadMoreBtn?.addEventListener('click', () => {
    if (!loading && hasMore) {
      loadFollowList(false);
    }
  });
}

async function loadFollowList(reset = true) {
  if (loading) return;

  loading = true;
  const listContainer = document.getElementById('follow-list');
  const loadMoreContainer = document.getElementById('load-more-container');
  const loadMoreBtn = document.getElementById('load-more-btn');

  if (reset) {
    currentPage = 1;
    hasMore = true;
    currentResults = [];
    listContainer.innerHTML = `
      <div class="follow-list-loading">
        <div class="follow-list-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  }

  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';
  }

  try {
    let response;
    if (currentMode === 'followers') {
      response = await usersApi.getFollowers(currentUserId, { page: currentPage, limit: 20 });
    } else {
      response = await usersApi.getFollowing(currentUserId, { page: currentPage, limit: 20 });
    }

    if (response.success && response.data) {
      const users = response.data;
      const pagination = response.pagination;

      hasMore = pagination.hasNext;
      currentPage++;

      if (reset && users.length === 0) {
        renderEmptyState();
        return;
      }

      currentResults = reset ? users : [...currentResults, ...users];
      renderFollowList(currentResults);
      updateCount(pagination.total);

      if (hasMore) {
        loadMoreContainer.style.display = 'block';
      } else {
        loadMoreContainer.style.display = 'none';
      }
    } else {
      throw new Error(response.error?.message || 'Failed to load');
    }
  } catch (err) {
    if (reset) {
      renderErrorState(err.message || 'Failed to load list');
    } else {
      showToast(err.message || 'Failed to load more', 'error');
    }
  } finally {
    loading = false;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load more';
    }
  }
}

function updateCount(total) {
  const countEl = document.getElementById('follow-count');
  if (countEl) {
    countEl.textContent = `${total} ${total === 1 ? 'user' : 'users'}`;
  }
}

function renderEmptyState() {
  const listContainer = document.getElementById('follow-list');
  const loadMoreContainer = document.getElementById('load-more-container');

  const emptyMessage = currentMode === 'followers'
    ? 'No followers yet.'
    : 'Not following anyone yet.';

  listContainer.innerHTML = `
    <div class="follow-list-empty">
      <div class="follow-list-empty-icon">👥</div>
      <h3 class="follow-list-empty-title">${emptyMessage}</h3>
    </div>
  `;
  loadMoreContainer.style.display = 'none';
}

function renderErrorState(message) {
  const listContainer = document.getElementById('follow-list');
  const loadMoreContainer = document.getElementById('load-more-container');

  listContainer.innerHTML = `
    <div class="follow-list-error">
      <div class="follow-list-empty-icon">⚠️</div>
      <h3 class="follow-list-empty-title">Unable to load</h3>
      <p class="follow-list-empty-text">${escapeHtml(message)}</p>
      <div class="follow-list-error-actions">
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    </div>
  `;
  loadMoreContainer.style.display = 'none';
}

function renderFollowList(users) {
  const listContainer = document.getElementById('follow-list');

  if (users.length === 0) {
    renderEmptyState();
    return;
  }

  listContainer.innerHTML = users.map(user => renderFollowUserCard(user)).join('');

  // Add click handlers for follow buttons
  listContainer.querySelectorAll('.follow-btn').forEach(btn => {
    btn.addEventListener('click', handleFollowClick);
  });

  // Add click handlers for user cards (navigate to profile)
  listContainer.querySelectorAll('.follow-user-card').forEach(card => {
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

function renderFollowUserCard(user) {
  const profile = user.profile || {};
  const isFollowing = user.isFollowing || false;
  const followsYou = user.followsYou || false;
  const mutualFollowersCount = user.mutualFollowersCount || 0;
  const displayName = profile.displayName || user.display_name || user.username;
  const avatarUrl = resolveMediaSource(
    profile.avatarMediaId || user.avatarMediaId || user.avatar_media_id,
    profile.avatarUrl || profile.avatar_url || user.avatar_url || user.avatarUrl
  );
  const bio = profile.bio;
  const followerBadge = user.followerBadge || getFollowerBadge(user.stats?.followers || 0);

  const badgeHtml = `
    <span class="profile-tier-badge profile-tier-${followerBadge.key} badge-sm"
          title="${followerBadge.label} — ${followerBadge.minFollowers.toLocaleString()}+ followers"
          aria-label="${followerBadge.label} follower badge">
      <i class="${followerBadge.icon}"></i>
    </span>
  `;

  // Don't show follow button for self
  const showFollowBtn = auth.user && auth.user.id !== user.id;

  return `
    <article class="follow-user-card" data-user-id="${user.id}" style="cursor: pointer;">
      <div class="follow-user-avatar">
        ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="">` : getInitials(displayName)}
      </div>
      <div class="follow-user-info">
        <div class="follow-user-name">${escapeHtml(displayName)} ${badgeHtml}</div>
        <div class="follow-user-username">@${escapeHtml(user.username)}</div>
        ${bio ? `<div class="follow-user-bio">${escapeHtml(bio)}</div>` : ''}
        <div class="follow-user-stats">
          <span>${formatNumber(user.stats?.followers || 0)} followers</span>
          ${mutualFollowersCount > 0 ? `<span>${mutualFollowersCount} mutual follower${mutualFollowersCount !== 1 ? 's' : ''}</span>` : ''}
          ${followsYou ? '<span class="follows-you"><i class="ri-user-follow-line"></i> Follows you</span>' : ''}
        </div>
      </div>
      ${showFollowBtn ? `
        <div class="follow-user-actions">
          <button 
            class="btn btn-${isFollowing ? 'secondary' : 'primary'} btn-sm follow-btn" 
            data-user-id="${user.id}" 
            data-following="${isFollowing}"
          >
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      ` : ''}
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

    // Update the user in currentResults to reflect the change
    const userIndex = currentResults.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      currentResults[userIndex].isFollowing = !isFollowing;
      if (currentResults[userIndex].stats) {
        currentResults[userIndex].stats.followers += isFollowing ? -1 : 1;
      }
    }
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

document.addEventListener('DOMContentLoaded', initFollowList);