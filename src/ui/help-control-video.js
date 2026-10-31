import { assetUrl, addVideoAssets, pauseOtherVideos } from './help-video-assets.js';

let instance = 0;
const openPreviews = new Set();

export function createControlVideo(target, clip) {
  const document = target.ownerDocument;
  const window = document.defaultView;
  const section = target.closest('.control-group');
  const popup = document.createElement('section');
  popup.id = `control-video-${clip.id}-${++instance}`;
  popup.className = 'help-control-preview';
  popup.dataset.helpFor = clip.id;
  popup.hidden = true;
  popup.setAttribute('role', 'region');
  popup.setAttribute('aria-label', `${clip.title} video guide`);
  document.body.append(popup);
  target.dataset.helpVideoReady = 'true';
  target.setAttribute('aria-controls', popup.id);
  target.setAttribute('aria-label', `Video guide: ${clip.title}`);

  let video, closeButton, showTimer, hideTimer;
  let pinned = false;
  let dismissed = false;
  let overTarget = false;
  let overPopup = false;
  const hasFocus = () => target === document.activeElement || popup.contains(document.activeElement);
  const build = () => {
    if (video) return;
    const header = document.createElement('div');
    header.className = 'help-control-preview-heading';
    const title = document.createElement('strong');
    title.textContent = `${clip.title} · ${Math.ceil(clip.duration)} s`;
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'help-control-preview-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close video guide');
    closeButton.addEventListener('click', () => dismiss(true));
    header.append(title, closeButton);
    video = document.createElement('video');
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none';
    video.width = clip.width;
    video.height = clip.height;
    video.poster = assetUrl(clip.assets.poster);
    video.setAttribute('aria-label', clip.title);
    const source = addVideoAssets(video, clip, { showCaptions: false });
    video.addEventListener('play', () => pauseOtherVideos(video));
    const description = document.createElement('p');
    description.textContent = clip.description;
    const transcript = document.createElement('details');
    transcript.className = 'help-demo-transcript';
    const summary = document.createElement('summary');
    summary.textContent = 'Step-by-step transcript';
    const list = document.createElement('ol');
    for (const step of clip.transcript) {
      const item = document.createElement('li');
      item.textContent = step;
      list.append(item);
    }
    transcript.append(summary, list);
    transcript.addEventListener('toggle', position);
    const download = document.createElement('a');
    download.className = 'help-demo-download';
    download.href = source.src;
    download.download = clip.assets.video.file;
    download.textContent = 'Download WebM';
    popup.append(header, video, description, transcript, download);
  };

  function hide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    popup.hidden = true;
    pinned = false;
    overPopup = false;
    target.setAttribute('aria-expanded', 'false');
    if (video) { video.pause(); video.currentTime = 0; }
    openPreviews.delete(hide);
  }

  function position() {
    if (popup.hidden) return;
    const margin = 8, gap = 8;
    const anchor = target.getBoundingClientRect();
    const column = target.closest('.controls-column')?.getBoundingClientRect();
    if (!target.getClientRects().length || anchor.bottom <= Math.max(margin, column?.top ?? 0) ||
        anchor.top >= Math.min(window.innerHeight - margin, column?.bottom ?? window.innerHeight)) {
      hide();
      return;
    }
    popup.style.maxHeight = `${window.innerHeight - margin * 2}px`;
    const box = popup.getBoundingClientRect();
    let left = anchor.right + gap;
    if (left + box.width > window.innerWidth - margin) left = anchor.left - gap - box.width;
    let top = anchor.top;
    if (left < margin) {
      left = margin;
      top = anchor.bottom + gap;
      if (top + box.height > window.innerHeight - margin) top = anchor.top - gap - box.height;
    }
    popup.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - box.width - margin))}px`;
    popup.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - box.height - margin))}px`;
  }

  function show(explicit = false) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (dismissed && !explicit) return;
    const wasHidden = popup.hidden;
    for (const close of openPreviews) if (close !== hide) close();
    build();
    popup.hidden = false;
    target.setAttribute('aria-expanded', 'true');
    openPreviews.add(hide);
    position();
    if (!popup.hidden && (wasHidden || explicit) &&
        (explicit || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      video.play().catch(() => {});
    }
  }

  function dismiss(restoreFocus = false) {
    dismissed = true;
    hide();
    if (restoreFocus) target.focus({ preventScroll: true });
  }

  const leave = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!overTarget && !overPopup && !hasFocus()) {
        dismissed = false;
        if (!pinned) hide();
      }
    }, 180);
  };
  const enterTarget = event => {
    if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover)').matches) return;
    overTarget = true;
    dismissed = false;
    clearTimeout(hideTimer);
    showTimer = setTimeout(() => show(), 180);
  };
  const leaveTarget = () => { overTarget = false; leave(); };
  const enterPopup = () => { overPopup = true; clearTimeout(hideTimer); };
  const leavePopup = () => { overPopup = false; leave(); };
  const focus = () => { clearTimeout(hideTimer); show(); };
  const pin = () => {
    if (pinned) { dismiss(true); return; }
    dismissed = false;
    show(true);
    pinned = true;
    closeButton.focus({ preventScroll: true });
  };
  const keyboard = event => {
    if (event.key === 'Escape' && !popup.hidden) {
      event.preventDefault();
      event.stopPropagation();
      dismiss(hasFocus());
    } else if (event.key === 'Tab' && !event.shiftKey && event.target === target && !popup.hidden) {
      event.preventDefault();
      closeButton.focus({ preventScroll: true });
    } else if (event.key === 'Tab' && event.shiftKey && event.target === closeButton) {
      event.preventDefault();
      target.focus({ preventScroll: true });
    }
  };
  const outside = event => { if (!target.contains(event.target) && !popup.contains(event.target)) hide(); };
  const sectionToggle = () => { if (!section.open) hide(); };
  const visibility = () => { if (document.hidden) hide(); };
  target.addEventListener('pointerenter', enterTarget);
  target.addEventListener('pointerleave', leaveTarget);
  target.addEventListener('focusin', focus);
  target.addEventListener('focusout', leave);
  target.addEventListener('click', pin);
  target.addEventListener('keydown', keyboard);
  popup.addEventListener('pointerenter', enterPopup);
  popup.addEventListener('pointerleave', leavePopup);
  popup.addEventListener('focusin', () => clearTimeout(hideTimer));
  popup.addEventListener('focusout', leave);
  document.addEventListener('keydown', keyboard);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  section?.addEventListener('toggle', sectionToggle);
  return () => {
    hide();
    target.removeEventListener('pointerenter', enterTarget);
    target.removeEventListener('pointerleave', leaveTarget);
    target.removeEventListener('focusin', focus);
    target.removeEventListener('focusout', leave);
    target.removeEventListener('click', pin);
    target.removeEventListener('keydown', keyboard);
    document.removeEventListener('keydown', keyboard);
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    section?.removeEventListener('toggle', sectionToggle);
    target.removeAttribute('aria-controls');
    delete target.dataset.helpVideoReady;
    popup.remove();
  };
}
