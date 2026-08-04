/* Regenerates the OG card and the icon family from og-src/*.html.
   Renders HTML with headless Edge (Windows path below), then derives sizes
   with sharp. Outputs are committed — rerun only when og-src or the portrait
   changes: `node scripts/gen-og-assets.mjs` */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TMP = path.join(root, 'og-src', '.tmp');
fs.mkdirSync(TMP, { recursive: true });

function shoot(html, w, h, out) {
  execFileSync(EDGE, [
    '--headless=new',
    '--disable-gpu',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    '--default-background-color=00000000',
    '--virtual-time-budget=4000',
    `file:///${path.join(root, 'og-src', html).replace(/\\/g, '/')}`,
  ]);
  console.log(`rendered ${html} -> ${out}`);
}

shoot('og-home.html', 1200, 630, path.join(TMP, 'og.png'));
shoot('icon.html', 512, 512, path.join(TMP, 'icon-512.png'));

await sharp(path.join(TMP, 'og.png')).png().toFile(path.join(root, 'public', 'images', 'og.png'));
const icon = path.join(TMP, 'icon-512.png');
await sharp(icon).png().toFile(path.join(root, 'public', 'icon-512.png'));
await sharp(icon).resize(192, 192).png().toFile(path.join(root, 'public', 'icon-192.png'));
await sharp(icon).resize(180, 180).png().toFile(path.join(root, 'public', 'apple-touch-icon.png'));
await sharp(icon).resize(32, 32).png().toFile(path.join(root, 'public', 'favicon.png'));
fs.rmSync(TMP, { recursive: true, force: true });
console.log('og.png, icon-512, icon-192, apple-touch-icon, favicon written');
