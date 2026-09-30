import { auth } from '../state/auth.js';
import { usersApi, postsApi, likesApi } from '../api/index.js';
import { PostCard } from '../components/PostCard.js';
import { ImageUploadModal } from '../components/ImageUploadModal.js';
import { mediaApi } from '../api/media.api.js';
import { followsApi } from '../api/follows.api.js';
import { showToast, consumePostEditedFlag } from '../main.js';
import { formatRelativeTime, getInitials, formatNumber } from '../utils/format.js';
import { renderFollowerBadge, getFollowerBadge } from '../utils/followerBadge.js';
import { appUrl, editPostUrl } from '../utils/routes.js';

const profileHeader = document.getElementById('profile-header');
const profileTabs = document.getElementById('profile-tabs');
const profileContent = document.getElementById('profile-content');

let currentUserProfile = null;
let isOwnProfile = false;
let currentTab = 'posts';
let postsPage = 1;
let postsLoading = false;
let postsHasMore = true;

/*
 * Holds the most recent upload per profile image between the upload
 * completing and the profile referencing it. Cleared once persisted;
 * a draft left behind by a failed save is reclaimed by the orphan
 * sweep.
 */
const mediaDrafts = {
  avatar: null,
  banner: null
};

/**
 * The media record most recently uploaded for each profile image, or
 * null. Exported so the profile update path can persist them without
 * reaching into the upload component.
 */
