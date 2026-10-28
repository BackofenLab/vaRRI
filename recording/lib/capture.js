import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { viewport } from './runtime.js';
import { defaultParameters } from '../config.js';

export async function prepareStage(page, origin, scene) {
  const parameters = new URLSearchParams({ ...defaultParameters, ...scene.parameters });
  await page.goto(`${origin}/index.html?${parameters}`, { waitUntil: 'networkidle' });
  await page.evaluate(({ size, stage }) => {
    document.documentElement.style.setProperty('--demo-width', `${size.width}px`);
    document.documentElement.style.setProperty('--demo-height', `${size.height}px`);
    document.body.dataset.demoStage = stage;
  }, { size: viewport, stage: scene.stage || 'canvas' });
  await page.addStyleTag({ path: path.join(import.meta.dirname, 'stage.css') });
  await page.evaluate(title => {
    const heading = document.createElement('div');
    heading.dataset.demoHeading = '';
    const name = document.createElement('div');
    name.dataset.demoTitle = '';
    name.textContent = `vaRRI / ${title}`;
    const caption = document.createElement('div');
    caption.dataset.demoCaption = '';
    heading.append(name, caption);
    const pointer = document.createElement('div');
    pointer.dataset.demoPointer = '';
    pointer.style.transform = 'translate(35px, 110px)';
    pointer.innerHTML = '<svg viewBox="0 0 28 34"><path d="M3 2 L3 26 L9 20 L15 31 L20 28 L14 18 L24 18 Z" fill="#173e55" stroke="white" stroke-width="2"/></svg>';
    document.body.append(heading, pointer);
  }, scene.title);
  await page.waitForFunction(count => {
    const canvas = document.querySelector('#rendering-canvas');
    return canvas?.style.visibility !== 'hidden' &&
      canvas?.querySelectorAll('circle[node_type="nucleotide"]').length === count;
  }, parameters.get('sequence').replaceAll('&', '').length);
  await page.evaluate(() => document.fonts.ready);
  // Allow the real viewer's ResizeObserver to refit after framing, before capture.
  await page.waitForTimeout(350);
  if (scene.zoom !== false) {
    // Zoom using the real viewer gesture, keeping labels legible at embed sizes.
    const canvas = await page.locator('#rendering-canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(0, scene.stage && scene.stage !== 'canvas' ? -180 : -400);
    await page.waitForTimeout(250);
  }
  await page.mouse.move(35, 110);
}

export class Capture {
  constructor(page, encoder, options, file) {
    this.page = page;
    this.fps = options.fps;
    this.frames = 0;
    this.cues = [];
    this.pointer = { x: 35, y: 110 };
    const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe',
      '-c:v', 'mjpeg', '-r', String(this.fps), '-i', 'pipe:0', '-an',
      '-c:v', encoder.encoder, '-b:v', encoder.codec === 'vp9' ? '0' : '1M', '-crf', String(options.crf),
      '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p',
      '-threads', '2', '-r', String(this.fps), file];
    this.process = spawn(encoder.executable, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    this.errors = '';
    this.process.stderr.on('data', data => { this.errors = (this.errors + data).slice(-8000); });
    this.process.stdin.on('error', () => {});
    this.finished = new Promise((resolve, reject) => {
      this.process.once('error', reject);
      this.process.once('close', code => code === 0 ? resolve() :
        reject(new Error(`FFmpeg failed (${code}): ${this.errors}`)));
    });
    // Encoding may fail before the first screenshot has arrived.
    this.finished.catch(() => {});
  }

  async write(image, count = 1) {
    for (let index = 0; index < count; index++) {
      if (this.process.exitCode !== null) { await this.finished; throw new Error('Encoder exited early'); }
      await new Promise((resolve, reject) => this.process.stdin.write(image, error => error ? reject(error) : resolve()));
      this.frames++;
      if (this.frames > this.fps * 20) throw new Error('A demo exceeded the 20-second duration budget.');
    }
  }

  async frame(count = 1) {
    await this.write(await this.page.screenshot({ type: 'jpeg', quality: 95,
      clip: { x: 0, y: 0, ...viewport } }), count);
  }

  async hold(seconds) { await this.frame(Math.max(1, Math.round(seconds * this.fps))); }

  async caption(text) {
    this.cues.push({ start: this.frames / this.fps, text });
    await this.page.locator('[data-demo-caption]').evaluate((element, value) => { element.textContent = value; }, text);
  }

  async move(destination, seconds = 0.55) {
    const from = this.pointer;
    const steps = Math.max(1, Math.round(seconds * this.fps));
    for (let step = 1; step <= steps; step++) {
      const fraction = step / steps;
      const eased = fraction * fraction * (3 - 2 * fraction);
      const next = { x: from.x + (destination.x - from.x) * eased,
        y: from.y + (destination.y - from.y) * eased };
      if (next.x < 0 || next.y < 0 || next.x > viewport.width - 28 || next.y > viewport.height - 34) {
        throw new Error('Pointer left the recorded frame; adjust the scene.');
      }
      await this.page.mouse.move(next.x, next.y);
      await this.page.locator('[data-demo-pointer]').evaluate((element, point) => {
        element.style.transform = `translate(${point.x}px, ${point.y}px)`;
      }, next);
      await this.frame();
    }
    this.pointer = destination;
  }

  async pressed(value) {
    await this.page.locator('[data-demo-pointer]').evaluate((element, pressed) =>
      element.toggleAttribute('data-pressed', pressed), value);
  }

  async click(locator, modifier) {
    await this.move(await center(locator));
    if (modifier) await this.page.keyboard.down(modifier);
    try {
      await this.page.mouse.down();
      await this.pressed(true);
      await this.hold(0.15);
      await this.page.mouse.up();
      await this.pressed(false);
    } finally { if (modifier) await this.page.keyboard.up(modifier); }
    await this.hold(0.4);
  }

  async dragBetween(start, destination, modifier, seconds = 1.3) {
    if (modifier) await this.page.keyboard.down(modifier);
    try {
      await this.move(start);
      await this.page.mouse.down();
      await this.pressed(true);
      await this.hold(0.2);
      await this.move(destination, seconds);
      await this.page.mouse.up();
      await this.pressed(false);
    } finally {
      if (modifier) await this.page.keyboard.up(modifier);
    }
    await this.hold(0.5);
  }

  async drag(locator, dx, dy, modifier) {
    const start = await center(locator);
    await this.dragBetween(start, { x: start.x + dx, y: start.y + dy }, modifier);
  }

  async dragTo(locator, destination, modifier) {
    await this.dragBetween(await center(locator), destination, modifier);
  }

  async fill(locator, value) {
    await this.move(await center(locator));
    await this.page.mouse.click(this.pointer.x, this.pointer.y);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    const chunks = String(value).match(/[\s\S]{1,24}/g) || [''];
    for (const chunk of chunks) {
      await this.page.keyboard.insertText(chunk);
      await this.frame(Math.max(1, Math.round(this.fps * 0.12)));
    }
    await this.page.locator('[data-demo-pointer]').evaluate(element => element.toggleAttribute('data-pressed', false));
    await this.hold(0.35);
  }

  async select(locator, value) {
    await this.move(await center(locator));
    await locator.selectOption(value);
    await this.hold(0.6);
  }

  async wheel(locator, deltaY, modifier) {
    await this.move(await center(locator));
    if (modifier) await this.page.keyboard.down(modifier);
    try {
      await this.page.mouse.wheel(0, deltaY);
      await this.hold(0.7);
    } finally { if (modifier) await this.page.keyboard.up(modifier); }
  }

  async press(key, modifier) {
    if (modifier) await this.page.keyboard.down(modifier);
    try { await this.page.keyboard.press(key); }
    finally { if (modifier) await this.page.keyboard.up(modifier); }
    await this.hold(0.5);
  }

  async finish() {
    this.process.stdin.end();
    await this.finished;
    return this.frames / this.fps;
  }

  async abort() {
    this.process.stdin.destroy();
    this.process.kill();
    await this.finished.catch(() => {});
  }
}

export async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Missing visible target: ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function writeCaptions(file, cues, duration) {
  if (!cues.length || cues.some((cue, index) => !cue.text || /[\r\n]/.test(cue.text) ||
    cue.start < 0 || cue.start >= duration || (index && cue.start <= cues[index - 1].start))) {
    throw new Error('Captions require ordered, nonempty, single-line cues within the clip duration.');
  }
  const timestamp = seconds => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
  const blocks = cues.map((cue, index) => `${index + 1}\n${timestamp(cue.start)} --> ` +
    `${timestamp(cues[index + 1]?.start ?? duration)}\n${cue.text}\n`);
  await fs.writeFile(file, 'WEBVTT\n\n' + blocks.join('\n'));
}
