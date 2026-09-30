import { createElement } from '../utils/dom.js';
import { mediaApi } from '../api/media.api.js';
import {
  getMediaConfig,
  formatBytes,
  validateImageFile,
  extractImageFile,
  readImageDimensions,
  describeMediaError
} from '../utils/media.js';
import { showToast } from '../main.js';

/**
 * Upload states.
 *
 * An explicit state machine is used instead of a set of booleans so
 * impossible combinations (uploading + enabled submit button,
 * success + live progress bar) cannot be represented.
 *
 *   idle ─select─▶ preview ─confirm─▶ uploading ─sent─▶ processing
 *     ▲               │                  │                 │
 *     │               │                  └──────┬──────────┘
 *     │               │                         ▼
 *     └──── remove ───┘                      success
 *                     │                         │ done
 *        (bad file)    ▼                         ▼
 *                   error ◀────── fail ──────────┘
 *                     │
 *                     └──── retry ────▶ uploading
 */
const STATES = Object.freeze({
  IDLE: 'idle',
  PREVIEW: 'preview',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error'
});

/** States where an upload is in flight and closing must be blocked. */
const BUSY_STATES = [STATES.UPLOADING, STATES.PROCESSING];

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const CLOSE_ANIMATION_MS = 200;

/** Only one upload dialog exists at a time. */
let openInstance = null;

/**
 * Reusable image upload modal.
 *
 * One component serves every media purpose: `mediaType` supplies the
 * copy, limits and preview shape. The component uploads the file and
 * hands the resulting media record to `onUploaded`. It never mutates
 * profile or post state itself, so Phase 03 stays free to decide what
 * to do with the uploaded media.
 *
 * @param {object} options
 * @param {'profile_avatar'|'profile_banner'|'post_image'} options.mediaType
 * @param {string} [options.title]          overrides the config title
 * @param {string} [options.description]    overrides the config description
 * @param {string} [options.initialContent] initial post description
 * @param {(payload: object) => Promise<object>} [options.onPost] creates a post from the modal
 * @param {Function} [options.onPosted]     called after a post is created
 * @param {(media: object) => void} [options.onUploaded]  fired once the backend confirms success
 * @param {() => void} [options.onCancel]   fired when the user dismisses without uploading
 * @param {() => void} [options.onClose]    fired after the dialog is removed
 * @returns {{ element: HTMLElement, open: Function, close: Function, isOpen: Function }}
 */
export function ImageUploadModal(options = {}) {
  const { mediaType } = options;

  const config = getMediaConfig(mediaType);

  if (!config) {
    throw new Error(`ImageUploadModal: unsupported mediaType "${mediaType}"`);
  }

  const postComposer = typeof options.onPost === 'function';
  const modal = buildModal({
    mediaType,
    config,
    postComposer,
    initialContent: options.initialContent || ''
  });

  modal.callbacks = {
    onUploaded: options.onUploaded,
    onPost: options.onPost,
    onPosted: options.onPosted,
    onCancel: options.onCancel,
    onClose: options.onClose
  };

  modal.setCopy({
    title: options.title || config.title,
    description: options.description || config.description
  });

  return modal;
}

/* =========================================================
 * MODAL
 * ========================================================= */

