import { viewerComponent } from './context.js';

export default viewerComponent('number-dialog', `<dialog id="numberDialog" class="app-dialog" v-on:close="actions.closeDialog('numberDialog')" v-bind:style="state.dialog.id === 'numberDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" v-on:submit="actions.submitDialog('numberDialog', $event)">
    <div class="dialog-header" v-on:pointerdown="actions.dragDialog($event)">{{ state.dialog.id === 'numberDialog' ? state.dialog.title : 'Change to' }}</div>
    <div class="dialog-body">
      <input type="number" step="any" placeholder="0" v-bind:value="state.dialog.value" v-on:input="state.dialog.value = $event.target.value">
    </div>
    <div class="dialog-actions">
      <button value="ok" class="btn btn-primary">OK</button>
      <button value="cancel" class="btn btn-secondary">Cancel</button>
    </div>
  </form>
</dialog>`);
