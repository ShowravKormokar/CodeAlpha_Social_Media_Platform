# Image Upload & Media Management Plan

## Goal

Build a secure, maintainable MVP image system for:

- Profile picture
- Profile banner
- Post image

Initial storage: local filesystem  
Future storage: S3 / Cloudflare R2 / similar object storage

Core stack:

- Express.js
- Multer
- Sharp
- PostgreSQL
- Vanilla HTML/CSS/JavaScript

---

## Phase 01 — Secure Media Foundation

Build the backend media infrastructure.

- Create reusable media/upload module.
- Multer with strict size limits and controlled memory/disk handling.
- Accept only JPEG, PNG, and WebP.
- Validate actual file type, not only extension/MIME header.
- Process images through Sharp.
- Re-encode images to safe WebP/JPEG.
- Strip metadata.
- Generate UUID-based storage keys.
- Generate resized variants where appropriate.
- Store files outside executable/source directories.
- Create `media` database table for metadata.
- Store `storage_key`, MIME type, size, dimensions, owner, media type.
- Implement authenticated upload endpoint.
- Validate ownership and upload purpose.
- Add centralized upload configuration/constants.
- Never trust original filename or client-provided MIME type.
- Never store image binary in PostgreSQL.

Result:

```text
Client
  ↓
Multer
  ↓
Validation
  ↓
Sharp processing
  ↓
Safe generated file
  ↓
Local Storage
  ↓
PostgreSQL metadata
```

### Phase 01 — Implementation Notes

Status: **complete**.

#### Architecture

The module follows the existing layered conventions used by the other
`src/modules/*` packages (controller → service → repository), with two
media-specific additions: a Sharp processor and a storage abstraction.

```text
src/modules/media/
├── media.constants.js             media types, format whitelists, per-purpose limits
├── media.routes.js                router + storage-provider registration
├── media.controller.js            thin HTTP layer
├── media.service.js               orchestration, ownership, cleanup
├── media.repository.js            `media` table access
├── media.validation.js            body schema + storage-key / size assertions
├── media.processor.js             Sharp decode → validate → resize → strip → re-encode
├── media.upload.js                centralised Multer config (memory storage)
├── media.storage.js               StorageProvider interface, registry, key builder
└── local-storage.provider.js      LocalStorageProvider (Phase 01 implementation)
```

Upload flow, matching the actual route middleware order:

```text
HTTP POST /api/v1/media (multipart/form-data)
  ↓
authMiddleware            JWT cookie or Bearer → req.user.id
  ↓
singleImageUpload         Multer, memory storage, global size cap, MIME pre-filter
  ↓
handleUploadErrors        MulterError → AppError
  ↓
mediaController.upload    reads mediaType from the body, never owner
  ↓
mediaService.upload       body schema + ownership rejection + per-purpose size cap
  ↓
processImage              Sharp decode, real-format check, resize, metadata strip, re-encode
  ↓
LocalStorageProvider.put  writes the server-generated UUID key
  ↓
MediaRepository.create    metadata row only, no binary
  ↓
successResponse           metadata + public URL, no filesystem path
```

#### Supported media

| Purpose          | Max dimensions | Max size | Output format |
| ---------------- | -------------- | -------- | ------------- |
| `profile_avatar` | 1024 × 1024    | 2 MB     | WebP          |
| `profile_banner` | 1920 × 1080    | 5 MB     | WebP          |
| `post_image`     | 1920 × 1920    | 8 MB     | WebP          |

Accepted **input** formats: JPEG, PNG, WebP. Anything else — including
SVG, GIF, PDF, HTML, and arbitrary or executable files — is rejected.
Aspect ratio is always preserved; no cropping is applied in this phase.
The limits live in `media.constants.js` and are configurable rather than
hardcoded in any controller.

#### Storage abstraction

```text
StorageProvider (interface)
    ├── LocalStorageProvider   Phase 01, registered in media.routes.js
    └── S3/R2StorageProvider  future
```

The service, repository and API contract only ever pass and persist the
`storage_key`. Absolute filesystem paths never cross the provider
boundary. Migrating to S3/R2 means registering a second implementation
and setting `MEDIA_STORAGE_PROVIDER`; no business logic changes.

Storage keys are entirely server-generated:

