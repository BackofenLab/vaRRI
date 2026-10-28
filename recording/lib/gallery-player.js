// Explicit playback avoids unsolicited motion and downloads.
const videos = [...document.querySelectorAll('video')];
videos.forEach(video => video.addEventListener('play', () => {
  videos.filter(other => other !== video).forEach(other => other.pause());
}));
