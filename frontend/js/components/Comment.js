import { createElement } from '../utils/dom.js';
import { formatRelativeTime, getInitials } from '../utils/format.js';

export function Comment({ comment, currentUser, onDelete, onUpdate }) {
  const isAuthor = currentUser && comment.user_id === currentUser.id;
  
  const commentEl = createElement('div', { class: 'comment-item', 'data-comment-id': comment.id });
  
  commentEl.innerHTML = `
    <span class="comment-avatar">
      <span class="avatar avatar-sm">${getInitials(comment.author?.name || comment.author?.username || 'U')}</span>
    </span>
    <div class="comment-body">
      <div class="comment-header">
        <a href="/profile.html?userId=${comment.user_id}" class="comment-author">${comment.author?.name || comment.author?.username}</a>
        <time class="comment-time" datetime="${comment.created_at}">${formatRelativeTime(comment.created_at)}</time>
      </div>
      <div class="comment-content">${comment.content}</div>
      ${isAuthor ? `
        <div class="comment-actions" style="margin-top: var(--spacing-xs);">
          <button class="btn btn-ghost btn-sm edit-comment" data-comment-id="${comment.id}">Edit</button>
          <button class="btn btn-ghost btn-sm danger delete-comment" data-comment-id="${comment.id}">Delete</button>
        </div>
      ` : ''}
    </div>
  `;
  
  commentEl.querySelector('.delete-comment')?.addEventListener('click', () => onDelete?.(comment.id));
  commentEl.querySelector('.edit-comment')?.addEventListener('click', () => onUpdate?.(comment.id, comment.content));
  
  return commentEl;
}