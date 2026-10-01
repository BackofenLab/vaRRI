import { viewerComponent } from './context.js';
import { MAX_PNG_DIMENSION, MAX_PNG_DPI } from '../../core/model/png-options.js';

export default viewerComponent('png-export-dialog', `<dialog id="pngExportDialog" class="app-dialog png-export-dialog" aria-labelledby="pngExportTitle" v-on:close="actions.closeDialog('pngExportDialog')">
  <form method="dialog" v-on:submit="actions.submitDialog('pngExportDialog', $event)">
    <div class="dialog-header" id="pngExportTitle">Export PNG</div>
    <div class="dialog-body">
      <div class="png-resolution">
        <label for="pngWidth">Width (px)
          <input id="pngWidth" type="number" min="1" max="${MAX_PNG_DIMENSION}" step="1" required v-bind:disabled="state.pngExport.busy" v-bind:value="state.pngExport.width" v-on:input="actions.updatePNGDimension('width', $event.target.value)" aria-describedby="pngAspectHint">
        </label>
        <label for="pngHeight">Height (px)
          <input id="pngHeight" type="number" min="1" max="${MAX_PNG_DIMENSION}" step="1" required v-bind:disabled="state.pngExport.busy" v-bind:value="state.pngExport.height" v-on:input="actions.updatePNGDimension('height', $event.target.value)" aria-describedby="pngAspectHint">
        </label>
      </div>
      <p id="pngAspectHint" class="png-hint">Aspect ratio stays locked to the current canvas.</p>
      <label for="pngDpi">DPI
        <input id="pngDpi" type="number" min="1" max="${MAX_PNG_DPI}" step="any" required v-model="state.pngExport.dpi" v-bind:disabled="state.pngExport.busy" aria-describedby="pngDpiHint">
      </label>
      <p id="pngDpiHint" class="png-hint">Sets the print density. Pixel dimensions stay the same.</p>
      <p class="png-export-error" role="alert" v-if="state.pngExport.error">{{ state.pngExport.error }}</p>
    </div>
    <div class="dialog-actions">
      <button value="ok" class="btn btn-primary" v-bind:disabled="state.pngExport.busy">{{ state.pngExport.busy ? 'Exporting…' : 'Export PNG' }}</button>
      <button value="cancel" class="btn btn-secondary" formnovalidate>Cancel</button>
    </div>
  </form>
</dialog>`);
