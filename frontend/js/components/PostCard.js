import { createElement } from '../utils/dom.js';
import { formatRelativeTime, getInitials } from '../utils/format.js';

export function PostCard({ post, currentUser, onLike, onComment, onDelete, onAuthorClick }) {
  const card = createElement('article', { class: 'post-card' });
  
  const isAuthor = currentUser && post.user_id === currentUser.id;
  
  card.innerHTML = `
    <header class="post-header">
      <a href="/profile.html?userId=${post.user_id}" class="post-author" data-author-id="${post.user_id}">
        <span class="avatar">${getInitials(post.author?.name || post.author?.username || 'U')}</span>
        <div>
          <span class="author-name">${post.author?.name || post.author?.username}</span>
          <div class="post-meta">@${post.author?.username} • ${formatRelativeTime(post.created_at)}</div>
        </div>
      </a>
      ${isAuthor ? `
        <div class="dropdown" style="margin-left: auto;">
          <button class="btn btn-ghost" aria-label="Post options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
          <div class="dropdown-menu" role="menu">
            <button class="dropdown-item edit-post" data-post-id="${post.id}" role="menuitem">Edit</button>
            <button class="dropdown-item danger delete-post" data-post-id="${post.id}" role="menuitem">Delete</button>
          </div>
        </div>
      ` : ''}
    </header>
    
    <div class="post-content">${post.content}</div>
    
    ${post.image_url ? `<img src="${post.image_url}" alt="" class="post-image">` : ''}
    
    <div class="post-divider"></div>
    
    <div class="post-actions">
      <button class="action-btn like-btn ${post.user_liked ? 'active' : ''}" data-post-id="${post.id}" aria-pressed="${post.user_liked ? 'true' : 'false'}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${post.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 1 0 7.78L12 21.58 3.16 12.39a5.5 5.5 0 0 1 0-7.78 5.5 5.5 0 0 1 7.78 0L12 10.22l1.06-1.06a5.5 5.5 0 0 1 7.78 0z"></path>
        </svg>
        <span class="count">${post.likes_count || 0}</span>
      </button>
      
      <button class="action-btn comment-btn" data-post-id="${post.id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="count">${post.comments_count || 0}</span>
      </button>
    </div>
  `;
  
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', () => onLike?.(post.id, likeBtn));
  
  const commentBtn = card.querySelector('.comment-btn');
  commentBtn.addEventListener('click', () => onComment?.(post.id));
  
  const authorLink = card.querySelector('.post-author');
  authorLink.addEventListener('click', (e) => {
    e.preventDefault();
    onAuthorClick?.(post.user_id);
  });
  
  const deleteBtn = card.querySelector('.delete-post');
  deleteBtn?.addEventListener('click', () => onDelete?.(post.id));
  
  const editBtn = card.querySelector('.edit-post');
  editBtn?.addEventListener('click', () => onEdit?.(post.id));
  
  const dropdown = card.querySelector('.dropdown');
  dropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  
  return card;
}