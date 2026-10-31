const manifestUrl = new URL('../../doc/demos/manifest.json', import.meta.url);
const assetRoot = new URL('../../doc/demos/', import.meta.url);
let manifestPromise;
let instance = 0;

function loadManifest() {
  manifestPromise ||= fetch(manifestUrl).then(response => {
    if (!response.ok) throw new Error(`Demo manifest: HTTP ${response.status}`);
    return response.json();
  });
  return manifestPromise;
}

const assetUrl = asset => {
  const url = new URL(asset.file, assetRoot);
  url.searchParams.set('v', asset.sha256.slice(0, 10));
  return url.href;
};

function addVideoAssets(video, clip) {
  const document = video.ownerDocument;
  const source = document.createElement('source');
  source.src = assetUrl(clip.assets.video);
  source.type = clip.assets.video.mime;
  const track = document.createElement('track');
  track.kind = 'captions';
  track.src = assetUrl(clip.assets.captions);
  track.srclang = 'en';
  track.label = 'English';
  track.default = true;
  const fallback = document.createElement('a');
  fallback.href = source.src;
  fallback.textContent = 'Download the WebM demonstration';
  video.append(source, track, fallback);
  return source;
}

function pauseOtherVideos(video) {
  video.ownerDocument.querySelectorAll('.help-demo-player video, .help-action-preview video').forEach(other => {
    if (other !== video) other.pause();
  });
}

