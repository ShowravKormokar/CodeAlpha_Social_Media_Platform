import { auth } from '../state/auth.js';
import { postsApi, commentsApi, likesApi } from '../api/index.js';
import { PostCard } from '../components/PostCard.js';
import { Comment } from '../components/Comment.js';
import { showToast } from '../main.js';
import { formatRelativeTime, getInitials } from '../utils/format.js';

const postDetailContainer = document.getElementById('post-detail');
const commentsSection = document.getElementById('comments-section');
let currentPost = null;
let commentsPage = 1;
let commentsLoading = false;
let commentsHasMore = true;

function getPostIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadPost() {
  const postId = getPostIdFromUrl();
  if (!postId) {
    showToast('Post not found', 'error');
    window.location.href = '/feed.html';
    return;
  }
  
  try {
    const response = await postsApi.get(postId);
    
    if (response.success && response.data) {
      currentPost = response.data;
      renderPost();
      loadComments(true);
    } else {
      showToast('Post not found', 'error');
      window.location.href = '/feed.html';
    }
  } catch (err) {
    showToast(err.message || 'Failed to load post', 'error');
    window.location.href = '/feed.html';
  }
}

function renderPost() {
  if (!currentPost) return;
  
  const isAuthor = auth.user && currentPost.user_id === auth.user.id;
  
  postDetailContainer.innerHTML = `
    <article class="post-card">
      <header class="post-header">
        <a href="/profile.html?userId=${currentPost.user_id}" class="post-author">
          <span class="avatar">${getInitials(currentPost.author?.name || currentPost.author?.username || 'U')}</span>
          <div>
            <span class="author-name">${currentPost.author?.name || currentPost.author?.username}</span>
            <div class="post-meta">@${currentPost.author?.username} • ${formatRelativeTime(currentPost.created_at)}</div>
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
              <button class="dropdown-item edit-post" data-post-id="${currentPost.id}" role="menuitem">Edit</button>
              <button class="dropdown-item danger delete-post" data-post-id="${currentPost.id}" role="menuitem">Delete</button>
            </div>
          </div>
        ` : ''}
      </header>
      
      <div class="post-content">${currentPost.content}</div>
      
      ${currentPost.image_url ? `<img src="${currentPost.image_url}" alt="" class="post-image">` : ''}
      
      <div class="post-divider"></div>
      
      <div class="post-actions">
        <button class="action-btn like-btn ${currentPost.user_liked ? 'active' : ''}" data-post-id="${currentPost.id}" aria-pressed="${currentPost.user_liked ? 'true' : 'false'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${currentPost.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 1 0 7.78L12 21.58 3.16 12.39a5.5 5.5 0 0 1 0-7.78 5.5 5.5 0 0 1 7.78 0L12 10.22l1.06-1.06a5.5 5.5 0 0 1 7.78 0z"></path>
          </svg>
          <span class="count">${currentPost.likes_count || 0}</span>
        </button>
        
        <button class="action-btn" disabled>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="count">${currentPost.comments_count || 0}</span>
        </button>
      </div>
    </article>
  `;
  
  const likeBtn = postDetailContainer.querySelector('.like-btn');
  likeBtn.addEventListener('click', () => handleLike(currentPost.id, likeBtn));
  
  const deleteBtn = postDetailContainer.querySelector('.delete-post');
  deleteBtn?.addEventListener('click', () => handleDelete(currentPost.id));
  
  const editBtn = postDetailContainer.querySelector('.edit-post');
  editBtn?.addEventListener('click', () => handleEdit(currentPost.id));
  
  const dropdown = postDetailContainer.querySelector('.dropdown');
  dropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
}

async function loadComments(reset = false) {
  if (!currentPost) return;
  if (commentsLoading || (!reset && !commentsHasMore)) return;
  
  commentsLoading = true;
  
  if (reset) {
    commentsPage = 1;
    commentsHasMore = true;
    commentsSection.innerHTML = renderCommentsHeader();
  }
  
  try {
    const response = await postsApi.getComments(currentPost.id, { page: commentsPage, limit: 20 });
    
    if (response.success && response.data) {
      const comments = response.data;
      const pagination = response.pagination;
      
      commentsHasMore = pagination?.hasNext || false;
      commentsPage++;
      
      const commentsList = commentsSection.querySelector('.comments-list');
      if (commentsList) {
        if (reset && comments.length === 0) {
          commentsList.innerHTML = `
            <div class="empty-state" style="padding: var(--spacing-xl);">
              <div class="empty-state-icon">💬</div>
              <h3 class="empty-state-title">No comments yet</h3>
              <p class="empty-state-text">Be the first to comment!</p>
            </div>
          `;
        } else {
          comments.forEach(comment => {
            const commentEl = Comment({
              comment,
              currentUser: auth.user,
              onDelete: handleDeleteComment,
              onUpdate: handleEditComment
            });
            commentsList.appendChild(commentEl);
          });
        }
      }
      
      if (commentsHasMore) {
        const loadMoreBtn = commentsSection.querySelector('#load-more-comments');
        if (loadMoreBtn) loadMoreBtn.hidden = false;
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to load comments', 'error');
  } finally {
    commentsLoading = false;
  }
}

function renderCommentsHeader() {
  return `
    <div class="comments-header">
      <h2>${currentPost?.comments_count || 0} Comments</h2>
    </div>
    <div class="comments-list"></div>
    <div class="comment-form-container">
      <form class="comment-form" id="comment-form">
        <span class="avatar avatar-sm">${auth.user?.name?.[0] || auth.user?.username?.[0] || 'U'}</span>
        <textarea class="comment-input" placeholder="Write a comment..." rows="1" required></textarea>
        <button type="submit" class="btn btn-primary btn-sm">Comment</button>
      </form>
    </div>
    <button id="load-more-comments" class="btn btn-ghost load-more" hidden>Load more comments</button>
  `;
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

async function handleDelete(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  
  try {
    const response = await postsApi.delete(postId);
    if (response.success) {
      showToast('Post deleted', 'success');
      window.location.href = '/feed.html';
    } else {
      showToast(response.error?.message || 'Failed to delete post', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete post', 'error');
  }
}

function handleEdit(postId) {
  const newContent = prompt('Edit your post:', currentPost.content);
  if (newContent && newContent !== currentPost.content) {
    updatePost(postId, newContent);
  }
}

async function updatePost(postId, content) {
  try {
    const response = await postsApi.update(postId, { content });
    if (response.success) {
      showToast('Post updated', 'success');
      loadPost();
    } else {
      showToast(response.error?.message || 'Failed to update post', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to update post', 'error');
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;
  
  try {
    const response = await commentsApi.delete(commentId);
    if (response.success) {
      showToast('Comment deleted', 'success');
      loadComments(true);
    } else {
      showToast(response.error?.message || 'Failed to delete comment', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete comment', 'error');
  }
}

function handleEditComment(commentId, currentContent) {
  const newContent = prompt('Edit your comment:', currentContent);
  if (newContent && newContent !== currentContent) {
    updateComment(commentId, newContent);
  }
}

async function updateComment(commentId, content) {
  try {
    const response = await commentsApi.update(commentId, { content });
    if (response.success) {
      showToast('Comment updated', 'success');
      loadComments(true);
    } else {
      showToast(response.error?.message || 'Failed to update comment', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to update comment', 'error');
  }
}

function setupCommentForm() {
  commentsSection.addEventListener('submit', async (e) => {
    if (e.target.id === 'comment-form') {
      e.preventDefault();
      const textarea = e.target.querySelector('.comment-input');
      const content = textarea.value.trim();
      if (!content) return;
      
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
      
      try {
        const response = await commentsApi.create(currentPost.id, { content });
        if (response.success) {
          textarea.value = '';
          textarea.style.height = 'auto';
          showToast('Comment posted', 'success');
          loadComments(true);
        } else {
          showToast(response.error?.message || 'Failed to post comment', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Failed to post comment', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Comment';
      }
    }
  });
  
  commentsSection.addEventListener('click', (e) => {
    if (e.target.id === 'load-more-comments') {
      loadComments();
    }
  });
}

function setupAutoResize() {
  commentsSection.addEventListener('input', (e) => {
    if (e.target.classList.contains('comment-input')) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await auth.init();
  if (!auth.user) {
    window.location.href = '/login.html';
    return;
  }
  
  await loadPost();
  setupCommentForm();
  setupAutoResize();
});