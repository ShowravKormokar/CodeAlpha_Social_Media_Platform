import { createElement } from '../utils/dom.js';
import { formatRelativeTime } from '../utils/format.js';
import { getFollowerBadge } from '../utils/followerBadge.js';
import { appUrl } from '../utils/routes.js';
import { mediaApi } from '../api/media.api.js';
import { getAvatarMarkup } from '../utils/media.js';

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAuthorName(post) {
  return post.author?.name || post.author?.username || 'User';
}

function getUsername(post) {
  return post.author?.username || post.username || 'user';
}

/**
 * Resolves the image to display. An uploaded image is referenced by
 * media id and served through the media content endpoint; an external
 * URL is used as-is.
 */
function getPostImageSrc(post) {
  if (post.image_media_id) {
    return mediaApi.getContentUrl(post.image_media_id);
  }
  return post.image_url || '';
}

export function PostCard({
  post,
  currentUser,
  onLike,
  onComment,
  onDelete,
  onEdit,
  onAuthorClick
}) {
  post = normalizePost(post);

  const card = createElement('article', {
    class: 'post-card',
    'data-post-id': post.id
  });

  const isAuthor = Boolean(
    currentUser && String(post.user_id) === String(currentUser.id)
  );

  const authorName = escapeHTML(getAuthorName(post));
  const username = escapeHTML(getUsername(post));
  const avatar = getAvatarMarkup({
    name: getAuthorName(post),
    mediaId: post.author?.avatarMediaId || post.author?.avatar_media_id,
    fallbackUrl: post.author?.avatarUrl || post.author?.avatar_url
  });
  const content = escapeHTML(post.content || '').replace(/\n/g, '<br>');

  const likesCount = Number(post.likes_count) || 0;
  const commentsCount = Number(post.comments_count) || 0;
  const isLiked = Boolean(post.user_liked);
  const postImageSrc = getPostImageSrc(post);

  // Follower badge for author
  const authorFollowersCount = post.author?.stats?.followers || 0;
  const authorBadge = post.author?.followerBadge || getFollowerBadge(authorFollowersCount);
  const badgeHtml = authorBadge ? `
    <span class="profile-tier-badge profile-tier-${authorBadge.key} badge-sm"
          title="${authorBadge.label} — ${authorBadge.minFollowers.toLocaleString()}+ followers"
          aria-label="${authorBadge.label} follower badge">
      <i class="${authorBadge.icon}"></i>
    </span>
  ` : '';

  const editedLabel = post.updated_at &&
    post.updated_at !== post.created_at
    ? '<span class="post-edited">Edited</span>'
    : '';

  card.innerHTML = `
    <header class="post-header">

      <a
        href="${appUrl(`profile.html?userId=${encodeURIComponent(post.user_id)}`)}"
        class="post-author"
        data-author-id="${escapeHTML(post.user_id)}"
        aria-label="View ${authorName}'s profile"
      >
        <span class="avatar post-avatar" aria-hidden="true">
          ${avatar}
        </span>

        <span class="post-author-info">
          <span class="post-author-name-row">
            <strong class="author-name">${authorName} ${badgeHtml}</strong>
          </span>

          <span class="post-meta">
            <span>@${username}</span>
            <span class="post-meta-dot" aria-hidden="true">•</span>
            <time datetime="${escapeHTML(post.created_at || '')}">
              ${escapeHTML(formatRelativeTime(post.created_at))}
            </time>
            ${editedLabel}
          </span>
        </span>
      </a>

      ${isAuthor
      ? `
            <details class="post-menu">
              <summary
                class="post-menu-trigger"
                aria-label="Post options"
                title="Post options"
              >
                <i class="ri-more-2-fill" aria-hidden="true"></i>
              </summary>

              <div class="post-menu-dropdown" role="menu">

                <button
                  type="button"
                  class="post-menu-item edit-post"
                  data-post-id="${escapeHTML(post.id)}"
                  role="menuitem"
                >
                  <i class="ri-edit-line" aria-hidden="true"></i>
                  <span>Edit post</span>
                </button>

                <button
                  type="button"
                  class="post-menu-item post-menu-item-danger delete-post"
                  data-post-id="${escapeHTML(post.id)}"
                  role="menuitem"
                >
                  <i class="ri-delete-bin-6-line" aria-hidden="true"></i>
                  <span>Delete post</span>
                </button>

              </div>
            </details>
          `
      : ''
    }

    </header>

    <div class="post-body">

      ${content
      ? `<div class="post-content">${content}</div>`
      : ''
    }

      ${postImageSrc
      ? `
            <div class="post-media">
              <img
                src="${escapeHTML(postImageSrc)}"
                alt="Image shared by ${authorName}"
                class="post-image"
                loading="lazy"
              >
            </div>
          `
      : ''
    }

    </div>

    <div class="post-stats">

      <span class="post-stat">
        <i class="ri-heart-3-fill" aria-hidden="true"></i>
        <span class="post-like-count">${likesCount}</span>
        <span class="sr-only">likes</span>
      </span>

      <button
        type="button"
        class="post-comment-summary"
        data-post-id="${escapeHTML(post.id)}"
        aria-label="${commentsCount} comments"
      >
        ${commentsCount}
        <span>comment${commentsCount === 1 ? '' : 's'}</span>
      </button>

    </div>

    <div class="post-divider"></div>

    <div class="post-actions">

      <button
        type="button"
        class="post-action like-btn ${isLiked ? 'active' : ''}"
        data-post-id="${escapeHTML(post.id)}"
        aria-pressed="${isLiked ? 'true' : 'false'}"
      >
        <i
          class="${isLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line'} action-icon"
          aria-hidden="true"
        ></i>

        <span>Like</span>

        <span class="action-count">
          ${likesCount}
        </span>
      </button>

      <button
        type="button"
        class="post-action comment-btn"
        data-post-id="${escapeHTML(post.id)}"
      >
        <i class="ri-chat-3-line action-icon" aria-hidden="true"></i>

        <span>Comment</span>

        <span class="action-count">
          ${commentsCount}
        </span>
      </button>

      <button
        type="button"
        class="post-action share-btn"
        data-post-id="${escapeHTML(post.id)}"
        aria-label="Share post"
      >
        <i class="ri-share-forward-line action-icon" aria-hidden="true"></i>
        <span>Share</span>
      </button>

    </div>
  `;

  /* -------------------------------------------------------
     LIKE
     ------------------------------------------------------- */

  const likeBtn = card.querySelector('.like-btn');

  likeBtn?.addEventListener('click', () => {
    onLike?.(post.id, likeBtn);
  });

  /* -------------------------------------------------------
     COMMENT
     ------------------------------------------------------- */

  const commentBtn = card.querySelector('.comment-btn');

  commentBtn?.addEventListener('click', () => {
    onComment?.(post.id);
  });

  const commentSummary = card.querySelector('.post-comment-summary');

  commentSummary?.addEventListener('click', () => {
    onComment?.(post.id);
  });

  /* -------------------------------------------------------
     AUTHOR
     ------------------------------------------------------- */

  const authorLink = card.querySelector('.post-author');

  authorLink?.addEventListener('click', (event) => {
    event.preventDefault();
    onAuthorClick?.(post.user_id);
  });

  /* -------------------------------------------------------
     DELETE
     ------------------------------------------------------- */

  const deleteBtn = card.querySelector('.delete-post');

  deleteBtn?.addEventListener('click', () => {
    const menu = card.querySelector('.post-menu');

    if (menu) {
      menu.removeAttribute('open');
    }

    onDelete?.(post.id);
  });

  /* -------------------------------------------------------
     EDIT
     ------------------------------------------------------- */

  const editBtn = card.querySelector('.edit-post');

  editBtn?.addEventListener('click', () => {
    const menu = card.querySelector('.post-menu');

    if (menu) {
      menu.removeAttribute('open');
    }

    onEdit?.(post.id);
  });

  /* -------------------------------------------------------
     SHARE
     ------------------------------------------------------- */

  const shareBtn = card.querySelector('.share-btn');

  shareBtn?.addEventListener('click', async () => {
    const url = `${window.location.origin}${appUrl(`post.html?id=${encodeURIComponent(post.id)}`)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${authorName}'s post`,
          text: post.content || 'Check out this post on SocialApp.',
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);

        const originalHTML = shareBtn.innerHTML;

        shareBtn.innerHTML = `
          <i class="ri-check-line action-icon" aria-hidden="true"></i>
          <span>Copied</span>
        `;

        setTimeout(() => {
          shareBtn.innerHTML = originalHTML;
        }, 1600);
      }
    } catch (error) {
      /*
       * Ignore AbortError because it means the user cancelled
       * the native share dialog.
       */
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  });

  return card;
}

export function normalizePost(post = {}) {
  const author = post.author || {};
  const userId = post.user_id ?? post.userId ?? author.id;
  const username = author.username || post.username;
  const name = author.displayName || author.display_name || author.name ||
    post.display_name || post.displayName || username || 'User';

  return {
    ...post,
    user_id: userId,
    created_at: post.created_at || post.createdAt,
    updated_at: post.updated_at || post.updatedAt,
    image_url: post.image_url || post.imageUrl,
    image_media_id: post.image_media_id || post.imageMediaId,
    likes_count: post.likes_count ?? post.likesCount,
    comments_count: post.comments_count ?? post.commentsCount,
    user_liked: post.user_liked ?? post.userLiked,
    author: {
      ...author,
      id: author.id ?? userId,
      name,
      username: username || 'user',
      avatarUrl: author.avatarUrl ?? author.avatar_url ?? post.avatarUrl ?? post.avatar_url,
      avatarMediaId: author.avatarMediaId ?? author.avatar_media_id ?? post.avatarMediaId ?? post.avatar_media_id
    }
  };
}