function createPlayer(target, clip) {
  const document = target.ownerDocument;
  const window = document.defaultView;
  const id = `help-demo-${clip.id}-${++instance}`;
  target.classList.add('help-demo');
  if (target.closest('.canvas-help-dialog')) target.classList.add('help-demo-compact');
  target.dataset.helpDemoReady = 'true';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'help-demo-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', id);
  const buttonText = target.closest('.controls-column')
    ? `▶ ${clip.title} · ${Math.ceil(clip.duration)} s` : `▶ Watch ${Math.ceil(clip.duration)} s demo`;
  trigger.textContent = buttonText;
  const watchLabel = `Watch ${Math.ceil(clip.duration)} s demo: ${clip.title}`;
  trigger.setAttribute('aria-label', watchLabel);

  const teaser = document.createElement('div');
  teaser.className = 'help-demo-teaser';
  teaser.id = `${id}-preview`;
  teaser.setAttribute('role', 'tooltip');
  trigger.setAttribute('aria-describedby', teaser.id);
  teaser.hidden = true;
  const teaserImage = document.createElement('img');
  teaserImage.alt = '';
  teaserImage.width = clip.width;
  teaserImage.height = clip.height;
  const teaserText = document.createElement('span');
  teaserText.textContent = clip.description;
  teaser.append(teaserImage, teaserText);

  const figure = document.createElement('figure');
  figure.id = id;
  figure.className = 'help-demo-player';
  figure.hidden = true;
  let video;
  const buildVideo = () => {
    if (video) return video;
    video = document.createElement('video');
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none';
    video.width = clip.width;
    video.height = clip.height;
    video.poster = assetUrl(clip.assets.poster);
    video.setAttribute('aria-label', clip.title);
    video.setAttribute('aria-describedby', `${id}-description`);
    const source = addVideoAssets(video, clip);
    video.addEventListener('play', () => pauseOtherVideos(video));
    const caption = document.createElement('figcaption');
    caption.id = `${id}-description`;
    caption.textContent = clip.description;
    const transcript = document.createElement('details');
    transcript.className = 'help-demo-transcript';
    const summary = document.createElement('summary');
    summary.textContent = 'Step-by-step transcript';
    const list = document.createElement('ol');
    clip.transcript.forEach(step => {
      const item = document.createElement('li');
      item.textContent = step;
      list.append(item);
    });
    transcript.append(summary, list);
    const download = document.createElement('a');
    download.className = 'help-demo-download';
    download.href = source.src;
    download.download = clip.assets.video.file;
    download.textContent = 'Download WebM';
    figure.append(video, caption, transcript, download);
    return video;
  };

  let expanded = false;
  let teaserTimer;
  let pointerInside = false;
  let focusedInside = false;
  let previewDismissed = false;
  const dialog = target.closest('dialog');
  const hideTeaser = () => { clearTimeout(teaserTimer); teaserTimer = undefined; teaser.hidden = true; };
  const positionTeaser = () => {
    if (teaser.hidden) return;
    const anchor = target.getBoundingClientRect();
    const bounds = { left: 8, right: window.innerWidth - 8, top: 8, bottom: window.innerHeight - 8 };
    if (dialog) {
      const box = dialog.getBoundingClientRect();
      bounds.left = Math.max(bounds.left, box.left + 8);
      bounds.right = Math.min(bounds.right, box.right - 8);
      bounds.top = Math.max(bounds.top, box.top + 8);
      bounds.bottom = Math.min(bounds.bottom, box.bottom - 8);
      const footer = dialog.querySelector('.dialog-actions')?.getBoundingClientRect();
      if (footer && footer.top < bounds.bottom && footer.bottom > bounds.top) bounds.bottom = footer.top;
    }
    if (anchor.bottom <= bounds.top || anchor.top >= bounds.bottom) { hideTeaser(); return; }
    teaser.style.maxWidth = `${Math.max(0, bounds.right - bounds.left)}px`;
    teaser.style.maxHeight = '';
    teaserImage.style.maxHeight = '';
    const below = Math.max(0, bounds.bottom - anchor.bottom);
    const above = Math.max(0, anchor.top - bounds.top);
    const showAbove = teaser.getBoundingClientRect().height > below && above > below;
    const available = showAbove ? above : below;
    const descriptionHeight = teaser.getBoundingClientRect().height - teaserImage.getBoundingClientRect().height;
    teaserImage.style.maxHeight = `${Math.max(0, available - descriptionHeight)}px`;
    teaser.style.maxHeight = `${available}px`;
    const size = teaser.getBoundingClientRect();
    teaser.style.left = `${Math.max(bounds.left, Math.min(anchor.left, bounds.right - size.width)) - anchor.left}px`;
    teaser.style.top = `${showAbove ? -size.height : anchor.height}px`;
  };
  const showTeaser = delay => {
    if (expanded || previewDismissed || target.closest('.controls-column')) return;
    clearTimeout(teaserTimer);
    teaserTimer = setTimeout(() => {
      teaserTimer = undefined;
      if (!teaserImage.src) teaserImage.src = assetUrl(clip.assets.poster);
      teaser.hidden = false;
      positionTeaser();
    }, delay);
  };
  const collapse = () => {
    hideTeaser();
    expanded = false;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = buttonText;
    trigger.setAttribute('aria-label', watchLabel);
    figure.hidden = true;
    if (video) { video.pause(); video.currentTime = 0; }
  };
  const expand = () => {
    expanded = true;
    hideTeaser();
    buildVideo();
    trigger.setAttribute('aria-expanded', 'true');
    trigger.textContent = 'Hide demo';
    trigger.setAttribute('aria-label', `Hide demo: ${clip.title}`);
    figure.hidden = false;
    if (target.closest('.controls-column')) video.scrollIntoView({ block: 'nearest' });
  };
  const toggle = () => expanded ? collapse() : expand();
  const pointerEnter = event => {
    if (event.pointerType !== 'touch' && window?.matchMedia?.('(hover: hover)').matches) {
      pointerInside = true;
      showTeaser(300);
    }
  };
  const leavePreview = () => {
    if (!pointerInside && !focusedInside) { hideTeaser(); previewDismissed = false; }
  };
  const pointerLeave = () => { pointerInside = false; leavePreview(); };
  const focusIn = () => { focusedInside = true; showTeaser(0); };
  const focusOut = event => {
    if (!target.contains(event.relatedTarget)) { focusedInside = false; leavePreview(); }
  };
  const dismissPreview = event => {
    if (event.key !== 'Escape' || teaser.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    previewDismissed = true;
    hideTeaser();
  };
  trigger.addEventListener('click', toggle);
  target.addEventListener('pointerenter', pointerEnter);
  target.addEventListener('pointerleave', pointerLeave);
  target.addEventListener('focusin', focusIn);
  target.addEventListener('focusout', focusOut);
  document.addEventListener('keydown', dismissPreview);
  window.addEventListener('resize', positionTeaser);
  window.addEventListener('scroll', positionTeaser, true);
  teaserImage.addEventListener('load', positionTeaser);
  target.append(trigger, teaser, figure);
  dialog?.addEventListener('close', collapse);
  const sections = [target.closest('.panel-video-guides'), target.closest('.control-group')].filter(Boolean);
  const closeSection = event => { if (!event.currentTarget.open) collapse(); };
  sections.forEach(section => section.addEventListener('toggle', closeSection));
  return () => {
    clearTimeout(teaserTimer);
    video?.pause();
    trigger.removeEventListener('click', toggle);
    target.removeEventListener('pointerenter', pointerEnter);
    target.removeEventListener('pointerleave', pointerLeave);
    target.removeEventListener('focusin', focusIn);
    target.removeEventListener('focusout', focusOut);
    document.removeEventListener('keydown', dismissPreview);
    window.removeEventListener('resize', positionTeaser);
    window.removeEventListener('scroll', positionTeaser, true);
    teaserImage.removeEventListener('load', positionTeaser);
    dialog?.removeEventListener('close', collapse);
    sections.forEach(section => section.removeEventListener('toggle', closeSection));
  };
}

