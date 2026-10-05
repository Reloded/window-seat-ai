const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Source icon - use assets/icon.png (the daytime mountains design)
const SOURCE = path.join(__dirname, 'assets', 'icon.png');
const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Android adaptive icon sizes (foreground needs extra padding for safe zone)
// Foreground is 108dp with 72dp visible (66% visible area)
const MIPMAP_SIZES = {
  'mipmap-mdpi': { launcher: 48, foreground: 108 },
  'mipmap-hdpi': { launcher: 72, foreground: 162 },
  'mipmap-xhdpi': { launcher: 96, foreground: 216 },
  'mipmap-xxhdpi': { launcher: 144, foreground: 324 },
  'mipmap-xxxhdpi': { launcher: 192, foreground: 432 },
};

async function generateIcons() {
  console.log('Source icon:', SOURCE);
  
  const metadata = await sharp(SOURCE).metadata();
  console.log(`Source: ${metadata.width}x${metadata.height} ${metadata.format}`);

  for (const [folder, sizes] of Object.entries(MIPMAP_SIZES)) {
    const dir = path.join(RES_DIR, folder);
    
    // Generate ic_launcher.webp (standard launcher icon)
    await sharp(SOURCE)
      .resize(sizes.launcher, sizes.launcher, { fit: 'cover' })
      .webp({ quality: 90 })
      .toFile(path.join(dir, 'ic_launcher.webp'));
    console.log(`${folder}/ic_launcher.webp (${sizes.launcher}px)`);
    
    // Generate ic_launcher_round.webp (round launcher icon)
    // Create a circular mask
    const roundMask = Buffer.from(
      `<svg width="${sizes.launcher}" height="${sizes.launcher}">
        <circle cx="${sizes.launcher/2}" cy="${sizes.launcher/2}" r="${sizes.launcher/2}" fill="white"/>
      </svg>`
    );
    await sharp(SOURCE)
      .resize(sizes.launcher, sizes.launcher, { fit: 'cover' })
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .webp({ quality: 90 })
      .toFile(path.join(dir, 'ic_launcher_round.webp'));
    console.log(`${folder}/ic_launcher_round.webp (${sizes.launcher}px round)`);

    // Generate ic_launcher_foreground.webp (adaptive icon foreground)
    // The foreground needs padding: icon is 66% of total size, centered
    const fgSize = sizes.foreground;
    const iconSize = Math.round(fgSize * 0.66);
    const padding = Math.round((fgSize - iconSize) / 2);
    
    await sharp(SOURCE)
      .resize(iconSize, iconSize, { fit: 'cover' })
      .extend({
        top: padding,
        bottom: fgSize - iconSize - padding,
        left: padding,
        right: fgSize - iconSize - padding,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // dark navy matching icon bg
      })
      .resize(fgSize, fgSize) // ensure exact size
      .webp({ quality: 90 })
      .toFile(path.join(dir, 'ic_launcher_foreground.webp'));
    console.log(`${folder}/ic_launcher_foreground.webp (${fgSize}px)`);
  }

  // Also generate a 512x512 store icon from the same source
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(__dirname, 'store-icon-new.png'));
  console.log('store-icon-new.png (512x512)');

  console.log('\nDone! All icons generated from assets/icon.png');
}

generateIcons().catch(console.error);
