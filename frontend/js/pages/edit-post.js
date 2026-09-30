import { auth } from '../state/auth.js';
import { postsApi } from '../api/posts.api.js';
import { showToast } from '../main.js';
import { normalizePost } from '../components/PostCard.js';
import { appUrl } from '../utils/routes.js';
import { getAvatarMarkup } from '../utils/media.js';


/* =========================================================
   CONSTANTS
   ========================================================= */

/* Must match `content: z.string().min(1).max(5000)` in
   backend/src/modules/posts/post.routes.js */
const MAX_CONTENT_LENGTH = 5000;

/* Characters left before the content becomes invalid. */
const WARNING_THRESHOLD = 200;

/* Pages the user is allowed to be returned to after saving.
   Anything else falls back to the feed. This allowlist is what
   keeps the `from` query parameter from becoming an open
   redirect to an arbitrary URL. */
const ALLOWED_RETURN_PAGES = ['feed.html', 'profile.html', 'post.html'];

const DEFAULT_RETURN_PAGE = 'feed.html';


/* =========================================================
   DOM
   ========================================================= */

const root = document.getElementById('edit-post-root');


/* =========================================================
   STATE
   ========================================================= */

let postId = null;

let originalContent = '';

let isSaving = false;

let isDirty = false;


/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Resolves the page the user should return to once they are
 * done editing. The value arrives from the URL, so it is
 * validated against an allowlist of known pages.
 */
function getReturnPage() {
  const raw = new URLSearchParams(window.location.search).get('from') || '';

  const [pathname, query] = raw.split('?');

  const file = String(pathname).replace(/^\/+/, '');

  if (!ALLOWED_RETURN_PAGES.includes(file)) {
    return { file: DEFAULT_RETURN_PAGE, params: new URLSearchParams() };
  }

  /*
   * Rebuild the query from its decoded parts instead of trusting
   * the raw string. Only plain key/value pairs survive; anything
   * with separators or control characters is dropped. The result
   * is re-encoded by URLSearchParams, so no injection survives.
   */
  const params = new URLSearchParams();

  new URLSearchParams(query || '').forEach((value, key) => {
    const safeKey = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key);
    const safeValue = /^[a-zA-Z0-9._~%+-]*$/.test(value);

    if (safeKey && safeValue) {
      params.set(key, value);
    }
  });

  /*
   * `post.html` and `profile.html` are identified by a query
   * parameter. If that parameter was stripped, the page would
   * load without its subject, so fall back to the feed instead.
   */
  const requiredKey = {
    'post.html': 'id',
    'profile.html': 'userId'
  }[file];

  if (requiredKey && !params.get(requiredKey)) {
    return { file: DEFAULT_RETURN_PAGE, params: new URLSearchParams() };
  }

  return { file, params };
}

function buildReturnUrl(extra = {}) {
  const { file, params } = getReturnPage();

  Object.entries(extra).forEach(([key, value]) => {
    params.set(key, value);
  });

  const search = params.toString();

  return appUrl(`${file}${search ? `?${search}` : ''}`);
}

function redirectToReturn(extra = {}) {
  window.location.href = buildReturnUrl(extra);
}

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* =========================================================
   RENDERING
   ========================================================= */

function renderError({ icon, title, text, showBack = true }) {
  root.innerHTML = `
    <section class="edit-post-card">
      <div class="edit-post-status">
        <span class="edit-post-status-icon is-error" aria-hidden="true">
          <i class="${icon}"></i>
        </span>

        <h1 class="edit-post-status-title">${escapeHTML(title)}</h1>

        <p class="edit-post-status-text">${escapeHTML(text)}</p>

        ${showBack
      ? `
              <button
                type="button"
                class="btn btn-secondary edit-post-btn"
                id="back-btn"
              >
                <i class="ri-arrow-left-line" aria-hidden="true"></i>
                <span>Go back</span>
              </button>
            `
      : ''
    }
      </div>
    </section>
  `;

  root.querySelector('#back-btn')
    ?.addEventListener('click', () => {
      redirectToReturn();
    });
}

