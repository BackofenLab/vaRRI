import { viewerComponent } from './context.js';

export default viewerComponent('text-dialog', `<dialog id="textDialog" class="app-dialog" v-on:close="actions.closeDialog('textDialog')" v-bind:style="state.dialog.id === 'textDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" v-on:submit="actions.submitDialog('textDialog', $event)">
    <div class="dialog-header" v-on:pointerdown="actions.dragDialog($event)">{{ state.dialog.id === 'textDialog' ? state.dialog.title : 'Change to' }}</div>
    <div class="dialog-body">
      <input type="text" v-bind:value="state.dialog.value" v-on:input="state.dialog.value = $event.target.value">
    </div>
    <div class="dialog-actions">
      <button value="ok" class="btn btn-primary">OK</button>
      <button value="cancel" class="btn btn-secondary">Cancel</button>
    </div>
  </form>
</dialog>`);
