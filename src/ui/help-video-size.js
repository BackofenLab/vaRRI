/** Keep native playback controls available while offering a larger inline view. */
export function addVideoSizeControl(popup, video, summary, position) {
  const button = video.ownerDocument.createElement('button');
  button.type = 'button';
  button.className = 'help-video-size';
  const update = expanded => {
    popup.classList.toggle('help-control-preview-large', expanded);
    button.textContent = expanded ? 'Click video to shrink' : 'Click video to enlarge';
    button.setAttribute('aria-label', expanded ? 'Shrink video' : 'Enlarge video');
    button.setAttribute('aria-expanded', String(expanded));
    position();
  };
  const toggle = () => update(!popup.classList.contains('help-control-preview-large'));
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  });
  video.addEventListener('click', event => {
    // The lower strip belongs to the native playback, caption and volume controls.
    const box = video.getBoundingClientRect();
    if (event.clientY < box.bottom - 48) toggle();
  });
  summary.append(' ', button);
  update(false);
  return () => update(false);
}
