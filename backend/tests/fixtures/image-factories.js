import sharp from 'sharp';

export async function makeJpeg({ width = 40, height = 40 } = {}) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .jpeg()
    .toBuffer();
}

export async function makePng({ width = 40, height = 40 } = {}) {
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 120, b: 200, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
}

export async function makeWebp({ width = 40, height = 40 } = {}) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 200, b: 90 } },
  })
    .webp()
    .toBuffer();
}

/** A real GIF, which is deliberately outside the supported whitelist. */
export async function makeGif({ width = 20, height = 20 } = {}) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .gif()
    .toBuffer();
}

/** An SVG document, which can carry scripting content. */
export function makeSvg() {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script></svg>',
    'utf-8'
  );
}

/** Bytes that claim to be an image but cannot be decoded. */
export function makeCorruptImage() {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from('this is not a decodable image body', 'utf-8'),
  ]);
}

/** A JPEG carrying EXIF/GPS metadata, used to prove stripping works. */
export async function makeJpegWithExif({ width = 40, height = 40 } = {}) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 5, g: 5, b: 5 } },
  })
    .withExif({
      IFD0: { Artist: 'leaked-artist-name', Copyright: 'leaked-copyright' },
      GPS: { GPSLatitude: '51/1 30/1 0/1' },
    })
    .jpeg()
    .toBuffer();
}

/** A buffer large enough to exceed a per-purpose size limit. */
export async function makeOversizedJpeg(targetBytes = 3 * 1024 * 1024) {
  let buffer = await sharp({
    create: { width: 2000, height: 2000, channels: 3, background: { r: 1, g: 1, b: 1 } },
  })
    .jpeg({ quality: 100 })
    .toBuffer();

  if (buffer.length >= targetBytes) return buffer;

  // Incompressible random noise grows the JPEG past the limit without
  // needing an enormous canvas.
  const noise = Buffer.alloc(targetBytes + 64 * 1024);
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = Math.floor(Math.random() * 256);
  }
  buffer = await sharp(noise, { raw: { width: 512, height: noise.length / 512, channels: 1 } })
    .png({ compressionLevel: 0 })
    .toBuffer();
  return buffer;
}

export async function inspect(buffer) {
  return sharp(buffer).metadata();
}
