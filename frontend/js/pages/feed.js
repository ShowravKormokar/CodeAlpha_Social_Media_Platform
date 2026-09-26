import { auth } from '../state/auth.js';
import { postsApi } from '../api/posts.api.js';
import { likesApi } from '../api/likes.api.js';
import { PostCard } from '../components/PostCard.js';
import { showToast } from '../main.js';


/* =========================================================
   DOM
   ========================================================= */

const feedContainer =
  document.getElementById(
    'posts-feed'
  );

const createPostContainer =
  document.getElementById(
    'create-post'
  );

const sidebarLeft =
  document.getElementById(
    'sidebar-left'
  );

const sidebarRight =
  document.getElementById(
    'sidebar-right'
  );

const refreshButton =
  document.getElementById(
    'feed-refresh-btn'
  );

const searchInput =
  document.getElementById(
    'feed-search'
  );

const searchClearButton =
  document.getElementById(
    'feed-search-clear'
  );

const feedSentinel =
  document.getElementById(
    'feed-sentinel'
  );

const feedLoading =
  document.getElementById(
    'feed-loading'
  );

const feedEnd =
  document.getElementById(
    'feed-end'
  );


/* =========================================================
   STATE
   ========================================================= */

let currentPage = 1;

let isLoading = false;

let hasMore = true;

let searchTerm = '';

let intersectionObserver = null;


/* =========================================================
   HELPERS
   ========================================================= */

function getInitial(user) {

  const value =
    user?.name ||
    user?.username ||
    'U';


  return value
    .charAt(0)
    .toUpperCase();
}


/* =========================================================
   HOME SIDEBARS
   ========================================================= */

function renderHomeSidebar() {

  const user =
    auth.user;


  if (sidebarLeft) {

    const name =
      user?.name ||
      user?.username ||
      'User';


    const username =
      user?.username
        ? `@${user.username}`
        : 'SocialApp member';


    sidebarLeft.innerHTML = `
      <section
        class="home-profile-card"
        aria-label="Your profile"
      >

        <div class="home-profile-top">

          <span class="avatar">
            ${getInitial(user)}
          </span>

          <div class="home-profile-info">

            <div class="home-profile-name">
              ${name}
            </div>

            <div class="home-profile-username">
              ${username}
            </div>

          </div>

        </div>


        <a
          href="/profile.html"
          class="home-profile-link"
        >
          View profile
        </a>

      </section>


      <nav
        class="home-side-nav"
        aria-label="Home sections"
      >

        <a
          href="/feed.html"
          class="home-side-link active"
          aria-current="page"
        >
          <i
            class="ri-home-5-line"
            aria-hidden="true"
          ></i>

          <span>Home</span>
        </a>


        <a
          href="/notifications.html"
          class="home-side-link"
        >
          <i
            class="ri-notification-3-line"
            aria-hidden="true"
          ></i>

          <span>Notifications</span>
        </a>


        <a
          href="/profile.html"
          class="home-side-link"
        >
          <i
            class="ri-user-3-line"
            aria-hidden="true"
          ></i>

          <span>Profile</span>
        </a>


        <a
          href="/settings.html"
          class="home-side-link"
        >
          <i
            class="ri-settings-3-line"
            aria-hidden="true"
          ></i>

          <span>Settings</span>
        </a>

      </nav>
    `;
  }


  if (sidebarRight) {

    sidebarRight.innerHTML = `

      <section
        class="home-panel"
        aria-label="Trending"
      >

        <div class="home-panel-title">

          <span>Trending</span>

          <i
            class="ri-fire-line"
            aria-hidden="true"
          ></i>

        </div>


        <a
          href="#"
          class="home-trend"
        >
          <div class="home-trend-label">
            Topic
          </div>

          <div class="home-trend-name">
            #WebDevelopment
          </div>
        </a>


        <a
          href="#"
          class="home-trend"
        >
          <div class="home-trend-label">
            Topic
          </div>

          <div class="home-trend-name">
            #JavaScript
          </div>
        </a>


        <a
          href="#"
          class="home-trend"
        >
          <div class="home-trend-label">
            Topic
          </div>

          <div class="home-trend-name">
            #Technology
          </div>
        </a>


        <a
          href="#"
          class="home-trend"
        >
          <div class="home-trend-label">
            Topic
          </div>

          <div class="home-trend-name">
            #Programming
          </div>
        </a>

      </section>


      <section
        class="home-panel"
        aria-label="Quick links"
      >

        <div class="home-panel-title">

          <span>Quick links</span>

          <i
            class="ri-links-line"
            aria-hidden="true"
          ></i>

        </div>


        <a
          href="/profile.html"
          class="home-quick-link"
        >
          <i
            class="ri-user-3-line"
            aria-hidden="true"
          ></i>

          <span>Your profile</span>
        </a>


        <a
          href="/notifications.html"
          class="home-quick-link"
        >
          <i
            class="ri-notification-3-line"
            aria-hidden="true"
          ></i>

          <span>Notifications</span>
        </a>


        <a
          href="/settings.html"
          class="home-quick-link"
        >
          <i
            class="ri-settings-3-line"
            aria-hidden="true"
          ></i>

          <span>Account settings</span>
        </a>

      </section>

    `;
  }
}


