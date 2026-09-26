import { auth } from '../state/auth.js';
import { postsApi } from '../api/posts.api.js';
import { likesApi } from '../api/likes.api.js';
import { PostCard } from '../components/PostCard.js';
import { showToast } from '../main.js';
import { formatRelativeTime } from '../utils/format.js';

const feedContainer = document.getElementById('posts-feed');
const createPostContainer = document.getElementById('create-post');
let currentPage = 1;
let isLoading = false;
let hasMore = true;

function createPostForm() {
  const form = document.createElement('div');
  form.className = 'create-post';
  form.innerHTML = `
    <div class="create-post-header">
      <span class="avatar">${auth.user?.name?.[0] || auth.user?.username?.[0] || 'U'}</span>
      <textarea class="create-post-textarea" placeholder="What's on your mind?" rows="3"></textarea>
    </div>
    <div class="create-post-footer">
      <div class="create-post-actions">
        <button type="button" class="btn btn-ghost btn-sm" id="add-image-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          Image
        </button>
      </div>
      <button type="button" class="btn btn-primary" id="post-btn">Post</button>
    </div>
    <input type="file" id="image-input" accept="image/*" hidden>
  `;
  
  const textarea = form.querySelector('.create-post-textarea');
  const postBtn = form.querySelector('#post-btn');
  const imageInput = form.querySelector('#image-input');
  const addImageBtn = form.querySelector('#add-image-btn');
  
  addImageBtn.addEventListener('click', () => imageInput.click());
  
  postBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return;
    
    postBtn.disabled = true;
    postBtn.innerHTML = '<span class="loading-spinner"></span> Posting...';
    
    try {
      const response = await postsApi.create({ content });
      if (response.success) {
        textarea.value = '';
        showToast('Post created!', 'success');
        loadPosts(true);
      } else {
        showToast(response.error?.message || 'Failed to create post', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to create post', 'error');
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = 'Post';
    }
  });
  
  return form;
}

async function loadPosts(reset = false) {
  if (isLoading || (!reset && !hasMore)) return;
  
  isLoading = true;
  
  if (reset) {
    currentPage = 1;
    hasMore = true;
    feedContainer.innerHTML = '';
  }
  
  try {
    const response = await postsApi.list({ page: currentPage, limit: 10 });
    
    if (response.success && response.data) {
      const posts = response.data;
      const pagination = response.pagination;
      
      hasMore = pagination?.hasNext || false;
      currentPage++;
      
      if (reset && posts.length === 0) {
        feedContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3 class="empty-state-title">No posts yet</h3>
            <p class="empty-state-text">Be the first to share something!</p>
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
          onDelete: handleDelete,
          onAuthorClick: (userId) => window.location.href = `/profile.html?userId=${userId}`
        });
        feedContainer.appendChild(card);
      });
    }
  } catch (err) {
    showToast(err.message || 'Failed to load posts', 'error');
  } finally {
    isLoading = false;
  }
}

async function handleLike(postId, button) {
  const isLiked = button.classList.contains('active');
  const countEl = button.querySelector('.count');
  const currentCount = parseInt(countEl.textContent) || 0;
  
  button.classList.toggle('active');
  countEl.textContent = isLiked ? currentCount - 1 : currentCount + 1;
  
  const svg = button.querySelector('svg');
  svg.setAttribute('fill', isLiked ? 'none' : 'currentColor');
  
  try {
    if (isLiked) {
      await likesApi.unlike(postId);
    } else {
      await likesApi.like(postId);
    }
  } catch (err) {
    button.classList.toggle('active');
    countEl.textContent = currentCount;
    svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
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
      loadPosts(true);
    } else {
      showToast(response.error?.message || 'Failed to delete post', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete post', 'error');
  }
}

function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && hasMore) {
      loadPosts();
    }
  }, { rootMargin: '200px' });
  
  const sentinel = document.createElement('div');
  sentinel.id = 'load-sentinel';
  feedContainer.appendChild(sentinel);
  observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await auth.init();
  
  if (!authenticated) {
    window.location.href = '/login.html';
    return;
  }
  
  if (createPostContainer) {
    createPostContainer.appendChild(createPostForm());
  }
  
  await loadPosts(true);
  setupInfiniteScroll();
});