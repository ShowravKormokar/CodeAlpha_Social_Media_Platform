import { auth } from '../state/auth.js';
import { usersApi, postsApi } from '../api/index.js';
import { PostCard } from '../components/PostCard.js';
import { followsApi } from '../api/follows.api.js';
import { showToast } from '../main.js';
import { formatRelativeTime, getInitials } from '../utils/format.js';

const profileHeader = document.getElementById('profile-header');
const profileTabs = document.getElementById('profile-tabs');
const profileContent = document.getElementById('profile-content');

let currentUserProfile = null;
let isOwnProfile = false;
let currentTab = 'posts';
let postsPage = 1;
let postsLoading = false;
let postsHasMore = true;

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('userId') || auth.user?.id;
}

async function loadProfile() {
  const userId = getUserIdFromUrl();
  isOwnProfile = auth.user && auth.user.id === userId;
  
  try {
    const response = await usersApi.getProfile(userId);
    
    if (response.success && response.data) {
      currentUserProfile = response.data;
      renderProfileHeader();
      renderTabs();
      loadTabContent();
    } else {
      showToast('Profile not found', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to load profile', 'error');
  }
}

function renderProfileHeader() {
  if (!currentUserProfile) return;
  
  const user = currentUserProfile;
  const stats = user.stats || { posts: 0, followers: 0, following: 0 };
  const isFollowing = user.is_following || false;
  
  profileHeader.innerHTML = `
    <div class="profile-cover" style="background-image: url('${user.cover_url || ''}')"></div>
    <div class="profile-avatar">
      ${user.avatar_url ? `<img src="${user.avatar_url}" alt="">` : getInitials(user.name || user.username)}
    </div>
    <div class="profile-info">
      <h1 class="profile-name">${user.name || user.username}</h1>
      <div class="profile-username">@${user.username}</div>
      ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
      <div class="profile-stats">
        <div class="profile-stat">
          <span class="profile-stat-value">${stats.posts || 0}</span>
          <span class="profile-stat-label">Posts</span>
        </div>
        <a href="/followers.html?userId=${user.id}" class="profile-stat" style="text-decoration: none; color: inherit;">
          <span class="profile-stat-value">${stats.followers || 0}</span>
          <span class="profile-stat-label">Followers</span>
        </a>
        <a href="/following.html?userId=${user.id}" class="profile-stat" style="text-decoration: none; color: inherit;">
          <span class="profile-stat-value">${stats.following || 0}</span>
          <span class="profile-stat-label">Following</span>
        </a>
      </div>
    </div>
    <div class="profile-actions">
      ${!isOwnProfile ? `
        <button class="btn btn-${isFollowing ? 'secondary' : 'primary'} follow-btn" data-user-id="${user.id}" data-following="${isFollowing}">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
      ` : `
        <a href="/settings.html" class="btn btn-secondary">Edit Profile</a>
      `}
    </div>
  `;
  
  const followBtn = profileHeader.querySelector('.follow-btn');
  followBtn?.addEventListener('click', handleFollowToggle);
}

function renderTabs() {
  profileTabs.innerHTML = `
    <button class="profile-tab ${currentTab === 'posts' ? 'active' : ''}" data-tab="posts">Posts</button>
    <button class="profile-tab ${currentTab === 'replies' ? 'active' : ''}" data-tab="replies">Replies</button>
    <button class="profile-tab ${currentTab === 'media' ? 'active' : ''}" data-tab="media">Media</button>
    <button class="profile-tab ${currentTab === 'likes' ? 'active' : ''}" data-tab="likes">Likes</button>
  `;
  
  profileTabs.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      postsPage = 1;
      postsHasMore = true;
      renderTabs();
      loadTabContent();
    });
  });
}

