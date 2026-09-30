import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { env } from '../../src/config/env.js';

const inserted = [];
let nextId = 1;
let failInsert = false;

const mediaRows = new Map();

/** Minimal in-memory stand-ins for the tables media now references. */
const profileRows = new Map();
const postRows = new Map();
let postSeq = 0;

/** Fails the next matching write, so ordering guarantees can be tested. */
let failProfileUpdate = false;
let failPostWrite = false;

function profileRow(userId) {
  if (!profileRows.has(userId)) {
    profileRows.set(userId, {
      user_id: userId,
      display_name: 'Tester',
      bio: null,
      avatar_url: null,
      cover_url: null,
      website_url: null,
      location: null,
      avatar_media_id: null,
      banner_media_id: null,
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });
  }
  return profileRows.get(userId);
}

function countReferences(id) {
  let profileRefs = 0;
  for (const row of profileRows.values()) {
    if (row.avatar_media_id === id || row.banner_media_id === id) profileRefs += 1;
  }
  let postRefs = 0;
  for (const row of postRows.values()) {
    if (row.image_media_id === id && !row.deleted_at) postRefs += 1;
  }
  return { profileRefs, postRefs, total: profileRefs + postRefs };
}

const pool = {
  async query(text, params = []) {
    // auth middleware: SELECT id, email, username FROM users
    if (text.includes('FROM users')) {
      return { rows: [{ id: params[0], email: 'u@test.dev', username: 'tester' }], rowCount: 1 };
    }

    // --- Phase 03: profile and post reference plumbing ---
    if (text.includes('SELECT') && text.includes('FROM profiles WHERE user_id = $1')) {
      return { rows: [profileRow(params[0])], rowCount: 1 };
    }
    if (text.includes('UPDATE profiles SET')) {
      if (failProfileUpdate) throw new Error('profile write failed');
      const row = profileRow(params[0]);
      // The repository builds the SET list dynamically, so the
      // assignments are recovered from the parameters it supplied.
      const assignments = text.slice(text.indexOf('SET') + 3, text.indexOf('WHERE'));
      const names = [...assignments.matchAll(/(\w+) = \$\d+/g)].map((m) => m[1]);
      const supplied = text.includes('avatar_media_id = $') || text.includes('banner_media_id = $');
      let start = 1;
      for (let i = 0; i < names.length; i += 1) {
        if (names[i] === 'updated_at') break;
        row[names[i]] = params[start + i];
      }
      if (supplied) row.updated_at = new Date('2026-06-01T00:00:00Z');
      return { rows: [row], rowCount: 1 };
    }
    if (text.includes('SELECT') && text.includes('profile_refs')) {
      const refs = countReferences(params[0]);
      return {
        rows: [{ profile_refs: String(refs.profileRefs), post_refs: String(refs.postRefs) }],
        rowCount: 1,
      };
    }
    if (text.includes('NOT EXISTS (SELECT 1 FROM profiles p') && text.includes('DELETE FROM media')) {
      const row = mediaRows.get(params[0]);
      if (!row || row.owner_id !== params[1]) return { rows: [], rowCount: 0 };
      if (countReferences(params[0]).total > 0) return { rows: [], rowCount: 0 };
      mediaRows.delete(params[0]);
      return { rows: [{ storage_provider: row.storage_provider, storage_key: row.storage_key }], rowCount: 1 };
    }
    if (text.includes('FROM media m') && text.includes('LIMIT')) {
      const rows = [...mediaRows.values()]
        .filter((r) => r.owner_id === params[0] && countReferences(r.id).total === 0)
        .slice(0, params[1])
        .map((r) => ({ id: r.id, storage_provider: r.storage_provider, storage_key: r.storage_key }));
      return { rows, rowCount: rows.length };
    }

    if (text.includes('INSERT INTO posts')) {
      if (failPostWrite) throw new Error('post write failed');
      const row = {
        id: `33333333-3333-4333-8333-${String(++postSeq).padStart(12, '0')}`,
        user_id: params[0],
        content: params[1],
        image_url: params[2],
        image_media_id: params[3],
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
        deleted_at: null,
        username: 'tester',
        display_name: 'Tester',
        avatar_url: null,
        avatar_media_id: null,
        likes_count: '0',
        comments_count: '0',
        user_liked: false,
      };
      postRows.set(row.id, row);
      return { rows: [row], rowCount: 1 };
    }
    if (text.includes('UPDATE posts SET deleted_at = NOW()')) {
      const row = postRows.get(params[0]);
      if (!row) return { rows: [], rowCount: 0 };
      row.deleted_at = new Date('2026-06-01T00:00:00Z');
      return { rows: [{ id: row.id }], rowCount: 1 };
    }
    if (text.includes('UPDATE posts SET')) {
      if (failPostWrite) throw new Error('post write failed');
      const row = postRows.get(params[0]);
      if (!row) return { rows: [], rowCount: 0 };
      const assignments = text.slice(text.indexOf('SET') + 3, text.indexOf('WHERE'));
      const names = [...assignments.matchAll(/(\w+) = \$\d+/g)].map((m) => m[1]);
      names.forEach((name, i) => {
        if (name !== 'updated_at') row[name] = params[2 + i];
      });
      return { rows: [row], rowCount: 1 };
    }
    if (text.includes('FROM posts p')) {
      const row = postRows.get(params[0]);
      // A copy, so a later UPDATE cannot mutate what a prior read
      // returned. Real row reads are likewise independent snapshots.
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }
    if (text.includes('COUNT(*) FROM posts')) {
      const rows = [...postRows.values()].filter((r) => !r.deleted_at);
      return { rows: [{ count: String(rows.length) }], rowCount: 1 };
    }
    if (text.includes('COUNT(*) FROM user_follows')) {
      return { rows: [{ count: '0' }], rowCount: 1 };
    }

    if (text.includes('INSERT INTO media')) {
      if (failInsert) throw new Error('database write failed');
      const row = {
        id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
        owner_id: params[0],
        media_type: params[1],
        storage_provider: params[2],
        storage_key: params[3],
        original_filename: params[4],
        original_mime_type: params[5],
        mime_type: params[6],
        size_bytes: params[7],
        width: params[8],
        height: params[9],
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      };
      inserted.push({ text, params });
      mediaRows.set(row.id, row);
      return { rows: [row], rowCount: 1 };
    }
    if (text.includes('DELETE FROM media')) {
      const row = mediaRows.get(params[0]);
      if (row && row.owner_id === params[1]) {
        mediaRows.delete(params[0]);
        return { rows: [{ storage_provider: row.storage_provider, storage_key: row.storage_key }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (text.includes('SELECT * FROM media WHERE id = $1 AND owner_id = $2')) {
      const row = mediaRows.get(params[0]);
      return { rows: row && row.owner_id === params[1] ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (text.includes('SELECT * FROM media WHERE id = $1')) {
      const row = mediaRows.get(params[0]);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (text.includes('COUNT(*) FROM media')) {
      return { rows: [{ count: String(mediaRows.size) }], rowCount: 1 };
    }
    if (text.includes('FROM media')) {
      const ownerId = params[0];
      const rows = [...mediaRows.values()].filter((r) => r.owner_id === ownerId);
      return { rows, rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  },
  async connect() {
    return {
      query: (...args) => pool.query(...args),
      release() {},
    };
  },
};

vi.mock('../../src/config/database.js', () => ({
  get pool() {
    return pool;
  },
  query: (...args) => pool.query(...args),
  getClient: () => pool.connect(),
  closePool: async () => {},
}));

const {
  default: app,
} = await import('../../src/app.js');
const { processImage } = await import('../../src/modules/media/media.processor.js');
const { buildStorageKey } = await import('../../src/modules/media/media.storage.js');
const { assertSafeStorageKey } = await import('../../src/modules/media/media.validation.js');
const {
  MEDIA_TYPES,
  MEDIA_ERROR_CODES,
  getMediaLimits,
} = await import('../../src/modules/media/media.constants.js');

const {
  makeJpeg,
  makePng,
  makeWebp,
  makeGif,
  makeSvg,
  makeCorruptImage,
  makeJpegWithExif,
  makeOversizedJpeg,
  inspect,
} = await import('../fixtures/image-factories.js');

const request = supertest(app);

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

function authCookie(userId = OWNER_ID) {
  const token = jwt.sign({ userId }, env.jwt.accessSecret, { expiresIn: '15m' });
  return [`${env.cookie.name}=${token}`];
}

async function listStoredFiles() {
  const root = path.resolve(env.media.uploadDir);
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  await walk(root);
  return out.sort();
}

async function upload({ buffer, filename = 'photo.jpg', mimetype = 'image/jpeg', mediaType, cookie, fields = {} }) {
  const req = request.post('/api/v1/media');
  if (cookie !== null) req.set('Cookie', cookie || authCookie());
  if (mediaType !== undefined) req.field('mediaType', mediaType);
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  return req.attach('file', buffer, { filename, contentType: mimetype });
}

describe('media module — supported formats', () => {
  it('accepts a valid JPEG and stores it as re-encoded WebP', async () => {
    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mediaType).toBe('post_image');
    expect(res.body.data.mimeType).toBe('image/webp');
    expect(res.body.data.width).toBe(40);
    expect(res.body.data.height).toBe(40);

    const key = res.body.data.storageKey;
    expect(key.startsWith('post_image/')).toBe(true);
    expect(key.endsWith('.webp')).toBe(true);
    expect(key).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/);

    const stored = await fs.readFile(path.resolve(env.media.uploadDir, ...key.split('/')));
    const meta = await inspect(stored);
    expect(meta.format).toBe('webp');
  });

  it('accepts a valid PNG', async () => {
    const res = await upload({ buffer: await makePng(), filename: 'a.png', mimetype: 'image/png', mediaType: MEDIA_TYPES.POST_IMAGE });
    expect(res.status).toBe(201);
    expect(res.body.data.mimeType).toBe('image/webp');
  });

  it('accepts a valid WebP', async () => {
    const res = await upload({ buffer: await makeWebp(), filename: 'a.webp', mimetype: 'image/webp', mediaType: MEDIA_TYPES.PROFILE_AVATAR });
    expect(res.status).toBe(201);
    expect(res.body.data.mediaType).toBe('profile_avatar');
  });

  it('accepts an avatar uploaded with a fake .txt extension', async () => {
    const res = await upload({
      buffer: await makeJpeg(),
      filename: 'not-really.txt',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.PROFILE_AVATAR,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.storageKey.endsWith('.webp')).toBe(true);
  });

  it('accepts a JPEG that the client mislabels as text/plain if it arrives as image/jpeg', async () => {
    const res = await upload({
      buffer: await makeJpeg(),
      filename: 'x.jpg',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.PROFILE_BANNER,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.mediaType).toBe('profile_banner');
  });
});

describe('media module — rejection paths', () => {
  it('rejects a real GIF', async () => {
    const res = await upload({
      buffer: await makeGif(),
      filename: 'a.gif',
      mimetype: 'image/gif',
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE);
  });

  it('rejects a text file declared as image/jpeg', async () => {
    const res = await upload({
      buffer: Buffer.from('plain text, not an image'),
      filename: 'a.jpg',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });
    // The declared MIME passes the cheap pre-filter, then Sharp fails
    // to decode the bytes, so it is reported as an invalid image.
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.INVALID_IMAGE);
  });

  it('rejects an SVG declared as image/jpeg', async () => {
    const res = await upload({
      buffer: makeSvg(),
      filename: 'evil.jpg',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });
    // Sharp decodes SVG and reports format 'svg', so the whitelist
    // check rejects it even though the client claimed image/jpeg.
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE);
  });

  it('rejects a corrupted image', async () => {
    const res = await upload({
      buffer: makeCorruptImage(),
      filename: 'broken.jpg',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.INVALID_IMAGE);
  });

  it('rejects a file that exceeds the per-purpose size limit', async () => {
    const res = await upload({
      buffer: await makeOversizedJpeg(),
      filename: 'huge.jpg',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.PROFILE_AVATAR,
    });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.FILE_TOO_LARGE);
  });

  it('rejects an invalid media type', async () => {
    const res = await upload({ buffer: await makeJpeg(), mediaType: 'document' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing media type', async () => {
    const req = request.post('/api/v1/media').set('Cookie', authCookie());
    const res = await req.attach('file', await makeJpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(422);
  });

  it('rejects an unauthenticated upload', async () => {
    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE, cookie: [] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an upload with no file', async () => {
    const res = await request.post('/api/v1/media').set('Cookie', authCookie()).field('mediaType', 'post_image');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.FILE_REQUIRED);
  });

  it('rejects more than one file', async () => {
    const req = request.post('/api/v1/media').set('Cookie', authCookie()).field('mediaType', 'post_image');
    const buffer = await makeJpeg();
    req.attach('file', buffer, { filename: 'a.jpg', contentType: 'image/jpeg' });
    req.attach('image', buffer, { filename: 'b.jpg', contentType: 'image/jpeg' });
    const res = await req;
    expect(res.status).toBe(400);
  });
});

describe('media module — ownership and storage safety', () => {
  it('rejects a client-supplied ownerId rather than trusting it', async () => {
    const res = await upload({
      buffer: await makeJpeg(),
      mediaType: MEDIA_TYPES.POST_IMAGE,
      fields: { ownerId: OTHER_USER_ID },
    });
    expect(res.status).toBe(422);

    // Nothing may have been persisted for the attacker-chosen owner.
    const stored = [...mediaRows.values()].filter((m) => m.owner_id === OTHER_USER_ID);
    expect(stored).toHaveLength(0);
  });

  it('records the JWT principal as the owner on a clean upload', async () => {
    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    expect(res.status).toBe(201);
    expect(res.body.data.ownerId).toBe(OWNER_ID);
    expect(res.body.data.ownerId).not.toBe(OTHER_USER_ID);
  });

  it('rejects a client-supplied userId', async () => {
    const res = await upload({
      buffer: await makeJpeg(),
      mediaType: MEDIA_TYPES.POST_IMAGE,
      fields: { userId: OTHER_USER_ID },
    });
    expect(res.status).toBe(422);
  });

  it('rejects a client-supplied storageKey', async () => {
    const res = await upload({
      buffer: await makeJpeg(),
      mediaType: MEDIA_TYPES.POST_IMAGE,
      fields: { storageKey: '../../etc/passwd' },
    });
    expect(res.status).toBe(422);
  });

  it('never stores the original filename as the storage path', async () => {
    const res = await upload({
      buffer: await makeJpeg(),
      filename: '../../../../etc/passwd.jpg',
      mimetype: 'image/jpeg',
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.storageKey).not.toContain('passwd');
    expect(res.body.data.storageKey).not.toContain('..');
    expect(res.body.data.url).not.toContain('passwd');
  });

  it('does not leak filesystem paths in the response', async () => {
    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(env.media.uploadDir);
    expect(serialized).not.toContain(':\\');
    expect(serialized).not.toContain('/tmp/');
  });

  it('writes only inside the upload root', async () => {
    const before = await listStoredFiles();
    const res = await upload({
      buffer: await makeJpeg(),
      filename: 'traversal.jpg',
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });
    const after = await listStoredFiles();
    expect(after.length).toBe(before.length + 1);
    for (const key of after) {
      expect(key.startsWith('..')).toBe(false);
      expect(path.isAbsolute(key)).toBe(false);
    }
    expect(after).toContain(res.body.data.storageKey);
  });

  it('generates a unique UUID storage key per upload', async () => {
    const a = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const b = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    expect(a.body.data.storageKey).not.toBe(b.body.data.storageKey);
  });

  it('stores only metadata in the database, never the image bytes', async () => {
    const before = inserted.length;
    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    expect(inserted.length).toBe(before + 1);

    const { params } = inserted.at(-1);
    expect(params[3]).toBe(res.body.data.storageKey);
    for (const value of params) {
      if (Buffer.isBuffer(value)) throw new Error('binary data must never reach the database');
    }
    expect(res.body.data.sizeBytes).toBeGreaterThan(0);
  });

  it('strips EXIF metadata during re-encoding', async () => {
    const source = await makeJpegWithExif();
    const srcMeta = await inspect(source);
    expect(srcMeta.exif).toBeTruthy();

    const processed = await processImage(source, MEDIA_TYPES.POST_IMAGE);
    expect(processed.mimeType).toBe('image/webp');

    const outMeta = await inspect(processed.buffer);
    expect(outMeta.format).toBe('webp');
    expect(outMeta.exif).toBeFalsy();
    expect(outMeta.icc).toBeFalsy();
  });

  it('preserves aspect ratio when downscaling', async () => {
    const tall = await makeJpeg({ width: 2000, height: 1000 });
    const processed = await processImage(tall, MEDIA_TYPES.POST_IMAGE);
    expect(processed.width).toBe(1920);
    expect(processed.height).toBe(960);
  });
});

describe('media module — storage abstraction', () => {
  it('buildStorageKey produces a server-generated, purpose-scoped key', () => {
    const key = buildStorageKey(MEDIA_TYPES.PROFILE_AVATAR, 'webp');
    expect(key).toMatch(/^profile_avatar\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
  });

  it('buildStorageKey rejects an unsupported output format', () => {
    expect(() => buildStorageKey(MEDIA_TYPES.POST_IMAGE, 'svg')).toThrow();
  });

  it('buildStorageKey rejects an unknown media type', () => {
    expect(() => buildStorageKey('video', 'webp')).toThrow();
  });

  it('assertSafeStorageKey blocks path traversal', () => {
    for (const bad of ['../secret', '/etc/passwd', 'a/../../b', 'C:\\win', 'a//b', '..']) {
      expect(() => assertSafeStorageKey(bad)).toThrow();
    }
    expect(assertSafeStorageKey('post_image/2026/01/abc.webp')).toBe('post_image/2026/01/abc.webp');
  });

  it('exposes per-purpose limits from a single source', () => {
    expect(getMediaLimits(MEDIA_TYPES.PROFILE_BANNER).maxWidth).toBeGreaterThan(
      getMediaLimits(MEDIA_TYPES.PROFILE_AVATAR).maxWidth
    );
    expect(() => getMediaLimits('unknown')).toThrow();
  });
});

describe('media module — read and delete', () => {
  it('serves stored bytes with defensive headers', async () => {
    const created = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const id = created.body.data.id;

    const res = await request.get(`/api/v1/media/${id}/content`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain('sandbox');
    expect(res.headers['content-disposition']).toContain('inline');
  });

  it('hides media metadata from a non-owner', async () => {
    const created = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const id = created.body.data.id;

    const res = await request.get(`/api/v1/media/${id}`).set('Cookie', authCookie(OTHER_USER_ID));
    expect(res.status).toBe(404);
  });

  it('lets the owner read their own media metadata', async () => {
    const created = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const res = await request.get(`/api/v1/media/${created.body.data.id}`).set('Cookie', authCookie());
    expect(res.status).toBe(200);
    expect(res.body.data.storageKey).toBe(created.body.data.storageKey);
  });

  it('deletes the record and the stored file', async () => {
    const created = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const key = created.body.data.storageKey;
    const absolute = path.resolve(env.media.uploadDir, ...key.split('/'));
    await expect(fs.stat(absolute)).resolves.toBeTruthy();

    const res = await request.delete(`/api/v1/media/${created.body.data.id}`).set('Cookie', authCookie());
    expect(res.status).toBe(204);

    await expect(fs.stat(absolute)).rejects.toThrow();
  });

  it('does not let one user delete another user media', async () => {
    const created = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const res = await request
      .delete(`/api/v1/media/${created.body.data.id}`)
      .set('Cookie', authCookie(OTHER_USER_ID));
    expect(res.status).toBe(404);
  });

  it('lists only the authenticated user uploads', async () => {
    await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    const res = await request.get('/api/v1/media').set('Cookie', authCookie(OWNER_ID));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every((m) => m.ownerId === OWNER_ID)).toBe(true);
  });
});

describe('media module — cleanup on failure', () => {
  beforeEach(() => {
    failInsert = false;
  });

  it('removes the stored file when the database write fails', async () => {
    failInsert = true;
    const before = await listStoredFiles();

    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE });
    expect(res.status).toBe(500);

    const after = await listStoredFiles();
    expect(after).toEqual(before);
  });

  it('leaves nothing behind when the image cannot be processed', async () => {
    const before = await listStoredFiles();
    await upload({ buffer: makeCorruptImage(), mediaType: MEDIA_TYPES.POST_IMAGE });
    expect(await listStoredFiles()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Phase 03: media linked into profiles and posts
// ---------------------------------------------------------------------------

function storedPath(media) {
  return path.resolve(env.media.uploadDir, ...media.storageKey.split('/'));
}

async function uploadAvatar(cookie = authCookie()) {
  const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.PROFILE_AVATAR, cookie });
  expect(res.status).toBe(201);
  return res.body.data;
}

function patchProfile(body, cookie = authCookie()) {
  return request.patch('/api/v1/users/me').set('Cookie', cookie).send(body);
}

describe('phase 03 — profile avatar and banner', () => {
  beforeEach(() => {
    profileRows.clear();
    failProfileUpdate = false;
  });

  it('links an uploaded avatar to the profile', async () => {
    const media = await uploadAvatar();

    const res = await patchProfile({ avatarMediaId: media.id });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.avatarMediaId).toBe(media.id);
    expect(profileRow(OWNER_ID).avatar_media_id).toBe(media.id);
  });

  it('keeps the stored file while the profile references it', async () => {
    const media = await uploadAvatar();
    await patchProfile({ avatarMediaId: media.id });

    await expect(fs.stat(storedPath(media))).resolves.toBeTruthy();
    const content = await request.get(`/api/v1/media/${media.id}/content`);
    expect(content.status).toBe(200);
  });

  it('clears a legacy avatar URL when an upload is linked', async () => {
    profileRow(OWNER_ID).avatar_url = 'https://example.test/old.jpg';
    const media = await uploadAvatar();

    await patchProfile({ avatarMediaId: media.id });

    expect(profileRow(OWNER_ID).avatar_url).toBeNull();
    expect(profileRow(OWNER_ID).avatar_media_id).toBe(media.id);
  });

  it('clears the linked media when an external URL is set instead', async () => {
    const media = await uploadAvatar();
    await patchProfile({ avatarMediaId: media.id });

    await patchProfile({ avatarUrl: 'https://example.test/new.jpg' });

    expect(profileRow(OWNER_ID).avatar_media_id).toBeNull();
  });

  it('replaces the avatar and removes the previous record and file', async () => {
    const first = await uploadAvatar();
    await patchProfile({ avatarMediaId: first.id });
    const second = await uploadAvatar();

    const res = await patchProfile({ avatarMediaId: second.id });
    expect(res.status).toBe(200);

    expect(profileRow(OWNER_ID).avatar_media_id).toBe(second.id);
    expect(mediaRows.has(first.id)).toBe(false);
    await expect(fs.stat(storedPath(first))).rejects.toThrow();
    await expect(fs.stat(storedPath(second))).resolves.toBeTruthy();
  });

  it('removes the image and its file when the avatar is cleared', async () => {
    const media = await uploadAvatar();
    await patchProfile({ avatarMediaId: media.id });

    const res = await patchProfile({ avatarMediaId: null });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.avatarMediaId).toBeNull();

    expect(mediaRows.has(media.id)).toBe(false);
    await expect(fs.stat(storedPath(media))).rejects.toThrow();
  });

  it('removes the banner file without disturbing the avatar', async () => {
    const avatar = await uploadAvatar();
    const banner = await upload({
      buffer: await makeJpeg({ width: 1920, height: 1080 }),
      mediaType: MEDIA_TYPES.PROFILE_BANNER,
    });
    expect(banner.status).toBe(201);

    await patchProfile({ avatarMediaId: avatar.id, bannerMediaId: banner.body.data.id });
    await patchProfile({ bannerMediaId: null });

    expect(mediaRows.has(banner.body.data.id)).toBe(false);
    expect(mediaRows.has(avatar.id)).toBe(true);
    expect(profileRow(OWNER_ID).avatar_media_id).toBe(avatar.id);
  });

  it('refuses media owned by another user', async () => {
    const theirs = await uploadAvatar(authCookie(OTHER_USER_ID));

    const res = await patchProfile({ avatarMediaId: theirs.id });
    expect(res.status).toBe(404);
    expect(profileRow(OWNER_ID).avatar_media_id).toBeNull();
  });

  it('refuses media uploaded for a different purpose', async () => {
    const postImage = await upload({
      buffer: await makeJpeg(),
      mediaType: MEDIA_TYPES.POST_IMAGE,
    });

    const res = await patchProfile({ avatarMediaId: postImage.body.data.id });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.MEDIA_PURPOSE_MISMATCH);
  });

  it('rejects a non-UUID media reference', async () => {
    const res = await patchProfile({ avatarMediaId: 'not-a-uuid' });
    expect(res.status).toBe(422);
  });

  it('keeps the old avatar when the reference update fails', async () => {
    const first = await uploadAvatar();
    await patchProfile({ avatarMediaId: first.id });
    const second = await uploadAvatar();

    failProfileUpdate = true;
    const res = await patchProfile({ avatarMediaId: second.id });
    expect(res.status).toBe(500);

    // The old image is still referenced, so it must still exist.
    expect(mediaRows.has(first.id)).toBe(true);
    await expect(fs.stat(storedPath(first))).resolves.toBeTruthy();
    expect(mediaRows.has(second.id)).toBe(true);
  });
});

describe('phase 03 — post image', () => {
  beforeEach(() => {
    postRows.clear();
    failPostWrite = false;
  });

  async function uploadPostImage(cookie = authCookie()) {
    const res = await upload({ buffer: await makeJpeg(), mediaType: MEDIA_TYPES.POST_IMAGE, cookie });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  it('creates a post that references an uploaded image', async () => {
    const media = await uploadPostImage();

    const res = await request
      .post('/api/v1/posts')
      .set('Cookie', authCookie())
      .send({ content: 'hello world', imageMediaId: media.id });

    expect(res.status).toBe(201);
    expect(res.body.data.imageMediaId).toBe(media.id);
    await expect(fs.stat(storedPath(media))).resolves.toBeTruthy();
  });

  it('refuses another user media on a post', async () => {
    const theirs = await uploadPostImage(authCookie(OTHER_USER_ID));

    const res = await request
      .post('/api/v1/posts')
      .set('Cookie', authCookie())
      .send({ content: 'hello world', imageMediaId: theirs.id });

    expect(res.status).toBe(404);
  });

  it('replaces the post image and cleans up the replaced file', async () => {
    const first = await uploadPostImage();
    const created = await request
      .post('/api/v1/posts')
      .set('Cookie', authCookie())
      .send({ content: 'first', imageMediaId: first.id });
    const second = await uploadPostImage();

    const res = await request
      .patch(`/api/v1/posts/${created.body.data.id}`)
      .set('Cookie', authCookie())
      .send({ imageMediaId: second.id });

    expect(res.status).toBe(200);
    expect(res.body.data.imageMediaId).toBe(second.id);
    expect([...postRows.values()].map((r) => r.image_media_id)).toEqual([second.id]);
    expect(countReferences(first.id).total).toBe(0);
    expect(mediaRows.has(first.id)).toBe(false);
    await expect(fs.stat(storedPath(first))).rejects.toThrow();
  });

  it('releases the image when the post is deleted', async () => {
    const media = await uploadPostImage();
    const created = await request
      .post('/api/v1/posts')
      .set('Cookie', authCookie())
      .send({ content: 'doomed', imageMediaId: media.id });

    const res = await request
      .delete(`/api/v1/posts/${created.body.data.id}`)
      .set('Cookie', authCookie());

    expect(res.status).toBe(204);
    expect(mediaRows.has(media.id)).toBe(false);
    await expect(fs.stat(storedPath(media))).rejects.toThrow();
  });
});

describe('phase 03 — in-use protection and orphan sweep', () => {
  beforeEach(() => {
    profileRows.clear();
    postRows.clear();
    failProfileUpdate = false;
    failPostWrite = false;
  });

  it('refuses to delete media that a profile still displays', async () => {
    const media = await uploadAvatar();
    const patched = await patchProfile({ avatarMediaId: media.id });
    expect(patched.status).toBe(200);
    expect(countReferences(media.id).total).toBeGreaterThan(0);

    const res = await request.delete(`/api/v1/media/${media.id}`).set('Cookie', authCookie());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(MEDIA_ERROR_CODES.MEDIA_IN_USE);
    expect(mediaRows.has(media.id)).toBe(true);
    await expect(fs.stat(storedPath(media))).resolves.toBeTruthy();
  });

  it('allows deleting the media once the profile no longer uses it', async () => {
    const media = await uploadAvatar();
    await patchProfile({ avatarMediaId: media.id });
    await patchProfile({ avatarMediaId: null });

    const res = await request.delete(`/api/v1/media/${media.id}`).set('Cookie', authCookie());
    expect(res.status).toBe(404);
  });

  it('sweeps unlinked uploads and leaves referenced ones alone', async () => {
    const orphan = await uploadAvatar();
    const linked = await uploadAvatar();
    await patchProfile({ avatarMediaId: linked.id });

    const res = await request.delete('/api/v1/media/orphans').set('Cookie', authCookie());
    expect(res.status).toBe(200);
    expect(res.body.data.removed).toBeGreaterThanOrEqual(1);

    expect(mediaRows.has(orphan.id)).toBe(false);
    expect(mediaRows.has(linked.id)).toBe(true);
    await expect(fs.stat(storedPath(linked))).resolves.toBeTruthy();
  });

  it('does not sweep another user media', async () => {
    const theirs = await uploadAvatar(authCookie(OTHER_USER_ID));

    await request.delete('/api/v1/media/orphans').set('Cookie', authCookie(OWNER_ID));

    expect(mediaRows.has(theirs.id)).toBe(true);
  });
});

beforeAll(async () => {
  await fs.mkdir(path.resolve(env.media.uploadDir), { recursive: true });
});

afterAll(async () => {
  await fs.rm(path.resolve(env.media.uploadDir), { recursive: true, force: true });
});
