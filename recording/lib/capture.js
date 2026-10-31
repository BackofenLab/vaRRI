import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { viewport } from './runtime.js';
import { defaultParameters } from '../config.js';
import { serializeCaptions } from './captions.js';
import { installPresentation, raisePresentation, showInstruction, hideInstruction,
  showAction, hideAction, readingSeconds } from './presentation.js';

export async function prepareStage(page, origin, scene) {
  const parameters = new URLSearchParams({ ...defaultParameters, ...scene.parameters });
  await page.goto(`${origin}/index.html?${parameters}`, { waitUntil: 'networkidle' });
  await page.evaluate(({ size, stage }) => {
    document.documentElement.style.setProperty('--demo-width', `${size.width}px`);
    document.documentElement.style.setProperty('--demo-height', `${size.height}px`);
    document.body.dataset.demoStage = stage;
  }, { size: viewport, stage: scene.stage || 'canvas' });
  await page.addStyleTag({ path: path.join(import.meta.dirname, 'stage.css') });
  await installPresentation(page, scene.title);
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
    this.timeline = [];
    this.maxSeconds = options.maxSeconds ?? 45;
    this.pendingCaption = null;
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
      if (this.frames > this.fps * this.maxSeconds) {
        throw new Error(`A demo exceeded the ${this.maxSeconds}-second duration budget.`);
      }
    }
  }

  async frame(count = 1) {
    // UI commits hide the drawing while rendering. Wait before taking a still
    // so an effect hold cannot repeat that transient blank canvas.
    await this.page.waitForFunction(() => {
      const canvas = document.getElementById('rendering-canvas');
      return canvas && canvas.style.visibility !== 'hidden';
    });
    await raisePresentation(this.page);
    await this.write(await this.page.screenshot({ type: 'jpeg', quality: 95,
      clip: { x: 0, y: 0, ...viewport } }), count);
  }

  async hold(seconds) { await this.frame(Math.max(1, Math.round(seconds * this.fps))); }

  async poster(text) {
    await showInstruction(this.page, text, 0);
    await raisePresentation(this.page);
  }

  async caption(text) {
    if (this.pendingCaption) await this.clearCaption();
    const cue = { start: this.frames / this.fps, text };
    this.cues.push(cue);
    this.pendingCaption = cue;
    await showInstruction(this.page, text, this.cues.length);
  }

  async clearCaption() {
    if (!this.pendingCaption) return;
    const cue = this.pendingCaption;
    const remaining = readingSeconds(cue.text) - (this.frames / this.fps - cue.start);
    if (remaining > 0) await this.hold(remaining);
    this.timeline.push({ type: 'instruction', start: cue.start,
      end: this.frames / this.fps, text: cue.text });
    this.pendingCaption = null;
    await hideInstruction(this.page);
    await this.hold(0.27);
  }

  async pulse(text, box = null, seconds = 0.4) {
    const steps = Math.max(2, Math.round(seconds * this.fps));
    for (let step = 0; step < steps; step++) {
      await showAction(this.page, this.pointer, text, box, step / steps);
      await this.frame();
    }
  }

  markAction(type, text) {
    this.timeline.push({ type, start: this.frames / this.fps, text,
      x: this.pointer.x, y: this.pointer.y });
  }

  async move(destination, seconds = 0.55) {
    await this.clearCaption();
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
      if (this.dragLabel) await showAction(this.page, next, this.dragLabel);
      await this.frame();
    }
    this.pointer = destination;
  }

  async pressed(value) {
    await this.page.locator('[data-demo-pointer]').evaluate((element, pressed) =>
      element.toggleAttribute('data-pressed', pressed), value);
  }

  async click(locator, modifier, afterAction) {
    await this.clearCaption();
    const box = await locator.boundingBox();
    await this.move(await center(locator));
    const label = modifier ? 'Ctrl / ⌘ + click' : 'Click';
    this.markAction('click', label);
    if (modifier) await this.page.keyboard.down(modifier);
    try {
      await this.page.mouse.down();
      await this.pressed(true);
      await this.pulse(label, box);
      await this.page.mouse.up();
      await this.pressed(false);
    } finally { if (modifier) await this.page.keyboard.up(modifier); }
    if (afterAction) await afterAction();
    await this.pulse(label, box, 0.27);
    await hideAction(this.page);
    await this.hold(0.4);
  }

  async dragBetween(start, destination, modifier, seconds = 1.3) {
    await this.clearCaption();
    if (modifier) await this.page.keyboard.down(modifier);
    try {
      await this.move(start);
      this.dragLabel = modifier ? 'Ctrl / ⌘ + drag' : 'Drag';
      this.markAction('drag', this.dragLabel);
      await this.page.mouse.down();
      await this.pressed(true);
      await this.pulse(this.dragLabel, null, 0.27);
      await this.move(destination, seconds);
      await this.page.mouse.up();
      await this.pressed(false);
      await this.pulse('Release', null, 0.27);
    } finally {
      this.dragLabel = null;
      if (modifier) await this.page.keyboard.up(modifier);
      await hideAction(this.page);
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
    await this.click(locator);
    this.markAction('type', 'Type');
    await showAction(this.page, this.pointer, 'Type', await locator.boundingBox());
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    const chunks = String(value).match(/[\s\S]{1,24}/g) || [''];
    for (const chunk of chunks) {
      await this.page.keyboard.insertText(chunk);
      await this.frame(Math.max(1, Math.round(this.fps * 0.12)));
    }
    await this.hold(0.35);
    await hideAction(this.page);
  }

  async paste(locator, value) {
    await this.click(locator);
    this.markAction('paste', 'Paste');
    await showAction(this.page, this.pointer, 'Paste', await locator.boundingBox());
    await this.page.keyboard.press('Control+A');
    // Insert the complete clipboard-sized value in one real input event. Partial
    // FASTA/profile records would briefly show validation errors while typing.
    await this.page.keyboard.insertText(String(value));
    await this.hold(0.6);
    await hideAction(this.page);
  }

  async select(locator, value) {
    await this.clearCaption();
    await this.move(await center(locator));
    this.markAction('select', 'Choose option');
    await this.pulse('Choose option', await locator.boundingBox());
    const index = await locator.evaluate((element, value) =>
      [...element.options].findIndex(option => option.value === value), value);
    if (index < 0) throw new Error(`Missing select option: ${value}`);
    await locator.focus();
    await this.page.keyboard.press('Home');
    for (let step = 0; step < index; step++) await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    // Chromium can open the native popup on Enter after closed-select arrow
    // changes. Dismiss it so it cannot cover the next instruction card.
    await this.page.keyboard.press('Escape');
    await this.hold(0.6);
    await hideAction(this.page);
  }

  async wheel(locator, deltaY, modifier) {
    await this.clearCaption();
    await this.move(await center(locator));
    const label = modifier ? 'Ctrl / ⌘ + scroll' : 'Scroll';
    this.markAction('scroll', label);
    if (modifier) await this.page.keyboard.down(modifier);
    try {
      for (let step = 0; step < 6; step++) {
        await showAction(this.page, this.pointer, label, null, step / 6);
        await this.page.mouse.wheel(0, deltaY / 6);
        await this.page.waitForTimeout(35);
        await this.hold(0.13);
      }
    } finally { if (modifier) await this.page.keyboard.up(modifier); }
    await hideAction(this.page);
    await this.hold(0.4);
  }

  async press(key, modifier, afterAction) {
    await this.clearCaption();
    const label = modifier ? `${modifier} + ${key}` : key;
    this.markAction('key', label);
    await showAction(this.page, this.pointer, label);
    if (modifier) await this.page.keyboard.down(modifier);
    try { await this.page.keyboard.press(key); }
    finally { if (modifier) await this.page.keyboard.up(modifier); }
    if (afterAction) await afterAction();
    await this.hold(0.5);
    await hideAction(this.page);
  }

  async finish() {
    await this.clearCaption();
    await hideAction(this.page);
    await this.hold(0.8);
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
  await fs.writeFile(file, serializeCaptions(cues, duration));
}
