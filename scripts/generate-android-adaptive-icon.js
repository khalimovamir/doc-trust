#!/usr/bin/env node
/**
 * Generates Android adaptive icon with safe-zone padding (66/108 ≈ 61%).
 * Keeps the logo fully visible inside the circular/squircle mask.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZE = 1024;
const SAFE_ZONE_RATIO = 66 / 108; // Android safe zone: 66dp in 108dp canvas

const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.join(projectRoot, 'assets', 'adaptive-icon-foreground.png');
const outputPath = path.join(projectRoot, 'assets', 'adaptive-icon-foreground-padded.png');

if (!fs.existsSync(inputPath)) {
  console.error('Input not found:', inputPath);
  process.exit(1);
}

async function main() {
  const logoSize = Math.round(SIZE * SAFE_ZONE_RATIO);
  const offset = Math.round((SIZE - logoSize) / 2);

  const logo = await sharp(inputPath)
    .resize(logoSize, logoSize)
    .toBuffer();

  const background = Buffer.from(
    await sharp({
      create: {
        width: SIZE,
        height: SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer()
  );

  await sharp(background)
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toFile(outputPath);

  console.log('Generated', outputPath, `(${SIZE}x${SIZE}, logo ${logoSize}px in safe zone)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
