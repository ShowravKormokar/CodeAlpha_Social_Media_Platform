import { auth } from '../state/auth.js';
import { postsApi, commentsApi, likesApi } from '../api/index.js';
import { normalizePost } from '../components/PostCard.js';
import { Comment } from '../components/Comment.js';
import { showToast } from '../main.js';
import { formatRelativeTime, getInitials } from '../utils/format.js';
import { appUrl } from '../utils/routes.js';

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
    window.location.href = appUrl('feed.html');
    return;
  }

  try {
    const response = await postsApi.get(postId);

    if (response.success && response.data) {
      currentPost = normalizePost(response.data);
      renderPost();
      loadComments(true);
    } else {
      showToast('Post not found', 'error');
      window.location.href = appUrl('feed.html');
    }
  } catch (err) {
    showToast(err.message || 'Failed to load post', 'error');
    window.location.href = appUrl('feed.html');
  }
}

function renderPost() {
  if (!currentPost) return;

  const isAuthor =
    auth.user &&
    String(currentPost.user_id) === String(auth.user.id);

  const authorName =
    currentPost.author?.name ||
    currentPost.author?.username ||
    'User';

  const username =
    currentPost.author?.username ||
    'user';

  const avatar =
    getInitials(authorName);

  const likesCount =
    Number(currentPost.likes_count) || 0;

  const commentsCount =
    Number(currentPost.comments_count) || 0;

  const isLiked =
    Boolean(currentPost.user_liked);

  const content =
    String(currentPost.content || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');

  const edited =
    currentPost.updated_at &&
    currentPost.updated_at !== currentPost.created_at;

  postDetailContainer.innerHTML = `
    <article
      class="post-card post-detail-card"
      data-post-id="${currentPost.id}"
    >

      <header class="post-header">

        <a
          href="${appUrl(`profile.html?userId=${encodeURIComponent(currentPost.user_id)}`)}"
          class="post-author"
          aria-label="View ${authorName}'s profile"
        >

          <span
            class="avatar post-avatar"
            aria-hidden="true"
          >
            ${avatar}
          </span>

          <span class="post-author-info">

            <span class="post-author-name-row">
              <strong class="author-name">
                ${authorName}
              </strong>
            </span>

            <span class="post-meta">

              <span>
                @${username}
              </span>

              <span
                class="post-meta-dot"
                aria-hidden="true"
              >
                •
              </span>

              <time datetime="${currentPost.created_at}">
                ${formatRelativeTime(currentPost.created_at)}
              </time>

              ${edited
      ? `
                    <span class="post-edited">
                      Edited
                    </span>
                  `
      : ''
    }

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
                  <i
                    class="ri-more-2-fill"
                    aria-hidden="true"
                  ></i>
                </summary>

                <div
                  class="post-menu-dropdown"
                  role="menu"
                >

                  <button
                    type="button"
                    class="post-menu-item edit-post"
                    data-post-id="${currentPost.id}"
                    role="menuitem"
                  >
                    <i
                      class="ri-edit-line"
                      aria-hidden="true"
                    ></i>

                    <span>
                      Edit post
                    </span>
                  </button>

                  <button
                    type="button"
                    class="post-menu-item post-menu-item-danger delete-post"
                    data-post-id="${currentPost.id}"
                    role="menuitem"
                  >
                    <i
                      class="ri-delete-bin-6-line"
                      aria-hidden="true"
                    ></i>

                    <span>
                      Delete post
                    </span>
                  </button>

                </div>

              </details>
            `
      : ''
    }

      </header>


      <div class="post-body">

        <div class="post-content">
          ${content}
        </div>

        ${currentPost.image_url
      ? `
              <div class="post-media">

                <img
                  src="${currentPost.image_url}"
                  alt="Image shared by ${authorName}"
                  class="post-image"
                >

              </div>
            `
      : ''
    }

      </div>


      <div class="post-stats">

        <span class="post-stat">

          <i
            class="ri-heart-3-fill"
            aria-hidden="true"
          ></i>

          <span class="post-like-count">
            ${likesCount}
          </span>

          <span class="sr-only">
            likes
          </span>

        </span>


        <button
          type="button"
          class="post-comment-summary"
          aria-label="${commentsCount} comments"
        >
          ${commentsCount}
          <span>
            comment${commentsCount === 1 ? '' : 's'}
          </span>
        </button>

      </div>


      <div class="post-divider"></div>


      <div class="post-actions">

        <button
          type="button"
          class="post-action like-btn ${isLiked ? 'active' : ''}"
          aria-pressed="${isLiked ? 'true' : 'false'}"
        >

          <i
            class="${isLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line'} action-icon"
            aria-hidden="true"
          ></i>

          <span>
            Like
          </span>

          <span class="action-count">
            ${likesCount}
          </span>

        </button>


        <button
          type="button"
          class="post-action comment-btn"
        >

          <i
            class="ri-chat-3-line action-icon"
            aria-hidden="true"
          ></i>

          <span>
            Comment
          </span>

          <span class="action-count">
            ${commentsCount}
          </span>

        </button>


        <button
          type="button"
          class="post-action share-btn"
        >

          <i
            class="ri-share-forward-line action-icon"
            aria-hidden="true"
          ></i>

          <span>
            Share
          </span>

        </button>

      </div>

    </article>
  `;


  /* =====================================================
     LIKE
     ====================================================== */

  const likeBtn =
    postDetailContainer.querySelector('.like-btn');

  likeBtn?.addEventListener('click', () => {
    handleLike(currentPost.id, likeBtn);
  });


  /* =====================================================
     COMMENT
     ====================================================== */

  const commentBtn =
    postDetailContainer.querySelector('.comment-btn');

  commentBtn?.addEventListener('click', () => {
    document
      .querySelector('.comment-input')
      ?.focus();
  });


  const commentSummary =
    postDetailContainer.querySelector('.post-comment-summary');

  commentSummary?.addEventListener('click', () => {
    document
      .querySelector('.comment-input')
      ?.focus();
  });


  /* =====================================================
     AUTHOR
     ====================================================== */

  const authorLink =
    postDetailContainer.querySelector('.post-author');

  authorLink?.addEventListener('click', (event) => {
    event.preventDefault();

    window.location.href =
      appUrl(`profile.html?userId=${encodeURIComponent(currentPost.user_id)}`);
  });


  /* =====================================================
     DELETE
     ====================================================== */

  const deleteBtn =
    postDetailContainer.querySelector('.delete-post');

  deleteBtn?.addEventListener('click', () => {
    handleDelete(currentPost.id);
  });


  /* =====================================================
     EDIT
     ====================================================== */

  const editBtn =
    postDetailContainer.querySelector('.edit-post');

  editBtn?.addEventListener('click', () => {
    handleEdit(currentPost.id);
  });


  /* =====================================================
     SHARE
     ====================================================== */

  const shareBtn =
    postDetailContainer.querySelector('.share-btn');

  shareBtn?.addEventListener('click', async () => {
    const url =
      `${window.location.origin}${appUrl(`post.html?id=${encodeURIComponent(currentPost.id)}`)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${authorName}'s post`,
          text: currentPost.content || 'Check out this post.',
          url
        });

        return;
      }

      await navigator.clipboard.writeText(url);

      showToast(
        'Post link copied to clipboard.',
        'success'
      );
    } catch (error) {
      if (error?.name !== 'AbortError') {
        showToast(
          'Unable to share this post.',
          'error'
        );
      }
    }
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
  const count =
    Number(currentPost?.comments_count) || 0;

  return `
    <div class="comments-header">

      <div>
        <h2>
          Comments
          <span class="comments-count">
            ${count}
          </span>
        </h2>
      </div>

      <span class="comments-header-icon">
        <i
          class="ri-chat-3-line"
          aria-hidden="true"
        ></i>
      </span>

    </div>

    <div class="comments-list"></div>

    <div class="comment-form-container">

      <form
        class="comment-form"
        id="comment-form"
      >

        <span
          class="avatar avatar-sm"
          aria-hidden="true"
        >
          ${getInitials(
    auth.user?.name ||
    auth.user?.username ||
    'U'
  )}
        </span>

        <textarea
          class="comment-input"
          placeholder="Write a thoughtful comment..."
          rows="1"
          maxlength="1000"
          aria-label="Write a comment"
          required
        ></textarea>

        <button
          type="submit"
          class="btn btn-primary btn-sm"
        >
          <i
            class="ri-send-plane-2-line"
            aria-hidden="true"
          ></i>

          <span>Comment</span>
        </button>

      </form>

    </div>

    <button
      id="load-more-comments"
      class="btn btn-ghost load-more"
      type="button"
      hidden
    >
      <i
        class="ri-loader-2-line"
        aria-hidden="true"
      ></i>

      <span>Load more comments</span>
    </button>
  `;
}

