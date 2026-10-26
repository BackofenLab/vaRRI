import { nextTick } from 'vue';
import { decodeJsonState, encodeJsonState } from '../core/model/json-state.js';
import { createProfilesController } from './controllers/profiles.js';

export function createJSONFileActions({ api, state, defaults, actions, document }) {
  const window = document.defaultView;
  let generation = 0;
  let disposed = false;
  let pending = null;
  const downloads = new Map();

  function cancelJSONLoad() {
    generation++;
    pending?.abort();
    pending = null;
    state.jsonLoading = false;
  }
  function generateJSON() {
    return encodeJsonState({ ...actions.getSessionState(), showRenderingOnly: state.renderingOnly });
  }
  async function loadJSON(input) {
    if (disposed) return false;
    cancelJSONLoad();
    try {
      const decoded = decodeJsonState(input);
      const fields = { ...defaults, ...decoded.fields };
      // Validate against the incoming session before clearing any current work.
      const args = { ...fields, ...decoded.annotations };
      const validated = api.validate(args);
      const profiles = createProfilesController({ api, state: { fields }, actions: {} });
      for (const id of ['profileData1', 'profileData2']) profiles.convertCsvProfileData(id);
      profiles.parseProfileAccessData(validated, args);
      actions.clearAll();
      const currentGeneration = generation;
      Object.assign(state.fields, fields);
      state.renderingOnly = state.showFullPage = decoded.showRenderingOnly;
      actions.applySessionState({ ...decoded, fields }, {
        revealProfilePanel: Boolean(fields.profileData1.trim() || fields.profileData2.trim()),
      });
      await nextTick();
      if (disposed || currentGeneration !== generation) return false;
      await actions.runVisualization();
      return !disposed && currentGeneration === generation;
    } catch (error) {
      if (!disposed) actions.showMsg(`JSON load error: ${error.message}`, 'error');
      return false;
    }
  }
  function loadFiles(files) {
    if (disposed || !files?.length) return Promise.resolve(false);
    cancelJSONLoad();
    if (files.length !== 1) {
      actions.showMsg('JSON load error: Select or drop one JSON file at a time.', 'error');
      return Promise.resolve(false);
    }
    const currentGeneration = generation;
    state.jsonLoading = true;
    return new Promise(resolve => {
      const reader = new window.FileReader();
      pending = reader;
      const finish = () => {
        if (pending === reader) { pending = null; state.jsonLoading = false; }
      };
      reader.onload = () => {
        finish();
        if (disposed || currentGeneration !== generation) { resolve(false); return; }
        resolve(loadJSON(String(reader.result)));
      };
      reader.onerror = () => {
        finish();
        if (!disposed && currentGeneration === generation) actions.showMsg('JSON load error: Could not read the selected file.', 'error');
        resolve(false);
      };
      reader.onabort = () => { finish(); resolve(false); };
      reader.readAsText(files[0]);
    });
  }
  function releaseDownload(url) {
    window.clearTimeout(downloads.get(url));
    downloads.delete(url);
    window.URL.revokeObjectURL(url);
  }
  return {
    generateJSON, loadJSON, cancelJSONLoad,
    openJSONFile() { document.getElementById('loadJsonInput')?.click(); },
    selectJSONFile(event) {
      const result = loadFiles(event.target.files);
      event.target.value = '';
      return result;
    },
    dropJSONFile(event) {
      event.currentTarget.classList.remove('drag-over');
      return loadFiles(event.dataTransfer?.files);
    },
    storeJSON() {
      try {
        const blob = new window.Blob([generateJSON()], { type: 'application/json;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        downloads.set(url, window.setTimeout(() => releaseDownload(url), 1000));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vaRRI_session.json';
        document.body.append(link);
        try { link.click(); } finally { link.remove(); }
      } catch (error) { actions.showMsg(`JSON store error: ${error.message}`, 'error'); }
    },
    disposeJSONFiles() {
      disposed = true;
      cancelJSONLoad();
      for (const url of downloads.keys()) releaseDownload(url);
    },
  };
}
