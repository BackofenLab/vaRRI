import { viewerComponent } from './context.js';

export default viewerComponent('mutation-dialog', `<dialog id="mutationDialog" class="app-dialog" v-on:close="actions.closeDialog('mutationDialog')" v-bind:style="state.dialog.id === 'mutationDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" v-on:submit="actions.submitDialog('mutationDialog', $event)">
    <div class="dialog-header" v-on:pointerdown="actions.dragDialog($event)">{{ state.dialog.id === 'mutationDialog' ? state.dialog.title : 'Change to' }}</div>
    <div class="dialog-body">  
      <div class="mutationInput">
        <div>
          <label for="mutationSequence">Seq.</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.mutationSequence}">
            <select id="mutationSequence" v-bind:value="state.fields.mutationSequence" v-on:input="actions.inputField('mutationSequence', $event)" v-on:change="actions.commitField('mutationSequence', $event)">
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
            <span class="field-tooltip">{{ state.errors.mutationSequence || '' }}</span>
          </div>
        </div>
        <div>
          <label for="mutationPosition">Position</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.mutationPosition}">
            <input type="text" id="mutationPosition" inputmode="text" autocomplete="off" spellcheck="false" placeholder="e.g. -2" v-bind:value="state.fields.mutationPosition" v-on:input="actions.inputField('mutationPosition', $event)" v-on:change="actions.commitField('mutationPosition', $event)" v-on:keydown.enter.prevent="actions.commitField('mutationPosition', $event)">
            <span class="field-tooltip">{{ state.errors.mutationPosition || '' }}</span>
          </div>
        </div>
        <div>
          <label for="mutationBase">To</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.mutationBase}">
            <input type="text" id="mutationBase" maxlength="1" inputmode="text" autocomplete="off" spellcheck="false" placeholder="A" v-bind:value="state.fields.mutationBase" v-on:input="actions.inputField('mutationBase', $event)" v-on:change="actions.commitField('mutationBase', $event)" v-on:keydown.enter.prevent="actions.commitField('mutationBase', $event)">
            <span class="field-tooltip">{{ state.errors.mutationBase || '' }}</span>
          </div>
        </div>
        <div>
          <label for="mutationColor">Color</label>
          <div class="input-wrap" v-bind:class="{'has-error': state.errors.mutationColor}">
            <input type="color" id="mutationColor" v-bind:value="state.fields.mutationColor" v-on:input="actions.inputField('mutationColor', $event)" v-on:change="actions.commitField('mutationColor', $event)">
            <span class="field-tooltip">{{ state.errors.mutationColor || '' }}</span>
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
