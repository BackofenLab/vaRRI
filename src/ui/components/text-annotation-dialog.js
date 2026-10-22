import { viewerComponent } from './context.js';

export default viewerComponent('text-annotation-dialog', `<dialog id="textAnnotationDialog" class="app-dialog" aria-labelledby="textAnnotationDialogTitle" @close="actions.closeDialog('textAnnotationDialog')"
  :style="state.dialog.id === 'textAnnotationDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" class="text-annotation-form" @submit="actions.submitDialog('textAnnotationDialog',$event)">
    <div id="textAnnotationDialogTitle" class="dialog-header" @pointerdown="actions.dragDialog($event)">{{ state.dialog.id === 'textAnnotationDialog' ? state.dialog.title : 'Text Annotation ...' }}</div>
    <div class="dialog-body">
        <label for="textAnnotationText">Text</label>
        <div class="input-wrap" :class="{'has-error':state.errors.textAnnotationText}">
          <input id="textAnnotationText" type="text" autocomplete="off" placeholder="e.g. Binding site"
            :value="state.fields.textAnnotationText" @input="actions.inputField('textAnnotationText',$event)"
            @change="actions.commitField('textAnnotationText',$event)" :aria-invalid="!!state.errors.textAnnotationText"
            aria-describedby="textAnnotationTextError">
          <span id="textAnnotationTextError" class="field-tooltip">{{ state.errors.textAnnotationText || '' }}</span>
        </div>
        <div class="text-annotation-format">
          <label class="text-annotation-toggle"><input id="textAnnotationBold" type="checkbox" :checked="state.fields.textAnnotationBold"
            @change="actions.commitField('textAnnotationBold',$event)"><strong>Bold</strong></label>
          <label class="text-annotation-toggle"><input id="textAnnotationItalic" type="checkbox" :checked="state.fields.textAnnotationItalic"
            @change="actions.commitField('textAnnotationItalic',$event)"><em>Italic</em></label>
          <div><label for="textAnnotationSize">Size</label>
            <div class="input-wrap" :class="{'has-error':state.errors.textAnnotationSize}">
              <input id="textAnnotationSize" type="number" min="1" step="any" :value="state.fields.textAnnotationSize"
                @input="actions.inputField('textAnnotationSize',$event)" @change="actions.commitField('textAnnotationSize',$event)"
                :aria-invalid="!!state.errors.textAnnotationSize" aria-describedby="textAnnotationSizeError">
              <span id="textAnnotationSizeError" class="field-tooltip">{{ state.errors.textAnnotationSize || '' }}</span>
            </div>
          </div>
          <div><label for="textAnnotationColor">Color</label>
            <input id="textAnnotationColor" type="color" :value="state.fields.textAnnotationColor"
              @input="actions.inputField('textAnnotationColor',$event)" @change="actions.commitField('textAnnotationColor',$event)">
          </div>
        </div>
    </div>
    <div class="dialog-actions">
      <button value="ok" class="btn btn-primary">OK</button>
      <button value="cancel" class="btn btn-secondary" formnovalidate>Cancel</button>
      <button id="textAnnotationClearBtn" class="btn btn-secondary" type="button" @click="actions.clearTextAnnotationInputs()">Clear inputs</button>
    </div>
  </form>
</dialog>`);