function renderForm(post) {
  const authorName =
    post.author?.name ||
    post.author?.username ||
    'User';

  const username =
    post.author?.username ||
    'user';

  root.innerHTML = `
    <section class="edit-post-card">

      <div class="edit-post-header">
        <span class="edit-post-header-icon" aria-hidden="true">
          <i class="ri-edit-line"></i>
        </span>

        <div>
          <h1 class="edit-post-title">Edit post</h1>
          <p class="edit-post-subtitle">
            Changes are visible to everyone who can see this post.
          </p>
        </div>
      </div>

      <div class="edit-post-author">
        <span class="avatar" aria-hidden="true">
          ${getAvatarMarkup({
    name: authorName,
    mediaId: post.author?.avatarMediaId || post.author?.avatar_media_id,
    fallbackUrl: post.author?.avatarUrl || post.author?.avatar_url
  })}
        </span>

        <div>
          <div class="edit-post-author-name">${escapeHTML(authorName)}</div>
          <div class="edit-post-author-username">@${escapeHTML(username)}</div>
        </div>
      </div>

      <form class="edit-post-form" id="edit-post-form" novalidate>

        <label class="sr-only" for="edit-post-content">Post content</label>

        <textarea
          class="edit-post-textarea"
          id="edit-post-content"
          name="content"
          rows="8"
          maxlength="${MAX_CONTENT_LENGTH}"
          placeholder="What's on your mind?"
          aria-describedby="edit-post-error edit-post-counter"
        ></textarea>

        <p class="edit-post-error" id="edit-post-error" role="alert"></p>

        <div class="edit-post-meta">
          <span class="edit-post-hint">
            <i class="ri-shortcut-line" aria-hidden="true"></i>
            <span>Ctrl + Enter to save</span>
          </span>

          <span class="edit-post-counter" id="edit-post-counter"></span>
        </div>

        <div class="edit-post-actions">

          <button
            type="button"
            class="btn btn-secondary edit-post-btn"
            id="cancel-btn"
          >
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            class="btn btn-primary edit-post-btn"
            id="save-btn"
          >
            <i class="ri-save-3-line" aria-hidden="true"></i>
            <span>Save changes</span>
          </button>

        </div>

      </form>

    </section>
  `;

  const form = root.querySelector('#edit-post-form');
  const textarea = root.querySelector('#edit-post-content');
  const counter = root.querySelector('#edit-post-counter');
  const saveBtn = root.querySelector('#save-btn');
  const cancelBtn = root.querySelector('#cancel-btn');

  textarea.value = originalContent;

  bindForm({ form, textarea, counter, saveBtn, cancelBtn });

  textarea.focus();

  // Place the caret at the end so editing continues naturally.
  textarea.setSelectionRange(
    textarea.value.length,
    textarea.value.length
  );
}


/* =========================================================
   FORM BEHAVIOUR
   ========================================================= */

function setError(message = '') {
  const errorEl = root.querySelector('#edit-post-error');

  if (errorEl) {
    errorEl.textContent = message;
  }
}

function updateCounter(textarea, counter) {
  const length = textarea.value.length;

  const remaining = MAX_CONTENT_LENGTH - length;

  counter.textContent = `${length} / ${MAX_CONTENT_LENGTH}`;

  counter.classList.toggle(
    'is-warning',
    remaining <= WARNING_THRESHOLD && remaining > 0
  );

  counter.classList.toggle(
    'is-error',
    remaining <= 0
  );
}

function isSubmittable(textarea) {
  const value = textarea.value.trim();

  return (
    value.length > 0 &&
    value.length <= MAX_CONTENT_LENGTH &&
    !isSaving
  );
}

function updateSaveState(textarea, saveBtn) {
  const canSave = isSubmittable(textarea);
  const changed = textarea.value !== originalContent;

  saveBtn.disabled = !canSave || !changed;

  if (!changed && !isSaving) {
    saveBtn.title = 'No changes to save yet';
  } else {
    saveBtn.title = '';
  }
}

function setSaving(saving) {
  isSaving = saving;

  const saveBtn = root.querySelector('#save-btn');
  const cancelBtn = root.querySelector('#cancel-btn');
  const textarea = root.querySelector('#edit-post-content');

  if (!saveBtn) {
    return;
  }

  saveBtn.disabled = saving;
  saveBtn.innerHTML = saving
    ? `
        <span class="edit-post-spinner" aria-hidden="true"></span>
        <span>Saving...</span>
      `
    : `
        <i class="ri-save-3-line" aria-hidden="true"></i>
        <span>Save changes</span>
      `;

  if (cancelBtn) {
    cancelBtn.disabled = saving;
  }

  if (textarea) {
    textarea.disabled = saving;
  }
}

