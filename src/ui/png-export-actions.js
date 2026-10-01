import { validatePNGOptions } from '../core/model/png-options.js';

export function createPNGExportActions({ api, state, actions, document }) {
  let aspectRatio = 1;
  let pending = null;
  function cancelPNGExport() {
    pending?.abort();
    pending = null;
    state.pngExport.busy = false;
    const dialog = document.getElementById('pngExportDialog');
    if (dialog?.open) dialog.close();
  }
  async function download() {
    if (pending) return;
    const settings = state.pngExport;
    settings.error = '';
    let options;
    try {
      options = validatePNGOptions({ width: Number(settings.width),
        height: Number(settings.height), dpi: Number(settings.dpi) });
    } catch (error) { settings.error = error.message; return; }
    const controller = new AbortController();
    pending = controller;
    settings.busy = true;
    try {
      await api.downloadPNG('rendering-canvas', 'vaRRI_output.png', {
        ...options, signal: controller.signal,
      });
      if (!controller.signal.aborted) document.getElementById('pngExportDialog')?.close('ok');
    } catch (error) {
      if (!controller.signal.aborted) settings.error = `PNG export failed: ${error.message}`;
    } finally {
      if (pending === controller) { pending = null; settings.busy = false; }
    }
  }
  return {
    cancelPNGExport,
    exportPNG() {
      const container = document.getElementById('rendering-canvas');
      const svg = container?.querySelector('svg');
      if (!svg) { actions.showMsg('Render a visualization before exporting a PNG.', 'error'); return; }
      const width = svg.clientWidth || container.clientWidth;
      const height = svg.clientHeight || container.clientHeight;
      if (!width || !height) { actions.showMsg('The canvas has no visible size.', 'error'); return; }
      aspectRatio = width / height;
      state.pngExport = { width: String(width), height: String(height), dpi: '96', error: '', busy: false };
      actions.openDialog('pngExportDialog', 'Export PNG', '', null,
        () => { void download(); return false; }, cancelPNGExport);
    },
    updatePNGDimension(dimension, value) {
      const settings = state.pngExport;
      settings[dimension] = value;
      settings.error = '';
      const number = Number(value);
      if (!Number.isInteger(number) || number <= 0) return;
      const other = dimension === 'width' ? 'height' : 'width';
      settings[other] = String(Math.max(1, Math.round(dimension === 'width'
        ? number / aspectRatio : number * aspectRatio)));
    },
  };
}
