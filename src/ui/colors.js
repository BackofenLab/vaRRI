/** CSS color conversion is scoped to the viewer's document. */
export function createColorHelpers(document) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');
  function channels(css) {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data;
  }
  return {
    cssColorToHex(css) {
      return '#' + [...channels(css)].slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('');
    },
    cssColorToRGB(css, alpha = 1) {
      return `rgb(${[...channels(css)].slice(0, 3).join(',')},${alpha})`;
    },
  };
}