```text
<media_type>/<year>/<month>/<uuid>.<ext>
```

#### Database relationship

Migration `016_create_media.sql` creates the `media_type` enum and the
`media` table: `id`, `owner_id` (FK → `users`, cascade delete),
`media_type`, `storage_provider`, `storage_key`, `original_filename`
(audit only, never used as a path), `original_mime_type`, `mime_type`,
`size_bytes`, `width`, `height`, `created_at`, `updated_at`. It is
indexed on owner, owner + type, and creation time, and reuses the
existing `set_updated_at()` trigger.

PostgreSQL stores metadata only — no image binary is ever written to the
database.

`profiles.avatar_url`, `profiles.cover_url`, and `posts.image_url` are
intentionally left untouched; wiring them to `media` belongs to Phase 03.
Phase 03 added sibling `*_media_id` columns rather than repurposing
these, so both an external URL and an uploaded image remain supported.

#### Security model

- Authentication is required, and ownership always comes from the JWT
  principal. A client-supplied `ownerId`, `userId`, `storageKey`, or
  `filename` is rejected with a validation error rather than ignored.
- Multer buffers in memory, so an unvalidated upload never reaches disk.
  A global size cap applies before any decoding, with a second
  per-purpose cap enforced in the service.
- The authoritative format check is Sharp's decoded format — not the
  extension, not the filename, and not the client-declared MIME type.
- Every accepted image is decoded and re-encoded to a controlled output
  format, which strips EXIF/GPS, ICC profiles, and any payload appended
  to the file. The upload is never stored as a byte-for-byte copy.
- Sharp runs with an input pixel limit to bound decompression bombs.
- Storage keys are UUID-based and structurally validated, and the
  resolved path is re-checked against the upload root before every
  filesystem call.
- Uploads live outside `src/` (`backend/storage/uploads` by default, a
  mounted volume under Docker) and are never served as static content.
  Content is streamed through the provider with `X-Content-Type-Options:
  nosniff`, a sandboxing `Content-Security-Policy`, and an explicit
  `image/*` content type.
- Errors flow through the existing `AppError` classes and response
  envelope, so filesystem paths and stack traces do not leak.
- Rate limiting reuses the existing global limiter; no duplicate system
  was introduced.

#### API

| Method   | Path                        | Auth   | Purpose                      |
| -------- | --------------------------- | ------ | ---------------------------- |
| `POST`   | `/api/v1/media`             | JWT    | Upload one image             |
| `GET`    | `/api/v1/media`             | JWT    | List own uploads             |
| `GET`    | `/api/v1/media/:id`         | Owner  | Read own media metadata      |
| `GET`    | `/api/v1/media/:id/content` | Public | Read the stored image bytes  |
| `DELETE` | `/api/v1/media/:id`         | Owner  | Delete row and stored object |

`POST /api/v1/media` takes `multipart/form-data` with a `mediaType` field
and one image file (field name `file`, `image`, or `photo`). The response
returns `id`, `ownerId`, `mediaType`, `storageProvider`, `storageKey`,
`url`, `mimeType`, `sizeBytes`, `width`, `height`, and timestamps.

#### Tests

`backend/tests/integration/media.test.js` (39 cases) covers valid JPEG,
PNG, and WebP; faked extensions; client MIME mismatches; GIF and SVG
rejection; corrupted images; oversized uploads; unauthenticated requests;
invalid media types; client-controlled ownership and storage keys; path
traversal in filenames; storage-key uniqueness; metadata persistence with
no binary in the database; EXIF stripping; aspect-ratio preservation;
owner-scoped read and delete; and orphaned-file cleanup when the database
write fails.

#### Known gap

The migration has been reviewed against the existing schema but was not
executed against a live PostgreSQL instance, because no database was
reachable in the development environment. Run `npm run db:migrate` (or
`docker compose up -d migrate`) to apply and verify it.

---

## Phase 02 — Frontend Upload Experience

Status: **complete**.

### Architecture

One reusable modal serves all three media purposes. `mediaType` supplies
the copy, the size limit, the accepted formats and the preview shape, so
avatar, banner and post image are the same code path.

```text
js/utils/media.js              per-purpose config + client-side validation + error mapping
js/api/media.api.js            XHR upload with progress, reuses APP_CONFIG + cookie auth
js/components/ImageUploadModal.js   the dialog: state machine, dropzone, focus trap
css/image-upload.css           token-only styles, light and dark mode
```