function createActionPreview(target, clip) {
  const document = target.ownerDocument;
  const window = document.defaultView;
  const id = `help-action-preview-${clip.id}-${++instance}`;
  const previousDescription = target.getAttribute('aria-describedby');
  target.classList.add('help-action-target');
  target.dataset.helpPreviewReady = 'true';
  target.setAttribute('aria-describedby', [previousDescription, id].filter(Boolean).join(' '));

  const preview = document.createElement('div');
  preview.id = id;
  preview.className = 'help-action-preview';
  preview.dataset.helpFor = clip.id;
  preview.setAttribute('role', 'tooltip');
  preview.hidden = true;
  const copy = document.createElement('div');
  copy.className = 'help-action-preview-copy';
  const title = document.createElement('strong');
  title.textContent = `${clip.title} · ${Math.ceil(clip.duration)} s`;
  const description = document.createElement('span');
  description.textContent = clip.description;
  copy.append(title, description);
  document.body.append(preview);

  let video;
  let timer;
  let pointerInside = false;
  let focused = false;
  let dismissed = false;
  const buildVideo = () => {
    if (video) return video;
    video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.width = clip.width;
    video.height = clip.height;
    video.poster = assetUrl(clip.assets.poster);
    video.setAttribute('aria-label', clip.title);
    video.setAttribute('aria-hidden', 'true');
    addVideoAssets(video, clip);
    video.addEventListener('play', () => pauseOtherVideos(video));
    preview.prepend(video);
    preview.append(copy);
    return video;
  };
  const position = () => {
    if (preview.hidden) return;
    const margin = 8;
    const gap = 8;
    const anchor = target.getBoundingClientRect();
    const panel = target.closest('.result-panel')?.getBoundingClientRect();
    const leftBound = Math.max(margin, (panel?.left ?? 0) + margin);
    const rightBound = Math.min(window.innerWidth - margin, (panel?.right ?? window.innerWidth) - margin);
    preview.style.maxWidth = `${Math.max(0, rightBound - leftBound)}px`;
    const box = preview.getBoundingClientRect();
    if (anchor.bottom < 0 || anchor.top > window.innerHeight) { hide(); return; }
    const below = window.innerHeight - anchor.bottom - gap;
    const above = anchor.top - gap;
    const useAbove = above >= box.height || above > below;
    const top = useAbove ? anchor.top - box.height - gap : anchor.bottom + gap;
    preview.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - box.height - margin))}px`;
    const centered = anchor.left + anchor.width / 2 - box.width / 2;
    preview.style.left = `${Math.max(leftBound, Math.min(centered, rightBound - box.width))}px`;
  };
  const hide = () => {
    clearTimeout(timer);
    timer = undefined;
    preview.hidden = true;
    if (video) { video.pause(); video.currentTime = 0; }
  };
  const show = delay => {
    if (dismissed) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      const media = buildVideo();
      preview.style.visibility = 'hidden';
      preview.hidden = false;
      position();
      preview.style.visibility = '';
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) media.play().catch(() => {});
    }, delay);
  };
  const leave = () => {
    if (!pointerInside && !focused) { dismissed = false; hide(); }
  };
  const pointerEnter = event => {
    if (event.pointerType === 'touch' || !window.matchMedia?.('(hover: hover)').matches) return;
    pointerInside = true;
    dismissed = false;
    show(250);
  };
  const pointerLeave = () => { pointerInside = false; leave(); };
  const focusIn = () => { focused = true; dismissed = false; show(0); };
  const focusOut = () => { focused = false; leave(); };
  const dismiss = event => {
    if (event.key !== 'Escape' || preview.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    dismissed = true;
    hide();
  };
  target.addEventListener('pointerenter', pointerEnter);
  target.addEventListener('pointerleave', pointerLeave);
  target.addEventListener('focusin', focusIn);
  target.addEventListener('focusout', focusOut);
  document.addEventListener('keydown', dismiss);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  return () => {
    clearTimeout(timer);
    video?.pause();
    target.removeEventListener('pointerenter', pointerEnter);
    target.removeEventListener('pointerleave', pointerLeave);
    target.removeEventListener('focusin', focusIn);
    target.removeEventListener('focusout', focusOut);
    document.removeEventListener('keydown', dismiss);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    target.classList.remove('help-action-target');
    delete target.dataset.helpPreviewReady;
    if (previousDescription) target.setAttribute('aria-describedby', previousDescription);
    else target.removeAttribute('aria-describedby');
    preview.remove();
  };
}

export function enhanceHelpVideos(root = document) {
  let disposed = false;
  const cleanup = [];
  loadManifest().then(manifest => {
    if (disposed) return;
    const clips = new Map(manifest.clips.map(clip => [clip.id, clip]));
    root.querySelectorAll('[data-help-demo]:not([data-help-demo-ready])').forEach(target => {
      const clip = clips.get(target.dataset.helpDemo);
      if (clip) cleanup.push(createPlayer(target, clip));
      else target.textContent = `Demonstration unavailable: ${target.dataset.helpDemo}`;
    });
    root.querySelectorAll('[data-help-preview]:not([data-help-preview-ready])').forEach(target => {
      const clip = clips.get(target.dataset.helpPreview);
      if (clip) cleanup.push(createActionPreview(target, clip));
      else target.title = `${target.title || 'Action'}. Video help is unavailable.`;
    });
  }).catch(error => {
    if (!disposed) root.querySelectorAll('[data-help-demo]').forEach(target => {
      target.classList.add('help-demo-unavailable');
      target.textContent = 'Video help is unavailable; the written instructions remain complete.';
      target.title = error.message;
    });
    if (!disposed) root.querySelectorAll('[data-help-preview]').forEach(target => {
      target.title = `${target.title || 'Action'}. Video help is unavailable: ${error.message}`;
    });
  });
  return () => { disposed = true; cleanup.splice(0).forEach(dispose => dispose()); };
}
