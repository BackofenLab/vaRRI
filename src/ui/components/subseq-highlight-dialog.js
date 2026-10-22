import { viewerComponent } from './context.js';

export default viewerComponent('subseq-highlight-dialog', `<dialog id="subseqHighlightDialog" class="app-dialog" v-on:close="actions.closeDialog('subseqHighlightDialog')" v-bind:style="state.dialog.id === 'subseqHighlightDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" v-on:submit="actions.submitDialog('subseqHighlightDialog', $event)">
    <div class="dialog-header" v-on:pointerdown="actions.dragDialog($event)">{{ state.dialog.id === 'subseqHighlightDialog' ? state.dialog.title : 'Change to' }}</div>
    <div class="dialog-body">
      <div class="highlightInput">
        <div>
          <label for="subseqSequence">Seq.</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.subseqSequence}">
            <select id="subseqSequence" v-bind:value="state.fields.subseqSequence" v-on:input="actions.inputField('subseqSequence', $event)" v-on:change="actions.commitField('subseqSequence', $event)">
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
            <span class="field-tooltip">{{ state.errors.subseqSequence || '' }}</span>
          </div>
        </div>
        <div>
          <label for="subseqRange">Range</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.subseqRange}">
            <input type="text" id="subseqRange" placeholder="e.g. 3-8" v-bind:value="state.fields.subseqRange" v-on:input="actions.inputField('subseqRange', $event)" v-on:change="actions.commitField('subseqRange', $event)" v-on:keydown.enter.prevent="actions.commitField('subseqRange', $event)">
            <span class="field-tooltip">{{ state.errors.subseqRange || '' }}</span>
          </div>
        </div>
        <div>
          <label for="subseqColor">Color</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.subseqColor}">
            <input type="color" id="subseqColor" v-bind:value="state.fields.subseqColor" v-on:input="actions.inputField('subseqColor', $event)" v-on:change="actions.commitField('subseqColor', $event)">
            <span class="field-tooltip">{{ state.errors.subseqColor || '' }}</span>
          </div>
        </div>
        <div>
          <label for="subseqAlpha" title="Opacity of the highlight (0.0 = fully transparent, 1.0 = fully opaque)">&nbsp;&nbsp;&nbsp;&nbsp;◐</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.subseqAlpha}">
            <select id="subseqAlpha" v-bind:value="state.fields.subseqAlpha" v-on:input="actions.inputField('subseqAlpha', $event)" v-on:change="actions.commitField('subseqAlpha', $event)">
              <option value="0.1">0.1</option>
              <option value="0.2">0.2</option>
              <option value="0.3">0.3</option>
              <option value="0.4">0.4</option>
              <option value="0.5">0.5</option>
              <option value="0.6">0.6</option>
              <option value="0.7">0.7</option>
              <option value="0.8">0.8</option>
              <option value="0.9">0.9</option>
              <option value="1.0">1.0</option>
            </select>
            <span class="field-tooltip">{{ state.errors.subseqAlpha || '' }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="dialog-actions">
      <button value="ok" class="btn btn-primary">OK</button>
      <button value="cancel" class="btn btn-secondary">Cancel</button>
    </div>
  </form>
</dialog>`);