function buildModal({ mediaType, config, postComposer, initialContent }) {
  const uid = `${mediaType}-${Math.random().toString(36).slice(2, 8)}`;
  const titleId = `upload-title-${uid}`;
  const descriptionId = `upload-description-${uid}`;
  const statusId = `upload-status-${uid}`;
  const errorId = `upload-error-${uid}`;

  /* ---------------------------------------------------------
     INSTANCE STATE
     --------------------------------------------------------- */

  let state = STATES.IDLE;
  let selectedFile = null;
  let previewUrl = null;
  let dimensions = null;
  let uploadedMedia = null;
  let creatingPost = false;
  let errorMessage = '';
  let progressPercent = 0;
  let abortController = null;
  let destroyed = false;
  let triggerElement = null;
  let dragDepth = 0;

  /* ---------------------------------------------------------
     SHELL
     --------------------------------------------------------- */

  const overlay = document.createElement('div');
  overlay.className = 'upload-overlay';
  overlay.hidden = true;

  const dialog = createElement('div', {
    class: `upload-dialog upload-dialog--${config.previewShape}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId,
    tabindex: '-1'
  });

  const titleEl = createElement('h2', { class: 'upload-dialog-title', id: titleId });
  const closeIcon = icon('ri-close-line');
  const closeButton = createElement('button', {
    type: 'button',
    class: 'upload-dialog-close',
    'aria-label': 'Close upload dialog'
  });
  closeButton.appendChild(closeIcon);

  const header = createElement('div', { class: 'upload-dialog-header' });
  header.append(titleEl, closeButton);

  const descriptionEl = createElement('p', {
    class: 'upload-dialog-description',
    id: descriptionId
  });

  const postDescription = postComposer
    ? createElement('textarea', {
      class: 'upload-post-description',
      rows: '4',
      maxlength: '5000',
      'aria-label': 'Post description',
      placeholder: 'Write your post description…'
    })
    : null;

  const postDescriptionField = postComposer
    ? createElement('label', { class: 'upload-post-description-field' })
    : null;

  if (postComposer) {
    postDescription.value = initialContent;
    postDescriptionField.append(
      createElement('span', { class: 'upload-post-description-label' }, 'Post description'),
      postDescription
    );
  }

  /* ---------------------------------------------------------
     IDLE PANEL — DROPZONE
     --------------------------------------------------------- */

  const fileInput = createElement('input', {
    type: 'file',
    class: 'sr-only',
    id: `upload-input-${uid}`,
    accept: config.accept,
    tabindex: '-1'
  });
  // The input is opened programmatically from the buttons below, so it
  // is removed from the tab order instead of becoming an unreachable
  // focus stop for keyboard users.

  // A real <button> so mouse, keyboard and screen readers all work
  // without extra role/tabindex/key handling.
  const dropzone = createElement('button', {
    type: 'button',
    class: 'upload-dropzone',
    'aria-describedby': descriptionId
  });

  const dropIcon = icon(config.icon, 'upload-dropzone-icon');
  const dropTitle = createElement('span', { class: 'upload-dropzone-title' }, 'Drag & drop an image here');
  const dropHint = createElement('span', { class: 'upload-dropzone-hint' }, 'or click to browse');
  const dropMeta = createElement('span', { class: 'upload-dropzone-meta' },
    `JPG, PNG or WebP · up to ${formatBytes(config.maxFileSize)}`);

  dropzone.append(dropIcon, dropTitle, dropHint, dropMeta);

  const idlePanel = createElement('div', { class: 'upload-panel upload-panel--idle' });
  idlePanel.append(dropzone, fileInput, ratioNote(config));

  /* ---------------------------------------------------------
     PREVIEW PANEL
     --------------------------------------------------------- */

  const previewImage = createElement('img', { class: 'upload-preview-image', alt: '' });
  const previewFrame = createElement('div', { class: 'upload-preview-frame' });
  previewFrame.appendChild(previewImage);

  const fileNameValue = createElement('dd', { class: 'upload-file-name' });
  const fileSizeValue = createElement('dd', { class: 'upload-file-size' });
  const dimensionsValue = createElement('dd', { class: 'upload-file-dimensions' });

  const metaList = createElement('dl', { class: 'upload-file-meta' });
  metaList.append(
    metaRow('File', fileNameValue),
    metaRow('Size', fileSizeValue),
    metaRow('Dimensions', dimensionsValue)
  );

  const previewPanel = createElement('div', { class: 'upload-panel upload-panel--preview' });
  previewPanel.append(previewFrame, metaList, ratioNote(config));

  /* ---------------------------------------------------------
     PROGRESS PANEL — determinate + indeterminate
     --------------------------------------------------------- */

  const progressStatus = createElement('p', {
    class: 'upload-progress-status',
    id: statusId,
    role: 'status',
    'aria-live': 'polite'
  });

  const progressBar = createElement('div', { class: 'upload-progress-bar' });

  const progressTrack = createElement('div', {
    class: 'upload-progress-track',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
    'aria-labelledby': statusId
  });
  progressTrack.appendChild(progressBar);

  const progressPercentLabel = createElement('span', { class: 'upload-progress-percent' }, '0%');

  const spinner = createElement('span', { class: 'upload-spinner' });
  spinner.setAttribute('aria-hidden', 'true');

  const progressBody = createElement('div', { class: 'upload-progress-body' });
  progressBody.append(progressStatus, progressTrack, progressPercentLabel);

  const progressPanel = createElement('div', { class: 'upload-panel upload-panel--progress' });
  progressPanel.append(spinner, progressBody);

  /* ---------------------------------------------------------
     SUCCESS PANEL
     --------------------------------------------------------- */

  const successImage = createElement('img', { class: 'upload-result-image', alt: '' });
  const successFrame = createElement('div', { class: 'upload-result-frame' });
  successFrame.appendChild(successImage);

  const successDetail = createElement('p', { class: 'upload-result-detail' });
  const successTitle = createElement(
    'p',
    { class: 'upload-result-title' },
    postComposer ? 'Post published' : 'Image uploaded successfully'
  );

  const successPanel = createElement('div', { class: 'upload-panel upload-panel--success' });
  successPanel.append(
    icon('ri-checkbox-circle-fill', 'upload-result-icon upload-result-icon--success'),
    successFrame,
    successTitle,
    successDetail
  );

  /* ---------------------------------------------------------
     ERROR PANEL
     --------------------------------------------------------- */

  const errorMessageEl = createElement('p', {
    class: 'upload-result-message',
    id: errorId,
    role: 'alert'
  });

  const errorPanel = createElement('div', { class: 'upload-panel upload-panel--error' });
  errorPanel.append(
    icon('ri-error-warning-fill', 'upload-result-icon upload-result-icon--error'),
    createElement('p', { class: 'upload-result-title' }, postComposer ? 'Post not published' : 'Upload failed'),
    errorMessageEl
  );

  /* ---------------------------------------------------------
     BODY + FOOTER
     --------------------------------------------------------- */

  const body = createElement('div', { class: 'upload-dialog-body' });
  body.append(idlePanel, previewPanel, progressPanel, successPanel, errorPanel);
  if (postDescriptionField) {
    body.appendChild(postDescriptionField);
  }

  const footer = createElement('div', { class: 'upload-dialog-footer' });

  const cancelButton = createElement('button', { type: 'button', class: 'btn btn-secondary' }, 'Cancel');
  const browseButton = button('btn btn-primary', 'ri-folder-open-line', 'Browse files');
  const uploadButton = button('btn btn-primary', 'ri-upload-cloud-2-line', 'Upload');
  const retryButton = button('btn btn-primary', 'ri-refresh-line', 'Retry');
  const reselectButton = createElement('button', { type: 'button', class: 'btn btn-secondary' }, 'Choose another image');
  const postButton = postComposer
    ? button('btn btn-primary', 'ri-send-plane-2-line', 'Post')
    : null;
  const busyButton = button('btn btn-primary', 'ri-loader-4-line', 'Uploading…');
  const busyButtonLabel = busyButton.lastChild;
  busyButton.disabled = true;

  dialog.append(header, descriptionEl, body, footer);
  overlay.appendChild(dialog);

  /* ---------------------------------------------------------
     PANEL MAP
     --------------------------------------------------------- */

  const panels = {
    [STATES.IDLE]: idlePanel,
    [STATES.PREVIEW]: previewPanel,
    [STATES.UPLOADING]: progressPanel,
    [STATES.PROCESSING]: progressPanel,
    [STATES.SUCCESS]: successPanel,
    [STATES.ERROR]: errorPanel
  };

  /* ---------------------------------------------------------
     RENDER
     --------------------------------------------------------- */

  function render() {
    if (destroyed) return;

    dialog.dataset.state = state;

    Object.entries(panels).forEach(([panelState, panel]) => {
      panel.hidden = panelState !== state;
    });

    const uploading = state === STATES.UPLOADING;
    const processing = state === STATES.PROCESSING;

    dialog.classList.toggle('is-busy', uploading || processing);

    // Uploading and processing share a panel; only the copy and the
    // determinate/indeterminate treatment differ.
    progressTrack.hidden = processing;
    progressPercentLabel.hidden = processing;
    spinner.hidden = !processing;

    if (uploading) {
      progressStatus.textContent = 'Uploading image';
      progressTrack.setAttribute('aria-valuenow', String(progressPercent));
      progressTrack.setAttribute('aria-valuetext', `${progressPercent} percent uploaded`);
      progressBar.style.width = `${progressPercent}%`;
      progressPercentLabel.textContent = `${progressPercent}%`;
    }

    if (processing) {
      progressStatus.textContent = creatingPost
        ? 'Publishing your post…'
        : 'Checking and preparing image…';
      progressBar.style.width = '100%';
      busyButtonLabel.textContent = postComposer
        ? (creatingPost ? 'Publishing…' : 'Checking image…')
        : 'Processing…';
    } else if (uploading) {
      busyButtonLabel.textContent = 'Uploading…';
    }

    if (state === STATES.ERROR) {
      errorMessageEl.textContent = errorMessage;
    }

    renderFooter();
  }

  function renderFooter() {
    footer.replaceChildren();

    if (state === STATES.IDLE) {
      footer.append(cancelButton, postComposer ? postButton : browseButton);
      return;
    }

    if (state === STATES.PREVIEW) {
      footer.append(cancelButton, postComposer ? postButton : uploadButton);
      return;
    }

    if (state === STATES.UPLOADING || state === STATES.PROCESSING) {
      // Disabled rather than hidden so the footer does not reflow
      // mid-upload; a disabled control also explains itself.
      cancelButton.disabled = true;
      footer.append(cancelButton, busyButton);
      return;
    }

    if (state === STATES.SUCCESS) {
      return;
    }

    cancelButton.disabled = false;
    footer.append(reselectButton, retryButton);
  }

  /* ---------------------------------------------------------
     FILE SELECTION
     --------------------------------------------------------- */

  function openFilePicker() {
    if (isBusy()) return;

    // Reset first so selecting the same file twice still fires change.
    fileInput.value = '';
    fileInput.click();
  }

  function handleFile(file) {
    if (!file || isBusy()) return;

    releasePreview();
    selectedFile = null;
    uploadedMedia = null;

    const result = validateImageFile(file, mediaType);

    if (!result.valid) {
      errorMessage = result.message;
      setState(STATES.ERROR);
      // Stays inline rather than becoming a toast: it is feedback
      // about the dialog the user is currently looking at.
      return;
    }

    selectedFile = file;
    errorMessage = '';
    progressPercent = 0;

    // One object URL per selection, revoked on every change and on
    // teardown. Leaking these pins the whole file in memory.
    previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    previewImage.alt = `Preview of ${file.name}`;

    setState(STATES.PREVIEW);

    renderFileMeta();

    readImageDimensions(previewUrl).then((result) => {
      if (destroyed || selectedFile !== file) return;
      dimensions = result;
      renderFileMeta();
    });
  }

  function renderFileMeta() {
    if (!selectedFile) return;

    // textContent, never innerHTML: the filename is user-controlled.
    fileNameValue.textContent = selectedFile.name;
    fileNameValue.title = selectedFile.name;
    fileSizeValue.textContent = formatBytes(selectedFile.size);
    dimensionsValue.textContent = dimensions
      ? `${dimensions.width} × ${dimensions.height}`
      : 'Reading…';
  }

  function releasePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    previewImage.removeAttribute('src');
  }

  function reset() {
    abortUpload();
    releasePreview();

    selectedFile = null;
    uploadedMedia = null;
    dimensions = null;
    errorMessage = '';
    progressPercent = 0;
    fileInput.value = '';

    setState(STATES.IDLE);
    focusFirst();
  }

  /* ---------------------------------------------------------
     UPLOAD
     --------------------------------------------------------- */

  function isBusy() {
    return BUSY_STATES.includes(state);
  }

  async function uploadSelectedFile() {
    if (!selectedFile || isBusy()) return null;

    errorMessage = '';
    progressPercent = 0;
    abortController = new AbortController();
    setState(STATES.UPLOADING);

    try {
      const media = await mediaApi.upload(selectedFile, mediaType, {
        signal: abortController.signal,
        onProgress: (percent) => {
          if (state !== STATES.UPLOADING) return;
          progressPercent = percent;
          render();
        },
        onRequestSent: () => {
          if (state !== STATES.UPLOADING) return;
          setState(STATES.PROCESSING);
        }
      });

      return destroyed ? null : media;
    } catch (error) {
      if (destroyed) return null;

      errorMessage = describeMediaError(error, mediaType);
      setState(STATES.ERROR);

      if (error?.code === 'UNAUTHORIZED' || error?.code === 'TOKEN_EXPIRED') {
        showToast('Your session expired. Please sign in again.', 'error');
      }

      return null;
    } finally {
      abortController = null;
    }
  }

  async function startUpload() {
    if (postComposer) {
      await submitPost();
      return;
    }

    const media = await uploadSelectedFile();
    if (!media || destroyed) return;

    successDetail.textContent = `${media.width} × ${media.height} · ${formatBytes(media.sizeBytes)}`;
    successImage.src = mediaApi.getContentUrl(media.id);
    successImage.alt = `${config.label} uploaded`;

    setState(STATES.SUCCESS);
    instance.callbacks?.onUploaded?.(media);
    close({ cancelled: false });
  }

  async function submitPost() {
    if (!postComposer || isBusy() || destroyed) return;

    const content = postDescription.value.trim();
    if (!content) {
      showToast('Write a description before posting.', 'error');
      postDescription.focus();
      return;
    }

    errorMessage = '';

    if (!uploadedMedia && selectedFile) {
      uploadedMedia = await uploadSelectedFile();
      if (!uploadedMedia || destroyed) return;
    }

    creatingPost = true;
    setState(STATES.PROCESSING);

    try {
      const response = await instance.callbacks.onPost({
        content,
        media: uploadedMedia
      });

      if (response?.success === false) {
        throw new Error(response.error?.message || 'Failed to create post.');
      }

      if (destroyed) return;

      setState(STATES.SUCCESS);
      close({ cancelled: false });
      instance.callbacks?.onPosted?.({ content, media: uploadedMedia, response });
    } catch (error) {
      if (destroyed) return;

      errorMessage = uploadedMedia
        ? `Image uploaded, but the post was not created. ${error.message || 'Retry to publish it.'}`
        : error.message || 'Failed to create post.';
      setState(STATES.ERROR);
    } finally {
      creatingPost = false;
    }
  }

  function abortUpload() {
    if (!abortController) return;
    abortController.abort();
    abortController = null;
  }

  /* ---------------------------------------------------------
     FOCUS MANAGEMENT
     --------------------------------------------------------- */

  function focusables() {
    return Array.from(dialog.querySelectorAll(FOCUSABLE))
      .filter((element) => !element.hidden && element.offsetParent !== null);
  }

  function focusFirst() {
    const candidates = focusables();
    (candidates[0] || dialog).focus();
  }

  /**
   * Keeps Tab inside the dialog. Without this, keyboard users tab out
   * of a visually blocking modal into a page they cannot see.
   */
  function trapFocus(event) {
    if (event.key !== 'Tab') return;

    const candidates = focusables();

    if (candidates.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = candidates[0];
    const last = candidates[candidates.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }

    trapFocus(event);
  }

  function rememberFocus() {
    triggerElement = document.activeElement;
  }

  function restoreFocus() {
    if (triggerElement && typeof triggerElement.focus === 'function') {
      triggerElement.focus();
    }
  }

  /* ---------------------------------------------------------
     OPEN / CLOSE
     --------------------------------------------------------- */

  // Declared here rather than inline in the return literal so open(),
  // close() and requestClose() can all reference the same handle.
  const instance = {
    callbacks: null,
    element: overlay,
    open: null,
    close: null,
    isOpen: () => !destroyed,
    getState: () => state,
    setCopy({ title: nextTitle, description: nextDescription }) {
      titleEl.textContent = nextTitle;
      descriptionEl.textContent = nextDescription;
    }
  };

  function open() {
    // Only one dialog at a time, so two object URLs and two focus
    // traps can never coexist.
    if (openInstance && openInstance !== instance) {
      openInstance.close();
    }
    openInstance = instance;

    rememberFocus();

    // Locks background scroll while the dialog is open, restoring the
    // exact scroll position on close.
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    overlay.hidden = false;
    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleKeydown, true);

    window.requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      focusFirst();
    });
  }

  function requestClose() {
    // Blocks an accidental backdrop click or Escape from discarding an
    // upload that is already running.
    if (isBusy()) return;

    close({ cancelled: true });
  }

  function close({ cancelled = false } = {}) {
    if (destroyed || isBusy()) return;

    destroyed = true;

    abortUpload();
    releasePreview();

    document.removeEventListener('keydown', handleKeydown, true);

    const lockedTop = parseInt(document.body.style.top || '0', 10) || 0;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';

    overlay.classList.remove('is-open');

    if (cancelled) {
      instance.callbacks?.onCancel?.();
    }

    window.setTimeout(() => {
      overlay.remove();

      if (openInstance === instance) {
        openInstance = null;
      }

      restoreFocus();
      instance.callbacks?.onClose?.();
    }, prefersReducedMotion() ? 0 : CLOSE_ANIMATION_MS);

    // The scroll lock is lifted immediately so the page does not feel
    // frozen during the fade-out.
    if (lockedTop !== 0) {
      window.scrollTo(0, Math.abs(lockedTop));
    }
  }

  /* ---------------------------------------------------------
     EVENTS
     --------------------------------------------------------- */

  dropzone.addEventListener('click', openFilePicker);

  fileInput.addEventListener('change', () => {
    handleFile(fileInput.files?.[0]);
  });

  reselectButton.addEventListener('click', reset);
  browseButton.addEventListener('click', openFilePicker);
  cancelButton.addEventListener('click', requestClose);
  closeButton.addEventListener('click', requestClose);
  uploadButton.addEventListener('click', startUpload);
  retryButton.addEventListener('click', startUpload);
  postButton?.addEventListener('click', submitPost);

  // A backdrop click only counts when the press both began and ended on
  // the backdrop, so a text selection dragged outside does not close it.
  let backdropPress = false;

  overlay.addEventListener('mousedown', (event) => {
    backdropPress = event.target === overlay;
  });

  overlay.addEventListener('click', (event) => {
    const shouldClose = backdropPress && event.target === overlay;
    backdropPress = false;

    if (shouldClose) {
      requestClose();
    }
  });

  /* ---------------------------------------------------------
     DRAG AND DROP
     --------------------------------------------------------- */

  // dragenter/dragleave fire for every child element, so a naive toggle
  // flickers as the pointer crosses children. Counting depth keeps the
  // highlight stable for the whole drag gesture.
  const acceptsDrop = () => state === STATES.IDLE;

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    if (!acceptsDrop()) return;

    dragDepth += 1;
    dropzone.classList.add('is-dragover');
  });

  dropzone.addEventListener('dragover', (event) => {
    // Required, otherwise the browser navigates to the dropped file.
    event.preventDefault();
    if (!acceptsDrop()) return;

    event.dataTransfer.dropEffect = 'copy';
  });

  dropzone.addEventListener('dragleave', (event) => {
    event.preventDefault();

    dragDepth = Math.max(0, dragDepth - 1);

    if (dragDepth === 0) {
      dropzone.classList.remove('is-dragover');
    }
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepth = 0;
    dropzone.classList.remove('is-dragover');

    if (!acceptsDrop()) return;

    handleFile(extractImageFile(event.dataTransfer));
  });

  // Swallows drops that miss the dropzone but land on the dialog, which
  // would otherwise let the browser navigate to the file.
  overlay.addEventListener('dragover', (event) => event.preventDefault());
  overlay.addEventListener('drop', (event) => event.preventDefault());

  dialog.addEventListener('paste', (event) => {
    if (!acceptsDrop()) return;

    const file = extractImageFile(event.clipboardData);

    if (file) {
      event.preventDefault();
      handleFile(file);
    }
  });

  /* ---------------------------------------------------------
     PUBLIC INTERFACE
     --------------------------------------------------------- */

  function setState(next) {
    state = next;
    render();
  }

  instance.open = open;
  instance.close = close;

  // Applies the initial state to the DOM before the dialog is ever
  // shown. Without this every panel would be visible for the first
  // frame, because panels are only hidden by render().
  render();

  return instance;
}

/* =========================================================
 * HELPERS
 * ========================================================= */

function icon(className, extraClass = '') {
  const element = document.createElement('i');
  element.className = extraClass ? `${className} ${extraClass}` : className;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function button(className, iconClass, label) {
  const element = createElement('button', { type: 'button', class: className });
  element.append(icon(iconClass), document.createTextNode(` ${label}`));
  return element;
}

function metaRow(label, valueNode) {
  const group = createElement('div', { class: 'upload-file-meta-row' });
  const term = createElement('dt', { class: 'upload-file-meta-label' }, label);

  group.append(term, valueNode);
  return group;
}

function ratioNote(config) {
  const note = createElement('p', { class: 'upload-ratio-note' });
  note.append(icon('ri-aspect-ratio-line'), document.createTextNode(` ${config.hint}`));
  return note;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