function bindForm({
  form,
  textarea,
  counter,
  saveBtn,
  cancelBtn
}) {

  updateCounter(textarea, counter);
  updateSaveState(textarea, saveBtn);

  isDirty = false;


  /* =======================================================
     TYPING
     ======================================================= */

  textarea.addEventListener('input', () => {
    isDirty = textarea.value !== originalContent;

    setError();
    updateCounter(textarea, counter);
    updateSaveState(textarea, saveBtn);
  });


  /* =======================================================
     CTRL / CMD + ENTER
     ======================================================= */

  textarea.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter' &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      form.requestSubmit();
    }
  });


  /* =======================================================
     SUBMIT
     ======================================================= */

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const content = textarea.value.trim();

    if (!content) {
      setError('A post cannot be empty.');
      textarea.focus();
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setError(
        `Your post is too long. Keep it under ${MAX_CONTENT_LENGTH} characters.`
      );
      textarea.focus();
      return;
    }

    if (content === originalContent) {
      return;
    }


    setError();
    setSaving(true);


    try {
      const response = await postsApi.update(
        postId,
        { content }
      );

      if (!response.success) {
        throw new Error(
          response.error?.message ||
          'Failed to update post.'
        );
      }

      // The API is the source of truth, so adopt whatever it
      // stored (it may normalise the value).
      originalContent = response.data?.content ?? content;
      isDirty = false;

      redirectToReturn({ edited: '1' });

    } catch (error) {
      setSaving(false);
      updateSaveState(textarea, saveBtn);

      // The session may have expired while the page was open.
      if (error?.status === 401) {
        showToast(
          'Your session expired. Please sign in again.',
          'error'
        );
        window.location.href = appUrl('login.html');
        return;
      }

      const message =
        error?.message ||
        'Failed to update post.';

      setError(message);

      showToast(message, 'error');
    }
  });


  /* =======================================================
     CANCEL
     ======================================================= */

  cancelBtn?.addEventListener('click', () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'Discard your unsaved changes?'
      );

      if (!confirmed) {
        return;
      }
    }

    isDirty = false;
    redirectToReturn();
  });


  /* =======================================================
     UNSAVED CHANGES ON TAB CLOSE
     ======================================================= */

  window.addEventListener('beforeunload', (event) => {
    if (!isDirty || isSaving) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  });
}


/* =========================================================
   LOAD
   ========================================================= */

async function loadPost() {
  const params = new URLSearchParams(window.location.search);

  const rawId = params.get('id');

  if (!rawId) {
    renderError({
      icon: 'ri-error-warning-line',
      title: 'Post not found',
      text: 'No post was specified, so there is nothing to edit.'
    });
    return;
  }

  try {
    const response = await postsApi.get(rawId);

    if (!response.success || !response.data) {
      throw new Error(
        response?.error?.message ||
        'This post could not be loaded.'
      );
    }

    const post = normalizePost(response.data);

    /* ----------------------------------------------------
       OWNERSHIP
       ----------------------------------------------------
       The backend rejects updates from non-owners with 403.
       Checking here avoids rendering an editor that could
       never succeed.
       ---------------------------------------------------- */

    if (String(post.user_id) !== String(auth.user?.id)) {
      renderError({
        icon: 'ri-lock-2-line',
        title: 'You cannot edit this post',
        text: 'Only the author of a post can edit it.'
      });
      return;
    }

    postId = post.id;
    originalContent = post.content ?? '';

    renderForm(post);

  } catch (error) {
    const isForbidden = error?.status === 403;

    renderError({
      icon: isForbidden
        ? 'ri-lock-2-line'
        : 'ri-error-warning-line',
      title: isForbidden
        ? 'You cannot edit this post'
        : 'Unable to load post',
      text: error?.message ||
        'This post could not be loaded.'
    });
  }
}


/* =========================================================
   INIT
   ========================================================= */

async function initEditPost() {
  const authenticated = await auth.init();

  if (!authenticated || !auth.user) {
    window.location.href = appUrl('login.html');
    return;
  }

  await loadPost();
}

document.addEventListener(
  'DOMContentLoaded',
  initEditPost
);
