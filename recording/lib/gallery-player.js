// Explicit playback avoids unsolicited motion and downloads. Reduced-motion
// users can still play clips, but they do not loop automatically.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const videos = [...document.querySelectorAll('video')];
function updateMotion() { videos.forEach(video => { video.loop = !motion.matches; }); }
updateMotion();
motion.addEventListener('change', updateMotion);
videos.forEach(video => video.addEventListener('play', () => {
  videos.filter(other => other !== video).forEach(other => other.pause());
}));