/* =========================================================
   CREATE POST
   ========================================================= */

function createPostForm() {

  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'create-post';


  wrapper.innerHTML = `

    <div class="create-post-header">

      <span class="avatar">
        ${getInitial(auth.user)}
      </span>


      <div class="create-post-body">

        <textarea
          class="create-post-textarea"
          placeholder="What's on your mind?"
          rows="3"
          maxlength="5000"
          aria-label="Create a post"
        ></textarea>

      </div>

    </div>


    <div class="create-post-footer">

      <div class="create-post-actions">

        <button
          type="button"
          class="create-post-action"
          id="add-image-btn"
        >

          <i
            class="ri-image-line"
            aria-hidden="true"
          ></i>

          <span>Image</span>

        </button>

      </div>


      <button
        type="button"
        class="create-post-button"
        id="post-btn"
      >

        <span>Post</span>

        <i
          class="ri-send-plane-2-line"
          aria-hidden="true"
        ></i>

      </button>

    </div>

  `;


  const textarea =
    wrapper.querySelector(
      '.create-post-textarea'
    );


  const postButton =
    wrapper.querySelector(
      '#post-btn'
    );


  const imageButton =
    wrapper.querySelector(
      '#add-image-btn'
    );


  /* =======================================================
     IMAGE
     ======================================================= */

  imageButton.addEventListener(
    'click',
    () => {

      showToast(
        'Image uploads are not connected to the current post API yet.',
        'info'
      );
    }
  );


  /* =======================================================
     SUBMIT
     ======================================================= */

  postButton.addEventListener(
    'click',
    async () => {

      const content =
        textarea.value.trim();


      if (!content) {

        textarea.focus();

        showToast(
          'Write something before posting.',
          'error'
        );

        return;
      }


      if (content.length > 5000) {

        showToast(
          'Your post is too long.',
          'error'
        );

        return;
      }


      postButton.disabled =
        true;


      postButton.innerHTML = `
        <span>Posting...</span>

        <span class="feed-spinner"></span>
      `;


      try {

        const response =
          await postsApi.create({
            content
          });


        if (response.success) {

          textarea.value = '';

          showToast(
            'Post created successfully.',
            'success'
          );


          await loadPosts(
            true
          );

        } else {

          showToast(
            response.error?.message ||
            'Failed to create post.',
            'error'
          );
        }

      } catch (error) {

        showToast(
          error.message ||
          'Failed to create post.',
          'error'
        );

      } finally {

        postButton.disabled =
          false;


        postButton.innerHTML = `
          <span>Post</span>

          <i
            class="ri-send-plane-2-line"
            aria-hidden="true"
          ></i>
        `;
      }
    }
  );


  /* =======================================================
     CTRL / CMD + ENTER
     ======================================================= */

  textarea.addEventListener(
    'keydown',
    (event) => {

      if (
        event.key === 'Enter' &&
        (event.ctrlKey || event.metaKey)
      ) {

        event.preventDefault();

        postButton.click();
      }
    }
  );


  return wrapper;
}


/* =========================================================
   LOADING UI
   ========================================================= */

