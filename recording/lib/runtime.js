import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

export const root = path.resolve(import.meta.dirname, '../..');
export { viewport } from '../config.js';

// Prefer a full FFmpeg installation. Playwright's small bundled encoder also
// works, so recording does not require adding any npm runtime dependencies.
export async function findEncoder() {
  const candidates = process.env.FFMPEG_PATH ? [process.env.FFMPEG_PATH] : ['ffmpeg'];
  if (!process.env.FFMPEG_PATH) {
    const directory = path.dirname(fileURLToPath(import.meta.resolve('playwright-core/package.json')));
    const { browsers } = JSON.parse(await fs.readFile(path.join(directory, 'browsers.json'), 'utf8'));
    const revision = browsers.find(browser => browser.name === 'ffmpeg').revision;
    const name = { linux: 'ffmpeg-linux', darwin: 'ffmpeg-mac', win32: 'ffmpeg-win64.exe' }[process.platform];
    for (let parent = path.dirname(chromium.executablePath()); parent !== path.dirname(parent);
      parent = path.dirname(parent)) {
      if (name) candidates.push(path.join(parent, `ffmpeg-${revision}`, name));
    }
  }
  for (const executable of candidates) {
    const result = spawnSync(executable, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (result.status !== 0) continue;
    const encoders = result.stdout;
    if (encoders.includes('libvpx-vp9')) return { executable, codec: 'vp9', encoder: 'libvpx-vp9' };
    if (/\blibvpx\s/.test(encoders)) return { executable, codec: 'vp8', encoder: 'libvpx' };
  }
  throw new Error('No WebM encoder found. Install FFmpeg with libvpx, set FFMPEG_PATH, or run npx playwright install chromium.');
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.webm': 'video/webm', '.vtt': 'text/vtt' };

export async function serve(directory) {
  const base = await fs.realpath(directory);
  const server = http.createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const target = await fs.realpath(path.resolve(base, '.' + pathname));
      if (!target.startsWith(base + path.sep)) { response.writeHead(403).end(); return; }
      const content = await fs.readFile(target);
      response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
        'Content-Length': content.length, 'Cache-Control': 'no-store' });
      response.end(content);
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
