import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      // Uploads land in a temp tree owned by the test run, never in
      // the developer's real backend/storage/uploads directory.
      MEDIA_STORAGE_PROVIDER: 'local',
      MEDIA_UPLOAD_DIR: '.tmp-test-uploads',
      MEDIA_PUBLIC_PATH: '/uploads',
      MEDIA_MAX_FILE_SIZE: '8388608',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    },
  },
});
