import { ApiError } from './client.js';

/**
 * Media API.
 *
 * Uploads use XMLHttpRequest because the Fetch API still has no
 * portable upload-progress event. Everything else — base URL,
 * credentials, and the error shape — matches the conventions in
 * `client.js` so no other page has to know XHR is involved.
 *
 * `POST /api/v1/media` is the only endpoint used in Phase 02. Sending
 * the file and owning it are deliberately separate: this module only
 * uploads and returns the media record. Persisting that reference onto
 * a profile or post is Phase 03's job.
 */

const UPLOAD_TIMEOUT_MS = 120000;

export const mediaApi = {
  /**
   * Uploads one image and resolves with the created media record.
   *
   * @param {File} file
   * @param {string} mediaType  profile_avatar | profile_banner | post_image
   * @param {object} [options]
   * @param {(percent: number) => void} [options.onProgress]
   * @param {() => void} [options.onRequestSent]  fires once bytes are sent and the server is working
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<object>} the media record from the API envelope
   */
  upload(file, mediaType, options = {}) {
    const {
      onProgress,
      onRequestSent,
      signal
    } = options;

    const baseURL =
      window.APP_CONFIG?.apiBaseUrl || 'http://localhost:5000/api/v1';

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new ApiError('Upload cancelled', 0, 'CANCELLED'));
        return;
      }

      const formData = new FormData();
      formData.append('mediaType', mediaType);
      formData.append('file', file, file.name);

      const request = new XMLHttpRequest();

      // Auth is cookie-based via `credentials: 'include'`, matching
      // every other call in the app. Ownership comes from the JWT and
      // is never sent as a field.
      request.open('POST', `${baseURL}/media`, true);
      request.withCredentials = true;
      request.timeout = UPLOAD_TIMEOUT_MS;

      // Content-Type is intentionally NOT set. The browser must add the
      // multipart boundary itself; setting it manually breaks parsing.
      let settled = false;

      const cleanup = () => {
        signal?.removeEventListener?.('abort', handleAbort);
      };

      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const succeed = (data) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(data);
      };

      function handleAbort() {
        request.abort();
        fail(new ApiError('Upload cancelled', 0, 'CANCELLED'));
      }

      signal?.addEventListener?.('abort', handleAbort, { once: true });

      request.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress?.(percent);
      });

      // All bytes are on the wire. The server now decodes, resizes and
      // re-encodes with Sharp, which can take a moment and has no
      // progress channel — hence a separate, indeterminate UI state.
      request.upload.addEventListener('load', () => {
        onProgress?.(100);
        onRequestSent?.();
      });

      request.addEventListener('load', () => {
        let payload = null;

        try {
          payload = JSON.parse(request.responseText);
        } catch {
          payload = null;
        }

        if (request.status >= 200 && request.status < 300) {
          if (!payload?.data) {
            fail(new ApiError('The server returned an unexpected response', request.status, 'INVALID_RESPONSE'));
            return;
          }
          succeed(payload.data);
          return;
        }

        fail(
          new ApiError(
            payload?.error?.message || 'Upload failed',
            request.status,
            payload?.error?.code || 'UPLOAD_FAILED',
            payload?.error?.details
          )
        );
      });

      request.addEventListener('error', () => {
        fail(new ApiError('Network error', 0, 'NETWORK_ERROR'));
      });

      request.addEventListener('timeout', () => {
        fail(new ApiError('The upload timed out', 0, 'TIMEOUT'));
      });

      request.addEventListener('abort', () => {
        fail(new ApiError('Upload cancelled', 0, 'CANCELLED'));
      });

      request.send(formData);
    });
  },

  /**
   * Absolute URL for a stored image, served through the Phase 01
   * content endpoint. The API returns a relative `/uploads/...` path;
   * the browser actually needs the content endpoint.
   */
  getContentUrl(mediaId) {
    const baseURL =
      window.APP_CONFIG?.apiBaseUrl || 'http://localhost:5000/api/v1';

    return `${baseURL}/media/${encodeURIComponent(mediaId)}/content`;
  }
};