function setFeedLoading(
  loading,
  initial = false
) {

  isLoading =
    loading;


  if (feedLoading) {

    feedLoading.hidden =
      !loading;

    if (initial) {

      feedLoading.innerHTML = `
        <span class="feed-spinner"></span>
        <span>Loading your feed...</span>
      `;
    } else {

      feedLoading.innerHTML = `
        <span class="feed-spinner"></span>
        <span>Loading more posts...</span>
      `;
    }
  }
}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setRefreshLoading(
  loading
) {

  if (!refreshButton) {
    return;
  }


  refreshButton.disabled =
    loading;


  refreshButton.classList.toggle(
    'is-refreshing',
    loading
  );
}


/* =========================================================
   END STATE
   ========================================================= */

function updateEndState() {

  if (!feedEnd) {
    return;
  }


  const hasPosts =
    feedContainer.children.length > 0;


  feedEnd.hidden =
    !hasPosts ||
    hasMore ||
    isLoading ||
    searchTerm.length > 0;
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function renderEmptyState() {

  feedContainer.innerHTML = `
    <div class="feed-empty">

      <div class="feed-empty-icon">

        <i
          class="ri-quill-pen-line"
          aria-hidden="true"
        ></i>

      </div>

      <h3>No posts yet</h3>

      <p>
        Be the first to share something
        with the community.
      </p>

    </div>
  `;
}


/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts(
  reset = false
) {

  if (
    isLoading ||
    (
      !reset &&
      !hasMore
    )
  ) {

    return;
  }


  if (reset) {

    currentPage =
      1;

    hasMore =
      true;

    feedContainer.innerHTML =
      '';

    if (feedEnd) {
      feedEnd.hidden =
        true;
    }
  }


  setFeedLoading(
    true,
    reset
  );


  try {

    const response =
      await postsApi.list({
        page: currentPage,
        limit: 10
      });


    if (
      !response.success ||
      !response.data
    ) {

      throw new Error(
        response.error?.message ||
        'Failed to load posts.'
      );
    }


    const posts =
      response.data;


    const pagination =
      response.pagination;


    hasMore =
      Boolean(
        pagination?.hasNext
      );


    currentPage++;


    if (
      reset &&
      posts.length === 0
    ) {

      renderEmptyState();

      return;
    }


    posts.forEach(
      (post) => {

        const card =
          PostCard({
            post,

            currentUser:
              auth.user,

            onLike:
              handleLike,

            onComment:
              handleComment,

            onDelete:
              handleDelete,

            onAuthorClick:
              (userId) => {

                window.location.href =
                  `/profile.html?userId=${userId}`;
              }
          });


        feedContainer.appendChild(
          card
        );
      }
    );


    applySearch();


  } catch (error) {

    showToast(
      error.message ||
      'Failed to load posts.',
      'error'
    );

  } finally {

    setFeedLoading(
      false
    );


    updateEndState();
  }
}


/* =========================================================
   LIKE
   ========================================================= */

async function handleLike(
  postId,
  button
) {

  const isLiked =
    button.classList.contains(
      'active'
    );


  const countEl =
    button.querySelector(
      '.count'
    );


  const currentCount =
    parseInt(
      countEl?.textContent,
      10
    ) || 0;


  button.classList.toggle(
    'active'
  );


  if (countEl) {

    countEl.textContent =
      Math.max(
        0,
        isLiked
          ? currentCount - 1
          : currentCount + 1
      );
  }


  const icon =
    button.querySelector(
      'i'
    );


  if (icon) {

    icon.className =
      isLiked
        ? 'ri-heart-line'
        : 'ri-heart-fill';
  }


  try {

    if (isLiked) {

      await likesApi.unlike(
        postId
      );

    } else {

      await likesApi.like(
        postId
      );
    }

  } catch (error) {

    button.classList.toggle(
      'active'
    );


    if (countEl) {

      countEl.textContent =
        currentCount;
    }


    if (icon) {

      icon.className =
        isLiked
          ? 'ri-heart-fill'
          : 'ri-heart-line';
    }


    showToast(
      error.message ||
      'Failed to update like.',
      'error'
    );
  }
}


/* =========================================================
   COMMENT
   ========================================================= */

function handleComment(
  postId
) {

  window.location.href =
    `/post.html?id=${postId}`;
}


/* =========================================================
   DELETE
   ========================================================= */

async function handleDelete(
  postId
) {

  const confirmed =
    window.confirm(
      'Are you sure you want to delete this post?'
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await postsApi.delete(
        postId
      );


    if (response.success) {

      showToast(
        'Post deleted.',
        'success'
      );


      await loadPosts(
        true
      );

    } else {

      showToast(
        response.error?.message ||
        'Failed to delete post.',
        'error'
      );
    }

  } catch (error) {

    showToast(
      error.message ||
      'Failed to delete post.',
      'error'
    );
  }
}


/* =========================================================
   SEARCH
   ========================================================= */

function applySearch() {

  const normalized =
    searchTerm
      .trim()
      .toLowerCase();


  const cards =
    feedContainer.querySelectorAll(
      '.post-card'
    );


  let visibleCount =
    0;


  cards.forEach(
    (card) => {

      const content =
        card.textContent
          .toLowerCase();


      const matches =
        !normalized ||
        content.includes(
          normalized
        );


      card.classList.toggle(
        'is-search-hidden',
        !matches
      );


      if (matches) {
        visibleCount++;
      }
    }
  );


  feedContainer.classList.toggle(
    'searching',
    Boolean(normalized)
  );


  if (
    normalized &&
    cards.length > 0 &&
    visibleCount === 0
  ) {

    let empty =
      feedContainer.querySelector(
        '.feed-search-empty'
      );


    if (!empty) {

      empty =
        document.createElement(
          'div'
        );

      empty.className =
        'feed-empty feed-search-empty';


      empty.innerHTML = `
        <div class="feed-empty-icon">

          <i
            class="ri-search-line"
            aria-hidden="true"
          ></i>

        </div>

        <h3>No matching posts</h3>

        <p>
          Try a different search term.
        </p>
      `;


      feedContainer.appendChild(
        empty
      );
    }

  } else {

    feedContainer
      .querySelector(
        '.feed-search-empty'
      )
      ?.remove();
  }


  if (searchClearButton) {

    searchClearButton.hidden =
      !normalized;
  }


  updateEndState();
}


/* =========================================================
   SEARCH LISTENERS
   ========================================================= */

function setupSearch() {

  if (!searchInput) {
    return;
  }


  searchInput.addEventListener(
    'input',
    () => {

      searchTerm =
        searchInput.value;

      applySearch();
    }
  );


  searchClearButton?.addEventListener(
    'click',
    () => {

      searchInput.value =
        '';

      searchTerm =
        '';

      applySearch();

      searchInput.focus();
    }
  );
}


/* =========================================================
   REFRESH
   ========================================================= */

function setupRefresh() {

  refreshButton?.addEventListener(
    'click',
    async () => {

      if (isLoading) {
        return;
      }


      setRefreshLoading(
        true
      );


      try {

        await loadPosts(
          true
        );

      } finally {

        setRefreshLoading(
          false
        );
      }
    }
  );
}


/* =========================================================
   INFINITE SCROLL
   ========================================================= */

function setupInfiniteScroll() {

  if (!feedSentinel) {
    return;
  }


  intersectionObserver?.disconnect();


  intersectionObserver =
    new IntersectionObserver(
      (entries) => {

        const entry =
          entries[0];


        if (
          entry.isIntersecting &&
          !isLoading &&
          hasMore
        ) {

          loadPosts();
        }
      },
      {
        root: null,

        rootMargin:
          '500px 0px',

        threshold:
          0
      }
    );


  intersectionObserver.observe(
    feedSentinel
  );
}


/* =========================================================
   KEYBOARD SHORTCUT
   ========================================================= */

function setupKeyboardShortcuts() {

  document.addEventListener(
    'keydown',
    (event) => {

      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {

        event.preventDefault();

        searchInput?.focus();
      }
    }
  );
}


/* =========================================================
   INIT
   ========================================================= */

async function initFeed() {

  const authenticated =
    await auth.init();


  if (!authenticated) {

    window.location.href =
      '/login.html';

    return;
  }


  renderHomeSidebar();


  if (createPostContainer) {

    createPostContainer.replaceChildren(
      createPostForm()
    );
  }


  setupSearch();

  setupRefresh();

  setupInfiniteScroll();

  setupKeyboardShortcuts();


  await loadPosts(
    true
  );
}


document.addEventListener(
  'DOMContentLoaded',
  initFeed
);