export function getProfileMediaDrafts() {
  return { ...mediaDrafts };
}

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
  const profile = user.profile || {};
  const stats = user.stats || { posts: 0, followers: 0, following: 0 };
  const isFollowing = user.isFollowing || false;
  const followsYou = user.followsYou || false;
  const mutualFollowersCount = user.mutualFollowersCount || 0;
  const followerBadge = user.followerBadge || getFollowerBadge(stats.followers || 0);

  // An uploaded image is stored as a media id and resolved through the
  // media content endpoint, so no absolute URL is baked into the page.
  const avatarSrc = profile.avatarMediaId
    ? mediaApi.getContentUrl(profile.avatarMediaId)
    : profile.avatarUrl;
  const bannerSrc = profile.bannerMediaId
    ? mediaApi.getContentUrl(profile.bannerMediaId)
    : profile.coverUrl;

  const badgeHtml = `
    <span class="profile-tier-badge profile-tier-${followerBadge.key} badge-sm"
          title="${followerBadge.label} — ${followerBadge.minFollowers.toLocaleString()}+ followers"
          aria-label="${followerBadge.label} follower badge">
      <i class="${followerBadge.icon}"></i>
    </span>
  `;

  profileHeader.innerHTML = `
    <div class="profile-cover" style="background-image: url('${bannerSrc || ''}')"></div>
    <div class="profile-avatar">
      ${avatarSrc ? `<img src="${avatarSrc}" alt="">` : getInitials(profile.displayName || user.username)}
    </div>
    <div class="profile-info">
      <h1 class="profile-name">${profile.displayName || user.username} ${!isOwnProfile ? badgeHtml : ''}</h1>
      <div class="profile-username">@${user.username}</div>
      ${profile.bio ? `<div class="profile-bio">${profile.bio}</div>` : ''}
      ${!isOwnProfile && followsYou ? `<div class="profile-relationship follows-you"><i class="ri-user-follow-line"></i> Follows you</div>` : ''}
      ${!isOwnProfile && mutualFollowersCount > 0 ? `<div class="profile-relationship mutual-followers"><i class="ri-user-shared-2-line"></i> ${mutualFollowersCount} mutual follower${mutualFollowersCount !== 1 ? 's' : ''}</div>` : ''}
      <div class="profile-stats">
        <div class="profile-stat">
          <span class="profile-stat-value">${formatNumber(stats.posts || 0)}</span>
          <span class="profile-stat-label">Posts</span>
        </div>
        <a href="${appUrl(`followers.html?userId=${user.id}`)}" class="profile-stat" style="text-decoration: none; color: inherit;">
          <span class="profile-stat-value">${formatNumber(stats.followers || 0)}</span>
          <span class="profile-stat-label">Followers</span>
        </a>
        <a href="${appUrl(`following.html?userId=${user.id}`)}" class="profile-stat" style="text-decoration: none; color: inherit;">
          <span class="profile-stat-value">${formatNumber(stats.following || 0)}</span>
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
        <div class="profile-media-actions">
          <button type="button" class="btn btn-secondary profile-media-btn" id="change-banner-btn">
            <i class="ri-image-2-line" aria-hidden="true"></i>
            <span>Change banner</span>
          </button>
          <button type="button" class="btn btn-secondary profile-media-btn" id="change-avatar-btn">
            <i class="ri-user-face-line" aria-hidden="true"></i>
            <span>Change photo</span>
          </button>
          ${avatarSrc
      ? `
            <button type="button" class="btn btn-secondary profile-media-btn profile-media-btn-danger" id="remove-avatar-btn">
              <i class="ri-delete-bin-line" aria-hidden="true"></i>
              <span>Remove photo</span>
            </button>
          `
      : ''}
          <a href="${appUrl('settings.html')}" class="btn btn-secondary">Edit Profile</a>
        </div>
      `}
    </div>
  `;

  const followBtn = profileHeader.querySelector('.follow-btn');
  followBtn?.addEventListener('click', handleFollowToggle);

  setupMediaTriggers();
}

/**
 * Paints an image uploaded earlier in this session. The draft is
 * cleared once the upload has been persisted, because the profile now
 * carries the reference itself and a reload will render it.
 */
function applyMediaDrafts() {
  if (!mediaDrafts.avatar) return;

  const avatarSlot = profileHeader.querySelector('.profile-avatar');

  if (!avatarSlot) return;

  avatarSlot.replaceChildren();

  const image = document.createElement('img');
  image.alt = '';
  image.src = mediaApi.getContentUrl(mediaDrafts.avatar.id);

  avatarSlot.appendChild(image);

  if (!mediaDrafts.banner) return;

  const cover = profileHeader.querySelector('.profile-cover');

  if (!cover) return;

  cover.style.backgroundImage = `url("${mediaApi.getContentUrl(mediaDrafts.banner.id)}")`;
}

/**
 * Links a freshly uploaded image to the profile. The media record is
 * written to the profile first; only after that succeeds is the server
 * free to release the image it replaced.
 */
async function persistMediaDraft(slot) {
  const draft = mediaDrafts[slot];
  if (!draft) return false;

  const field = slot === 'avatar' ? 'avatarMediaId' : 'bannerMediaId';

  try {
    const response = await usersApi.updateProfile({ [field]: draft.id });
    currentUserProfile = response?.data || currentUserProfile;
    auth.updateProfile(currentUserProfile?.profile);
    mediaDrafts[slot] = null;
    return true;
  } catch (err) {
    // The profile is unchanged, so the upload is left unreferenced and
    // the orphan sweep reclaims it. Surface the failure rather than
    // pretending the image was saved.
    showToast(err.message || 'Could not update your profile image', 'error');
    return false;
  }
}

function setupMediaTriggers() {
  profileHeader
    .querySelector('#remove-avatar-btn')
    ?.addEventListener('click', async () => {
      // The reference is cleared first; the server only releases the
      // stored file once nothing points at it.
      try {
        const response = await usersApi.updateProfile({ avatarMediaId: null });
        currentUserProfile = response?.data || currentUserProfile;
        auth.updateProfile(currentUserProfile?.profile);
        showToast('Profile picture removed.', 'success');
        renderProfileHeader();
      } catch (err) {
        showToast(err.message || 'Could not remove your profile picture', 'error');
      }
    });

  profileHeader
    .querySelector('#change-avatar-btn')
    ?.addEventListener('click', () => {

      const modal = ImageUploadModal({
        mediaType: 'profile_avatar',

        onUploaded: (media) => {
          mediaDrafts.avatar = media;
          applyMediaDrafts();
          persistMediaDraft('avatar').then((saved) => {
            if (saved) showToast('Profile picture updated.', 'success');
          });
        }
      });

      modal.open();

    });

  profileHeader
    .querySelector('#change-banner-btn')
    ?.addEventListener('click', () => {

      const modal = ImageUploadModal({
        mediaType: 'profile_banner',

        onUploaded: (media) => {
          mediaDrafts.banner = media;
          applyMediaDrafts();
          persistMediaDraft('banner').then((saved) => {
            if (saved) showToast('Profile banner updated.', 'success');
          });
        }
      });

      modal.open();

    });
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
          onEdit: isOwnProfile ? handleEdit : undefined,
          onAuthorClick: (userId) => window.location.href = appUrl(`profile.html?userId=${userId}`)
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
      currentUserProfile.isFollowing = false;
      if (currentUserProfile.stats) currentUserProfile.stats.followers--;
    } else {
      await followsApi.follow(userId);
      btn.dataset.following = 'true';
      btn.textContent = 'Following';
      btn.classList.replace('btn-primary', 'btn-secondary');
      currentUserProfile.isFollowing = true;
      if (currentUserProfile.stats) currentUserProfile.stats.followers++;
    }
    showToast(isFollowing ? 'Unfollowed' : 'Following!', 'success');

    // Refresh relationship data to get updated followsYou and mutual counts
    try {
      const relResponse = await followsApi.getRelationship(userId);
      if (relResponse.success && relResponse.data) {
        currentUserProfile.followsYou = relResponse.data.followsYou;
        currentUserProfile.mutualFollowersCount = relResponse.data.mutualFollowersCount;
        renderProfileHeader();
      }
    } catch (e) {
      // Ignore relationship refresh errors
    }
  } catch (err) {
    showToast(err.message || 'Failed to update follow', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleLike(postId, button) {
  const isLiked = button.classList.contains('active');
  const countEl = button.querySelector('.action-count');
  const icon = button.querySelector('.action-icon');
  const currentCount = Number.parseInt(countEl?.textContent || '0', 10) || 0;

  button.classList.toggle('active');
  button.setAttribute('aria-pressed', String(!isLiked));
  if (countEl) countEl.textContent = String(isLiked ? currentCount - 1 : currentCount + 1);
  icon?.classList.toggle('ri-heart-3-fill', !isLiked);
  icon?.classList.toggle('ri-heart-3-line', isLiked);

  try {
    if (isLiked) {
      await likesApi.unlike(postId);
    } else {
      await likesApi.like(postId);
    }
  } catch (err) {
    button.classList.toggle('active');
    button.setAttribute('aria-pressed', String(isLiked));
    if (countEl) countEl.textContent = String(currentCount);
    icon?.classList.toggle('ri-heart-3-fill', isLiked);
    icon?.classList.toggle('ri-heart-3-line', !isLiked);
    showToast(err.message || 'Failed to update like', 'error');
  }
}

function handleComment(postId) {
  window.location.href = appUrl(`post.html?id=${postId}`);
}

function handleEdit(postId) {
  /*
   * `editPostUrl` defaults `from` to the current page including
   * its query string, so the editor returns the user to the same
   * profile tab they left.
   */

  window.location.href = editPostUrl(postId);
}

async function handleDelete(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    await postsApi.delete(postId);
    showToast('Post deleted', 'success');
    loadTabContent();
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
  consumePostEditedFlag();
});
