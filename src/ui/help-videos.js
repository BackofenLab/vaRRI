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
  trigger.textContent = `▶ Watch ${Math.ceil(clip.duration)} s demo`;

  const teaser = document.createElement('div');
  teaser.className = 'help-demo-teaser';
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
    video.addEventListener('play', () => {
      document.querySelectorAll('.help-demo-player video').forEach(other => {
        if (other !== video) other.pause();
      });
    });
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
  const hideTeaser = () => { clearTimeout(teaserTimer); teaser.hidden = true; };
  const showTeaser = delay => {
    if (expanded) return;
    clearTimeout(teaserTimer);
    teaserTimer = setTimeout(() => {
      if (!teaserImage.src) teaserImage.src = assetUrl(clip.assets.poster);
      teaser.hidden = false;
    }, delay);
  };
  const collapse = () => {
    expanded = false;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = `▶ Watch ${Math.ceil(clip.duration)} s demo`;
    figure.hidden = true;
    if (video) { video.pause(); video.currentTime = 0; }
  };
  const expand = () => {
    expanded = true;
    hideTeaser();
    buildVideo();
    trigger.setAttribute('aria-expanded', 'true');
    trigger.textContent = 'Hide demo';
    figure.hidden = false;
  };
  const toggle = () => expanded ? collapse() : expand();
  const pointerEnter = event => {
    if (event.pointerType !== 'touch' && window?.matchMedia?.('(hover: hover)').matches) showTeaser(300);
  };
  const pointerLeave = () => { if (!expanded) hideTeaser(); };
  const focusIn = () => showTeaser(0);
  const focusOut = event => { if (!target.contains(event.relatedTarget) && !expanded) hideTeaser(); };
  trigger.addEventListener('click', toggle);
  target.addEventListener('pointerenter', pointerEnter);
  target.addEventListener('pointerleave', pointerLeave);
  target.addEventListener('focusin', focusIn);
  target.addEventListener('focusout', focusOut);
  target.append(trigger, teaser, figure);
  const dialog = target.closest('dialog');
  dialog?.addEventListener('close', collapse);
  return () => {
    clearTimeout(teaserTimer);
    video?.pause();
    trigger.removeEventListener('click', toggle);
    target.removeEventListener('pointerenter', pointerEnter);
    target.removeEventListener('pointerleave', pointerLeave);
    target.removeEventListener('focusin', focusIn);
    target.removeEventListener('focusout', focusOut);
    dialog?.removeEventListener('close', collapse);
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
  }).catch(error => {
    if (!disposed) root.querySelectorAll('[data-help-demo]').forEach(target => {
      target.classList.add('help-demo-unavailable');
      target.textContent = 'Video help is unavailable; the written instructions remain complete.';
      target.title = error.message;
    });
  });
  return () => { disposed = true; cleanup.splice(0).forEach(dispose => dispose()); };
}
