import { createElement } from '../utils/dom.js';
import { formatRelativeTime } from '../utils/format.js';
import { appUrl } from '../utils/routes.js';
import { getAvatarMarkup } from '../utils/media.js';

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function Comment({ comment, currentUser, onDelete, onUpdate }) {
  const author = comment.author || {};
  const userId = comment.user_id ?? comment.userId ?? author.id;
  const username = author.username || comment.username || '';
  const authorName = author.displayName || author.display_name || author.name ||
    comment.display_name || comment.displayName || username || 'User';
  const avatar = getAvatarMarkup({
    name: authorName,
    mediaId: author.avatarMediaId || author.avatar_media_id || comment.avatar_media_id,
    fallbackUrl: author.avatarUrl || author.avatar_url || comment.avatar_url
  });
  const createdAt = comment.created_at || comment.createdAt;
  const content = comment.content || '';
  const isAuthor = currentUser && String(userId) === String(currentUser.id);

  const commentEl = createElement('article', { class: 'comment-item', 'data-comment-id': comment.id });

  commentEl.innerHTML = `
    <span class="comment-avatar avatar avatar-sm" aria-hidden="true">
      ${avatar}
    </span>
    <div class="comment-body">
      <div class="comment-header">
        <div class="comment-author-details">
          <a href="${appUrl(`profile.html?userId=${encodeURIComponent(userId || '')}`)}" class="comment-author">${escapeHTML(authorName)}</a>
          ${username ? `<span class="comment-username">@${escapeHTML(username)}</span>` : ''}
        </div>
        <time class="comment-time" datetime="${escapeHTML(createdAt || '')}">${escapeHTML(formatRelativeTime(createdAt))}</time>
      </div>
      <div class="comment-content">${escapeHTML(content).replace(/\n/g, '<br>')}</div>
      ${isAuthor ? `
        <div class="comment-actions">
          <button type="button" class="comment-action edit-comment" data-comment-id="${escapeHTML(comment.id)}">Edit</button>
          <button type="button" class="comment-action comment-action-danger delete-comment" data-comment-id="${escapeHTML(comment.id)}">Delete</button>
        </div>
      ` : ''}
    </div>
  `;

  commentEl.querySelector('.delete-comment')?.addEventListener('click', () => onDelete?.(comment.id));
  commentEl.querySelector('.edit-comment')?.addEventListener('click', () => onUpdate?.(comment.id, content));

  return commentEl;
}