async function loadTabContent() {
  if (!currentUserProfile) return;
  
  profileContent.innerHTML = '<div class="posts-feed" id="posts-feed"></div>';
  const feedContainer = document.getElementById('posts-feed');
  
  if (currentTab === 'posts') {
    await loadPosts(feedContainer, true);
  } else {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚧</div>
        <h3 class="empty-state-title">Coming soon</h3>
        <p class="empty-state-text">${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} tab is not implemented yet</p>
      </div>
    `;
  }
}

async function loadPosts(container, reset = false) {
  if (postsLoading || (!reset && !postsHasMore)) return;
  
  postsLoading = true;
  
  if (reset) {
    postsPage = 1;
    postsHasMore = true;
    container.innerHTML = '';
  }
  
  try {
    const response = await usersApi.getPosts(currentUserProfile.id, { page: postsPage, limit: 10 });
    
    if (response.success && response.data) {
      const posts = response.data;
      const pagination = response.pagination;
      
      postsHasMore = pagination?.hasNext || false;
      postsPage++;
      
      if (reset && posts.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3 class="empty-state-title">No posts yet</h3>
            <p class="empty-state-text">${isOwnProfile ? 'Share your first post!' : 'This user has not posted yet'}</p>
          </div>
        `;
        return;
      }
      
      posts.forEach(post => {
        const card = PostCard({
          post,
          currentUser: auth.user,
          onLike: handleLike,
          onComment: handleComment,
          onDelete: isOwnProfile ? handleDelete : undefined,
          onAuthorClick: (userId) => window.location.href = `/profile.html?userId=${userId}`
        });
        container.appendChild(card);
      });
    }
  } catch (err) {
    showToast(err.message || 'Failed to load posts', 'error');
  } finally {
    postsLoading = false;
  }
}

async function handleFollowToggle() {
  if (!currentUserProfile || !auth.user) return;
  
  const btn = profileHeader.querySelector('.follow-btn');
  const isFollowing = btn.dataset.following === 'true';
  const userId = currentUserProfile.id;
  
  btn.disabled = true;
  btn.textContent = isFollowing ? 'Unfollowing...' : 'Following...';
  
  try {
    if (isFollowing) {
      await followsApi.unfollow(userId);
      btn.dataset.following = 'false';
      btn.textContent = 'Follow';
      btn.classList.replace('btn-secondary', 'btn-primary');
      currentUserProfile.is_following = false;
      if (currentUserProfile.stats) currentUserProfile.stats.followers--;
    } else {
      await followsApi.follow(userId);
      btn.dataset.following = 'true';
      btn.textContent = 'Following';
      btn.classList.replace('btn-primary', 'btn-secondary');
      currentUserProfile.is_following = true;
      if (currentUserProfile.stats) currentUserProfile.stats.followers++;
    }
    showToast(isFollowing ? 'Unfollowed' : 'Following!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update follow', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleLike(postId, button) {
  const isLiked = button.classList.contains('active');
  const countEl = button.querySelector('.count');
  const currentCount = parseInt(countEl.textContent) || 0;
  
  button.classList.toggle('active');
  countEl.textContent = isLiked ? currentCount - 1 : currentCount + 1;
  button.querySelector('svg').setAttribute('fill', isLiked ? 'none' : 'currentColor');
  
  try {
    if (isLiked) {
      await likesApi.unlike(postId);
    } else {
      await likesApi.like(postId);
    }
  } catch (err) {
    button.classList.toggle('active');
    countEl.textContent = currentCount;
    button.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');
    showToast(err.message || 'Failed to update like', 'error');
  }
}

function handleComment(postId) {
  window.location.href = `/post.html?id=${postId}`;
}

async function handleDelete(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  
  try {
    const response = await postsApi.delete(postId);
    if (response.success) {
      showToast('Post deleted', 'success');
      loadTabContent();
    } else {
      showToast(response.error?.message || 'Failed to delete post', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete post', 'error');
  }
}

function setupInfiniteScroll() {
  const container = document.getElementById('posts-feed');
  if (!container) return;
  
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !postsLoading && postsHasMore && currentTab === 'posts') {
      loadPosts(container);
    }
  }, { rootMargin: '200px' });
  
  const sentinel = document.createElement('div');
  sentinel.id = 'load-sentinel';
  container.appendChild(sentinel);
  observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  await loadProfile();
  setupInfiniteScroll();
});