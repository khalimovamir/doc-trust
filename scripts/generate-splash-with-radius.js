#!/usr/bin/env node
/**
 * Generates splash image with border radius 24 from source image.
 * Usage: node scripts/generate-splash-with-radius.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const RADIUS = 24;
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.join(projectRoot, 'assets', 'splash-source.png');
const outputPath = path.join(projectRoot, 'assets', 'splash.png');

if (!fs.existsSync(inputPath)) {
  console.error('Input not found:', inputPath);
  process.exit(1);
}

async function main() {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;
  const r = Math.min(RADIUS, w / 2, h / 2);

  const svg = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="white"/></svg>`
  );

  await sharp(inputPath)
    .ensureAlpha()
    .composite([{ input: svg, blend: 'dest-in' }])
    .png()
    .toFile(outputPath);

  console.log('Generated', outputPath, `(${w}x${h}, radius ${r})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