async function handleLike(postId, button) {
  if (!button || button.disabled) return;

  const wasLiked =
    button.classList.contains('active');

  const countElements =
    postDetailContainer.querySelectorAll(
      '.action-count'
    );

  const likeCountElement =
    postDetailContainer.querySelector(
      '.post-like-count'
    );

  const currentCount =
    Number(
      likeCountElement?.textContent
    ) || 0;

  const nextCount =
    wasLiked
      ? Math.max(0, currentCount - 1)
      : currentCount + 1;


  /* -----------------------------------------------------
     Optimistic UI
     ----------------------------------------------------- */

  button.disabled = true;

  button.classList.toggle(
    'active',
    !wasLiked
  );

  button.setAttribute(
    'aria-pressed',
    String(!wasLiked)
  );

  const icon =
    button.querySelector('.action-icon');

  if (icon) {
    icon.className =
      `${!wasLiked
        ? 'ri-heart-3-fill'
        : 'ri-heart-3-line'
      } action-icon`;
  }

  if (likeCountElement) {
    likeCountElement.textContent =
      nextCount;
  }

  /*
   * Update the action button count too.
   */
  countElements.forEach((element) => {
    element.textContent =
      nextCount;
  });


  try {
    if (wasLiked) {
      await likesApi.unlike(postId);
    } else {
      await likesApi.like(postId);
    }

    currentPost.user_liked =
      !wasLiked;

    currentPost.likes_count =
      nextCount;

  } catch (err) {

    /* ---------------------------------------------------
       Rollback UI
       --------------------------------------------------- */

    button.classList.toggle(
      'active',
      wasLiked
    );

    button.setAttribute(
      'aria-pressed',
      String(wasLiked)
    );

    if (icon) {
      icon.className =
        `${wasLiked
          ? 'ri-heart-3-fill'
          : 'ri-heart-3-line'
        } action-icon`;
    }

    if (likeCountElement) {
      likeCountElement.textContent =
        currentCount;
    }

    countElements.forEach((element) => {
      element.textContent =
        currentCount;
    });

    showToast(
      err.message ||
      'Failed to update like.',
      'error'
    );

  } finally {
    button.disabled = false;
  }
}

async function handleDelete(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const response = await postsApi.delete(postId);
    if (response.success) {
      showToast('Post deleted', 'success');
      window.location.href = appUrl('feed.html');
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
    window.location.href = appUrl('login.html');
    return;
  }

  await loadPost();
  setupCommentForm();
  setupAutoResize();
});