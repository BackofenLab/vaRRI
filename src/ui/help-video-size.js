/** Keep native playback controls available while offering a larger inline view. */
export function addVideoSizeControl(popup, video, summary, position) {
  const button = video.ownerDocument.createElement('button');
  const surface = video.ownerDocument.createElement('div');
  surface.className = 'help-video-surface';
  const picture = video.ownerDocument.createElement('button');
  picture.type = 'button';
  picture.className = 'help-video-enlarge';
  picture.tabIndex = -1;
  button.type = 'button';
  button.className = 'help-video-size';
  const update = expanded => {
    popup.classList.toggle('help-control-preview-large', expanded);
    button.textContent = expanded ? 'Click video to shrink' : 'Click video to enlarge';
    button.setAttribute('aria-label', expanded ? 'Shrink video' : 'Enlarge video');
    button.setAttribute('aria-expanded', String(expanded));
    picture.setAttribute('aria-label', expanded ? 'Shrink video view' : 'Enlarge video view');
    position();
  };
  const toggle = () => update(!popup.classList.contains('help-control-preview-large'));
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  });
  // Firefox consumes clicks inside native video controls, including the picture.
  // Keep a separate picture target above it and leave the control strip exposed.
  picture.addEventListener('click', toggle);
  surface.append(video, picture);
  summary.append(' ', button);
  update(false);
  return { surface, reset: () => update(false) };
}
