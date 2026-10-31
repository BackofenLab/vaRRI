const assetRoot = new URL('../../doc/demos/', import.meta.url);

export const assetUrl = asset => {
  const url = new URL(asset.file, assetRoot);
  url.searchParams.set('v', asset.sha256.slice(0, 10));
  return url.href;
};

export function addVideoAssets(video, clip, { showCaptions = true } = {}) {
  const document = video.ownerDocument;
  const source = document.createElement('source');
  source.src = assetUrl(clip.assets.video);
  source.type = clip.assets.video.mime;
  const track = document.createElement('track');
  track.kind = 'captions';
  track.src = assetUrl(clip.assets.captions);
  track.srclang = 'en';
  track.label = 'English';
  track.default = showCaptions;
  const fallback = document.createElement('a');
  fallback.href = source.src;
  fallback.textContent = 'Download the WebM demonstration';
  video.append(source, track, fallback);
  if (!showCaptions) {
    // Compact players already contain centered instruction cards. Keep optional
    // captions ready, and place them above the card if the viewer enables them.
    track.track.mode = 'hidden';
    track.addEventListener('load', () => {
      for (const cue of track.track.cues || []) cue.line = 0;
    });
  }
  return source;
}

export function pauseOtherVideos(video) {
  video.ownerDocument.querySelectorAll('.help-demo-player video, .help-action-preview video, .help-control-preview video')
    .forEach(other => { if (other !== video) other.pause(); });
}
