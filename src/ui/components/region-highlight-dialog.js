import { viewerComponent } from './context.js';

export default viewerComponent('region-highlight-dialog', `<dialog id="regionHighlightDialog" class="app-dialog" v-on:close="actions.closeDialog('regionHighlightDialog')" v-bind:style="state.dialog.id === 'regionHighlightDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" v-on:submit="actions.submitDialog('regionHighlightDialog', $event)">
    <div class="dialog-header" v-on:pointerdown="actions.dragDialog($event)">{{ state.dialog.id === 'regionHighlightDialog' ? state.dialog.title : 'Change to' }}</div>
    <div class="dialog-body">         
      <div class="regionInput">
        <div>
          <label for="region1">Region 1</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.region1}">
            <input type="text" id="region1" placeholder="e.g. 2-4" v-bind:value="state.fields.region1" v-on:input="actions.inputField('region1', $event)" v-on:change="actions.commitField('region1', $event)" v-on:keydown.enter.prevent="actions.commitField('region1', $event)">
            <span class="field-tooltip">{{ state.errors.region1 || '' }}</span>
          </div>
        </div>
        <div>
          <label for="region2">Region 2</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.region2}">
            <input type="text" id="region2" placeholder="e.g. 5-7" v-bind:value="state.fields.region2" v-on:input="actions.inputField('region2', $event)" v-on:change="actions.commitField('region2', $event)" v-on:keydown.enter.prevent="actions.commitField('region2', $event)">
            <span class="field-tooltip">{{ state.errors.region2 || '' }}</span>
          </div>
        </div>
        <div>
          <label for="regionColor">Color</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.regionColor}">
            <input type="color" id="regionColor" v-bind:value="state.fields.regionColor" v-on:input="actions.inputField('regionColor', $event)" v-on:change="actions.commitField('regionColor', $event)">
            <span class="field-tooltip">{{ state.errors.regionColor || '' }}</span>
          </div>
        </div>
        <div>
          <label for="regionAlpha" title="Opacity of the highlight (0.0 = fully transparent, 1.0 = fully opaque)">&nbsp;&nbsp;&nbsp;&nbsp;◐</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.regionAlpha}">
            <select id="regionAlpha" v-bind:value="state.fields.regionAlpha" v-on:input="actions.inputField('regionAlpha', $event)" v-on:change="actions.commitField('regionAlpha', $event)">
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
            <span class="field-tooltip">{{ state.errors.regionAlpha || '' }}</span>
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
