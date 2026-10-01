import { viewerComponent } from './context.js';

export default viewerComponent('viewer-panel', `<section class="result-panel">
    <div id="rendering-canvas" tabindex="0" @dragover="actions.overTextAnnotationCanvas($event)"
      @dragleave="actions.leaveTextAnnotationCanvas($event)" @drop="actions.dropTextAnnotation($event)"></div>
    <div id="rendering-caption" v-html="actions.exampleCaption()" v-show="state.selectedExample"></div>
    <div class="viz-control">
      <label for="rotationSlider">Rotate: <span id="rotation" class="rotation-value" v-on:click="actions.openNumberDialog('rotation', $event)">{{ state.rotationPreview }}°</span></label>
      <input type="range" id="rotationSlider" min="-180" max="180" step="1" v-bind:value="state.fields.rotationSlider" v-on:input="actions.inputField('rotationSlider', $event)" v-on:change="actions.commitField('rotationSlider', $event)">
      <label for="cropping">Crop: <span id="cropping-value" class="cropping-value" v-on:click="actions.openNumberDialog('cropping', $event)">{{ state.fields.cropping }}</span></label>
      <div class="input-wrap" v-bind:class="{'has-error': state.errors.cropping}">
        <input type="range" id="cropping" min="-1" max="10" title="-1 disables cropping. Higher values crop the ends to resp. unpaired positions." v-bind:value="state.fields.cropping" v-on:input="actions.inputField('cropping', $event)" v-on:change="actions.commitField('cropping', $event)">
        <span class="field-tooltip">{{ state.errors.cropping || '' }}</span>
      </div>
    </div>
    <div class="export-bar">
      <button id="exportSvgBtn" class="btn btn-success btn-sm" type="button" title="Download rendering in SVG format." v-on:click="actions.exportSVG($event)">⬇ SVG</button>
      <button id="exportPngBtn" class="btn btn-info btn-sm" type="button" title="Download rendering in PNG format." v-on:click="actions.exportPNG($event)">⬇ PNG</button>
      <button id="shareLinkBtn" class="btn btn-shareLink btn-sm" type="button" title="Copy shareable link to clipboard" v-on:click="actions.shareLink($event)">{{ state.shareCopied ? '✓ Copied!' : '🔗 Share' }}</button>
      <button id="openVarriBtn" class="btn btn-openVarri btn-sm" type="button" title="Show this in a new vaRRI browser window" v-on:click="actions.openFullPage($event)" v-show="state.showFullPage">Full Page</button>
      <span class="cite-note">Please
      <a href="citation.html" class="btn btn-cite btn-sm">🤍 Cite vaRRI</a></span>
    </div>
  </section>`);