```text
ImageUploadModal({ mediaType })
        │
        ├── profile_avatar   → settings/profile trigger
        ├── profile_banner   → settings/profile trigger
        └── post_image       → feed composer trigger
                │
          mediaApi.upload(file, mediaType, { onProgress, onRequestSent, signal })
                │
          POST /api/v1/media   (Phase 01 backend)
```

`ImageUploadModal` uploads the file and returns the media record through
`onUploaded`. It never writes to profile or post state, so Phase 03 owns
that decision. The triggers hold the result in module state behind
`getPostImageDraft()` and `getProfileMediaDrafts()` as an explicit seam.
Phase 03 consumes these seams: the profile and composer triggers persist
the reference as soon as the upload completes.

### States

```text
idle ─select─▶ preview ─confirm─▶ uploading ─sent─▶ processing
  ▲               │                  │                 │
  │               │                  └──────┬──────────┘
  │               │                         ▼
  └──── remove ───┘                      success
                  │                         │ Done
     (bad file)   ▼                         ▼
                error ◀────── fail ──────────┘
                  │
                  └──── retry ────▶ uploading
```

An explicit state string drives which panel is visible and which footer
buttons exist, so contradictory combinations — an enabled Upload button
during an upload, a live progress bar on success — are unreachable.
`uploading` and `processing` share a panel but differ in copy and in
determinate bar vs. indeterminate spinner.

### Behaviour

- **Selection**: drag & drop, click-to-browse, a Browse files button, and
  paste. A hidden `<input type="file">` is opened programmatically and
  kept out of the tab order.
- **Drag & drop**: `dragenter` / `dragover` / `dragleave` / `drop` with a
  depth counter, so the highlight does not flicker as the pointer crosses
  child elements. `preventDefault` on both `dragover` and `drop` stops the
  browser navigating to the dropped file.
- **Preview**: `URL.createObjectURL()`, revoked on every re-selection,
  reset and teardown. Shows filename, size and decoded dimensions.
- **Progress**: `XMLHttpRequest.upload.onprogress` drives a determinate bar
  with `role="progressbar"`, `aria-valuenow` and `aria-valuetext`.
- **Processing**: once the bytes are sent, the backend decodes and
  re-encodes with Sharp. That has no progress channel, so the UI shows an
  indeterminate spinner and hides the percentage entirely rather than
  inventing one. Success is only claimed after a 2xx response.
- **Errors**: server codes are mapped to actionable copy in
  `describeMediaError`. Unknown codes fall back to the server message,
  which Phase 01 already keeps free of paths and stack traces.

### Accessibility

`role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`; a
Tab focus trap; focus restoration to the triggering button; background
scroll lock; Escape and backdrop close blocked while an upload is in
flight; the dropzone is a real `<button>`; `role="status" aria-live="polite"`
for progress and `role="alert"` for errors; hidden file input removed from
the tab order.

### Security posture

Client-side validation is UX only. The backend remains authoritative: it
inspects the decoded bytes rather than trusting the declared MIME type.
Filenames are rendered with `textContent`, never `innerHTML`. No uploaded
content is parsed as HTML or executed. `ownerId` / `userId` are never sent —
ownership comes from the JWT. `Content-Type` is left unset so the browser
adds the multipart boundary itself.

### Not in this phase

No cropping or image editing, no S3/R2, no video/audio, no virus scanning,
no moderation, no queue. Persisting a media record onto a profile or post
is Phase 03.

---

## Phase 03 — Feature Integration & Storage Abstraction

Connect media with application features.

### Profile

Upload/change avatar
Upload/change banner
Remove existing image
Correct image dimensions/cropping

### Posts

Attach image while creating a post
Preview before publishing
Upload image
Create post referencing media
Display optimized image

### Storage abstraction

Keep business logic independent from physical storage:

```text
MediaService
    ↓
StorageProvider
    ├── LocalStorageProvider
    └── S3/R2StorageProvider (future)
```

Business logic should use `storage_key`, not filesystem paths.

### Implementation status: complete

#### Schema

Migration `017_link_media_to_features.sql` adds three nullable UUID foreign
keys:

```text
profiles.avatar_media_id  → media(id) ON DELETE SET NULL
profiles.banner_media_id  → media(id) ON DELETE SET NULL
posts.image_media_id      → media(id) ON DELETE SET NULL
```

The existing `profiles.avatar_url`, `profiles.cover_url` and
`posts.image_url` columns are kept and remain the source of truth for an
externally supplied URL. The UUID columns are the source of truth for an
uploaded image.

Only the media id is stored. No absolute URL is written to a profile or
post, so changing the API host or putting the app behind a proxy never
breaks an already-uploaded image. This also keeps every existing read
query working without a join: the client resolves a media id through
`GET /api/v1/media/:id/content` via `mediaApi.getContentUrl()`.

#### Linking rules

A profile or post may reference a media record only when it belongs to
the authenticated principal and matches the purpose of the field:

| Field | Required `media_type` |
| --- | --- |
| `avatarMediaId` | `profile_avatar` |
| `bannerMediaId` | `profile_banner` |
| `imageMediaId` | `post_image` |

Ownership is always `req.user.id` from the JWT. A client-supplied owner
is never accepted, so an upload cannot be attached to another user's
profile, and a `post_image` upload cannot silently become an avatar.

Setting a media id clears the corresponding legacy URL, and setting a
URL clears the media id. A field the request does not mention is left
strictly alone: editing a banner never disturbs the avatar.

`null` is an explicit removal.

#### Replacement ordering

Every image change follows the same order:

```text
1. create media            (upload, Phase 01)
2. write the new reference (profile or post update)
3. release the old media   (only after step 2 succeeded)
```

Step 3 runs strictly after step 2 commits. If the reference write fails,
the old image is still referenced and is left completely untouched — no
file is deleted before its replacement is durable.

Cleanup is best-effort by design: an unreferenced media row is reclaimable
by the orphan sweep, whereas failing the request would surface an error to
a user whose action actually succeeded.

#### Deletion safety

- `DELETE /api/v1/media/:id` returns `409 MEDIA_IN_USE` while a profile
  or post still references the record. Without this check the
  `ON DELETE SET NULL` foreign key would silently strip an avatar or post
  image.
- Replacement goes through `deleteIfUnreferenced`, a conditional delete
  that removes the row only when no profile or post points at it.
- `DELETE /api/v1/media/orphans` sweeps the caller's own uploads that
  nothing references — abandoned uploads and uploads whose follow-up
  write failed. Scoped to the authenticated user, oldest first.

#### Client changes

- `resolveMediaSource(mediaId, fallbackUrl)` in `js/utils/media.js` is the
  single resolver used by every surface that renders a profile picture or
  post image: profile, settings, search, follower lists, `UserCard`,
  `Comment`, `PostCard` and the post detail page.
- The profile page uploads, then immediately persists the reference. The
  "Remove photo" control clears it explicitly.
- The feed composer attaches the upload to the post it creates and only
  resets the button after a successful create, so a failed post can still
  carry the image the user already uploaded.
- The settings page no longer sends a blank `avatarUrl`/`coverUrl`, so
  editing an unrelated field cannot clear an uploaded image.

#### Tests

`backend/tests/integration/media.test.js` — 58 passing, covering link
ownership, purpose mismatch, replacement, removal, in-use protection, the
orphan sweep, and the guarantee that a failed reference write leaves the
previous image intact.

**Not verified:** migration 017 has not been exercised against a live
PostgreSQL instance (the Docker daemon is unavailable in this
environment), and no real browser or network upload was performed.

---

## Security Principles

Authentication required.
Authorization required.
Strict file-size limits.
Validate actual file content.
Decode and re-encode images.
Strip metadata.
Generate server-side filenames.
Never execute uploaded files.
Prevent path traversal.
Keep uploads outside source/executable directories.
Do not expose internal filesystem paths.
Do not trust client-provided file metadata.
Use safe response headers.
Add rate limiting where appropriate.
Keep storage implementation replaceable.

## MVP Boundary

Do not implement yet:

- Video uploads
- Audio uploads
- Documents
- AI image moderation
- Cloud storage
- CDN
- Advanced image editor
- Background job/queue system
- Virus scanning infrastructure

Design the module so these can be added later without rewriting the core
media architecture.
